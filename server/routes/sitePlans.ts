import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import { db, UPLOADS_DIR } from '../db.ts';

export const sitePlansRouter = Router();

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.tif',
  '.tiff',
  '.dwg',
  '.dxf',
]);

const ALLOWED_PLAN_TYPES = new Set([
  'construction_site_plan',
  'boundary_survey',
  'floodplain_elevation',
  'fence_sketch',
  'grading_drainage',
]);

function inferMimeType(ext: string, providedMime: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.dwg': 'application/acad',
    '.dxf': 'application/dxf',
  };
  if (map[ext]) return map[ext];
  return providedMime || 'application/octet-stream';
}

function sanitizeFilename(raw: string): string {
  const base = path.basename(raw || 'site-plan.pdf').replace(/[^\w.\-() ]+/g, '_').trim();
  return base || 'site-plan.pdf';
}

const PUBLIC_COLUMNS = `
  id, project_id, plan_type, title, original_filename,
  mime_type, file_size, revision_label, notes, uploaded_by, created_at
`;

// List site plans for a project
sitePlansRouter.get('/projects/:projectId/site-plans', (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    res.status(404).json({ error: 'Permit project not found.' });
    return;
  }

  const sitePlans = db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM site_plans WHERE project_id = ? ORDER BY id DESC`
    )
    .all(projectId);

  res.json({ sitePlans });
});

// Upload a new construction site plan (raw binary up to 25 MB)
sitePlansRouter.post(
  '/projects/:projectId/site-plans',
  express.raw({ type: '*/*', limit: '25mb' }),
  (req, res) => {
    const projectId = Number(req.params.projectId);
    const project = db
      .prepare('SELECT id, permit_number, property_address, applicant_name FROM projects WHERE id = ?')
      .get(projectId) as
      | { id: number; permit_number: string; property_address: string; applicant_name: string }
      | undefined;

    if (!project) {
      res.status(404).json({ error: 'Permit project not found.' });
      return;
    }

    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.byteLength === 0) {
      res.status(400).json({ error: 'Uploaded site plan file is empty.' });
      return;
    }

    const rawFilename = String(req.query.filename || 'site-plan.pdf');
    const cleanFilename = sanitizeFilename(rawFilename);
    const ext = path.extname(cleanFilename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({
        error:
          'Unsupported file format. Upload a PDF, PNG, JPG, WEBP, SVG, TIFF, DWG, or DXF site plan.',
      });
      return;
    }

    const providedMime = String(req.query.mime_type || req.headers['content-type'] || '');
    const mimeType = inferMimeType(ext, providedMime);

    const rawPlanType = String(req.query.plan_type || 'construction_site_plan');
    const planType = ALLOWED_PLAN_TYPES.has(rawPlanType)
      ? rawPlanType
      : 'construction_site_plan';

    const defaultTitle =
      cleanFilename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
      `${project.property_address} — Construction Site Plan`;
    const title = String(req.query.title || '').trim() || defaultTitle;
    const revisionLabel = String(req.query.revision_label || '').trim() || 'Rev 1';
    const notes = String(req.query.notes || '').trim();
    const uploadedBy =
      String(req.query.uploaded_by || '').trim() || project.applicant_name || 'Permit Submittal';

    const storedFilename = `${projectId}-${Date.now()}-${crypto.randomUUID()}${ext}`;
    const destPath = path.join(UPLOADS_DIR, storedFilename);

    fs.writeFileSync(destPath, buf);

    const insertRes = db
      .prepare(
        `INSERT INTO site_plans (
          project_id, plan_type, title, original_filename, stored_filename,
          mime_type, file_size, revision_label, notes, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        projectId,
        planType,
        title,
        cleanFilename,
        storedFilename,
        mimeType,
        buf.byteLength,
        revisionLabel,
        notes,
        uploadedBy
      );

    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);

    const sitePlan = db
      .prepare(`SELECT ${PUBLIC_COLUMNS} FROM site_plans WHERE id = ?`)
      .get(Number(insertRes.lastInsertRowid));

    res.status(201).json({ sitePlan });
  }
);

// Stream or download an uploaded site plan file
sitePlansRouter.get('/site-plans/:id/file', (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      'SELECT id, original_filename, stored_filename, mime_type FROM site_plans WHERE id = ?'
    )
    .get(id) as
    | {
        id: number;
        original_filename: string;
        stored_filename: string;
        mime_type: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Site plan file not found.' });
    return;
  }

  const safeStored = path.basename(row.stored_filename);
  const filePath = path.join(UPLOADS_DIR, safeStored);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Stored site plan file is missing on disk.' });
    return;
  }

  const isDownload = req.query.download === '1' || req.query.download === 'true';
  const safeOriginal = sanitizeFilename(row.original_filename);

  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${isDownload ? 'attachment' : 'inline'}; filename="${safeOriginal}"`
  );
  // Prevent script execution if an SVG drawing is opened directly
  if (row.mime_type === 'image/svg+xml') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'"
    );
  }

  res.sendFile(filePath);
});

// Update site plan metadata (title, plan_type, revision_label, notes)
sitePlansRouter.patch('/site-plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT * FROM site_plans WHERE id = ?')
    .get(id) as
    | {
        id: number;
        project_id: number;
        plan_type: string;
        title: string;
        revision_label: string;
        notes: string;
      }
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Site plan not found.' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const nextTitle =
    typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title;
  const nextPlanType =
    typeof body.plan_type === 'string' && ALLOWED_PLAN_TYPES.has(body.plan_type)
      ? body.plan_type
      : existing.plan_type;
  const nextRev =
    typeof body.revision_label === 'string' && body.revision_label.trim()
      ? body.revision_label.trim()
      : existing.revision_label;
  const nextNotes = typeof body.notes === 'string' ? body.notes.trim() : existing.notes;

  db.prepare(
    'UPDATE site_plans SET title = ?, plan_type = ?, revision_label = ?, notes = ? WHERE id = ?'
  ).run(nextTitle, nextPlanType, nextRev, nextNotes, id);

  const sitePlan = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM site_plans WHERE id = ?`).get(id);
  res.json({ sitePlan });
});

// Delete a site plan and unlink its file on disk
sitePlansRouter.delete('/site-plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT id, project_id, stored_filename FROM site_plans WHERE id = ?')
    .get(id) as { id: number; project_id: number; stored_filename: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Site plan not found.' });
    return;
  }

  db.prepare('DELETE FROM site_plans WHERE id = ?').run(id);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(
    existing.project_id
  );

  const filePath = path.join(UPLOADS_DIR, path.basename(existing.stored_filename));
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore unlink race
  }

  res.json({ ok: true, deletedId: id });
});

export function seedSampleSitePlanIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM site_plans').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const firstProject = db
    .prepare('SELECT id, permit_number, property_address, applicant_name FROM projects ORDER BY id ASC LIMIT 1')
    .get() as
    | { id: number; permit_number: string; property_address: string; applicant_name: string }
    | undefined;
  if (!firstProject) return;

  const storedFilename = `seed-${firstProject.id}-construction-site-plan.svg`;
  const destPath = path.join(UPLOADS_DIR, storedFilename);

  const svgBlueprint = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#f8fafc"/>
  <rect x="20" y="20" width="860" height="580" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <rect x="26" y="26" width="848" height="568" fill="none" stroke="#334155" stroke-width="0.8"/>

  <!-- Street R.O.W. along bottom -->
  <rect x="26" y="490" width="848" height="44" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
  <text x="450" y="517" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155" text-anchor="middle" letter-spacing="2">PUBLIC STREET RIGHT-OF-WAY (50' R.O.W.) — CURB &amp; SIDEWALK</text>

  <!-- Parcel Lot Boundary -->
  <rect x="170" y="60" width="440" height="410" fill="#f1f5f9" stroke="#004880" stroke-width="2.5"/>
  <text x="390" y="52" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#004880" text-anchor="middle">REAR LOT LINE — 84.0' (NORTH)</text>
  <text x="390" y="484" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#004880" text-anchor="middle">FRONT PROPERTY LINE — 84.0'</text>

  <!-- Required Setback Envelope (Dashed) -->
  <rect x="212" y="155" width="356" height="235" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="7,5"/>
  <text x="390" y="172" font-family="Arial, sans-serif" font-size="10" fill="#1d4ed8" text-anchor="middle">BUILDABLE ENVELOPE (R-1 TABLE 1: 25' FRONT / 8' SIDE / 30' REAR)</text>

  <!-- Existing / Proposed Dwelling Footprint -->
  <rect x="250" y="210" width="230" height="155" fill="#dbeafe" stroke="#0f172a" stroke-width="2"/>
  <text x="365" y="282" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">SINGLE-FAMILY DWELLING</text>
  <text x="365" y="300" font-family="Arial, sans-serif" font-size="11" fill="#334155" text-anchor="middle">44' x 32' (FFE 926.5' NAVD88)</text>

  <!-- Proposed Detached Garage / Accessory -->
  <rect x="492" y="95" width="92" height="92" fill="#fef3c7" stroke="#b45309" stroke-width="1.8"/>
  <text x="538" y="138" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#92400e" text-anchor="middle">PROPOSED</text>
  <text x="538" y="152" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#92400e" text-anchor="middle">20'x20' GARAGE</text>
  <text x="538" y="166" font-family="Arial, sans-serif" font-size="9" fill="#78350f" text-anchor="middle">Ht: 15.5' (&lt;=18')</text>

  <!-- Proposed Rear/Side Fence Line -->
  <polyline points="250,230 186,230 186,76 594,76 594,230 480,230" fill="none" stroke="#860F1F" stroke-width="3" stroke-dasharray="9,4"/>
  <text x="390" y="72" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#860F1F" text-anchor="middle">PROPOSED 6'-0" CEDAR PRIVACY FENCE (3.0' INSIDE LOT LINE — IMC § 152.02)</text>

  <!--Concrete Driveway -->
  <rect x="502" y="187" width="72" height="303" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2"/>
  <text x="538" y="425" font-family="Arial, sans-serif" font-size="10" fill="#475569" text-anchor="middle" transform="rotate(-90 538 425)">14' CONCRETE DRIVEWAY</text>

  <!-- Dimension Callouts -->
  <line x1="365" y1="365" x2="365" y2="470" stroke="#0f172a" stroke-width="1.2"/>
  <text x="373" y="422" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0f172a">28.0' FRONT SETBACK</text>

  <line x1="170" y1="290" x2="250" y2="290" stroke="#0f172a" stroke-width="1.2"/>
  <text x="210" y="283" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">15.0' W. SIDE</text>

  <!-- North Arrow & Title Block on Right -->
  <rect x="640" y="60" width="215" height="410" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="748" cy="115" r="26" fill="none" stroke="#004880" stroke-width="1.8"/>
  <polygon points="748,84 740,122 748,114 756,122" fill="#004880"/>
  <text x="748" y="156" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#004880" text-anchor="middle">NORTH (SCALE: 1" = 20')</text>

  <line x1="640" y1="175" x2="855" y2="175" stroke="#cbd5e1" stroke-width="1"/>
  <text x="654" y="200" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#004880">CONSTRUCTION SITE PLAN</text>
  <text x="654" y="220" font-family="Arial, sans-serif" font-size="10" fill="#334155">City of Independence, IA (50644)</text>
  <text x="654" y="242" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#0f172a">Permit: ${firstProject.permit_number}</text>
  <text x="654" y="260" font-family="Arial, sans-serif" font-size="10" fill="#334155">${firstProject.property_address}</text>
  <text x="654" y="278" font-family="Arial, sans-serif" font-size="10" fill="#334155">Applicant: ${firstProject.applicant_name}</text>

  <line x1="640" y1="296" x2="855" y2="296" stroke="#cbd5e1" stroke-width="1"/>
  <text x="654" y="318" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#0f172a">SUBMITTAL NOTES:</text>
  <text x="654" y="336" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">1. Iowa One Call (811) Locate</text>
  <text x="654" y="351" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">   completed prior to excavation.</text>
  <text x="654" y="370" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">2. Property pins verified at</text>
  <text x="654" y="385" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">   NW, NE, SW &amp; SE corners.</text>
  <text x="654" y="404" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">3. Roof drainage directed away</text>
  <text x="654" y="419" font-family="Arial, sans-serif" font-size="9.5" fill="#475569">   from adjoining properties.</text>

  <rect x="26" y="544" width="848" height="50" fill="#004880"/>
  <text x="44" y="574" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">INDEPENDENCE PLANNING &amp; ZONING — APPLICANT SITE PLAN EXHIBIT (SHEET C-101)</text>
  <text x="854" y="574" font-family="Arial, sans-serif" font-size="11" fill="#bae6fd" text-anchor="end">REV 1 — INITIAL SUBMITTAL</text>
</svg>`;

  const buf = Buffer.from(svgBlueprint, 'utf8');
  fs.writeFileSync(destPath, buf);

  db.prepare(
    `INSERT INTO site_plans (
      project_id, plan_type, title, original_filename, stored_filename,
      mime_type, file_size, revision_label, notes, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    firstProject.id,
    'construction_site_plan',
    `${firstProject.property_address} — Construction Site Plan (Sheet C-101)`,
    'Sheet-C101-Construction-Site-Plan.svg',
    storedFilename,
    'image/svg+xml',
    buf.byteLength,
    'Rev 1',
    'Dimensioned parcel site plan showing dwelling setbacks, proposed accessory garage, driveway, and 6-ft cedar fence alignment.',
    firstProject.applicant_name
  );
}
