import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { db, rowToProject, UPLOADS_DIR } from '../db.ts';
import { evaluateProjectCompliance } from '../ordinanceEngine.ts';
import { syncProjectChecklist } from '../checklistSync.ts';
import type { Project, ProjectMeasurements } from '../../src/types.ts';

export const projectsRouter = Router();

function getDefaultStaffUserId(): number {
  const row = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as
    | { id: number }
    | undefined;
  return row?.id ?? 1;
}

function nextPermitNumber(): string {
  const rows = db.prepare('SELECT permit_number FROM projects').all() as Array<{
    permit_number: string;
  }>;
  let maxSeq = 100;
  for (const r of rows) {
    const match = r.permit_number.match(/PRJ-\d{4}-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }
  return `PRJ-2026-${String(maxSeq + 1).padStart(4, '0')}`;
}

function getFullProjectPayload(projectId: number) {
  const raw = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'pass') as checklist_passed,
        (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'fail') as checklist_failed,
        (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'pending') as checklist_pending,
        (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'variance') as checklist_variance,
        (SELECT COUNT(*) FROM site_plans s WHERE s.project_id = p.id) as site_plan_count
       FROM projects p WHERE p.id = ?`
    )
    .get(projectId) as Record<string, unknown> | undefined;

  if (!raw) return null;

  const project = rowToProject(raw) as unknown as Project;
  const checklist = db
    .prepare('SELECT * FROM checklist_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC')
    .all(projectId);
  const notes = db
    .prepare('SELECT * FROM inspection_notes WHERE project_id = ? ORDER BY id DESC')
    .all(projectId);
  const sitePlans = db
    .prepare(
      `SELECT id, project_id, plan_type, title, original_filename,
              mime_type, file_size, revision_label, notes, uploaded_by, created_at
       FROM site_plans WHERE project_id = ? ORDER BY id DESC`
    )
    .all(projectId);
  const evaluation = evaluateProjectCompliance(project);

  return { project, checklist, notes, sitePlans, evaluation };
}

projectsRouter.get('/', (req, res) => {
  const { search, status, district, flood_zone } = req.query;

  let sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status != 'na') as checklist_total,
      (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'pass') as checklist_passed,
      (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'fail') as checklist_failed,
      (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'pending') as checklist_pending,
      (SELECT COUNT(*) FROM checklist_items c WHERE c.project_id = p.id AND c.status = 'variance') as checklist_variance,
      (SELECT COUNT(*) FROM site_plans s WHERE s.project_id = p.id) as site_plan_count
    FROM projects p
    WHERE 1=1
  `;
  const params: Array<string | number> = [];

  if (status && status !== 'all') {
    sql += ' AND p.status = ?';
    params.push(String(status));
  }
  if (district && district !== 'all') {
    sql += ' AND p.zoning_district = ?';
    params.push(String(district));
  }
  if (flood_zone && flood_zone !== 'all') {
    if (flood_zone === 'SFHA') {
      sql += " AND p.flood_zone IN ('A', 'AE', 'FLOODWAY')";
    } else {
      sql += ' AND p.flood_zone = ?';
      params.push(String(flood_zone));
    }
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    sql +=
      ' AND (p.title LIKE ? OR p.property_address LIKE ? OR p.permit_number LIKE ? OR p.applicant_name LIKE ? OR p.parcel_pin LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY p.updated_at DESC, p.id DESC';

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  const projects = rows.map((r) => rowToProject(r));
  res.json({ projects });
});

projectsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const payload = getFullProjectPayload(id);
  if (!payload) {
    res.status(404).json({ error: 'Permit review project not found.' });
    return;
  }
  res.json(payload);
});

function sanitizeMeasurements(body: Record<string, unknown>): ProjectMeasurements {
  const num = (v: unknown, fallback: number): number => {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const bool = (v: unknown, fallback: boolean): boolean =>
    v === undefined ? fallback : Boolean(v);

  return {
    zoning_district: (body.zoning_district as ProjectMeasurements['zoning_district']) || 'R-1',
    land_use: (body.land_use as ProjectMeasurements['land_use']) || 'single_family',
    public_water_sewer: bool(body.public_water_sewer, true),
    is_corner_lot: bool(body.is_corner_lot, false),
    adjoins_r_district: bool(body.adjoins_r_district, true),
    lot_area_sqft: num(body.lot_area_sqft, 10000),
    lot_width_ft: num(body.lot_width_ft, 80),
    lot_depth_ft: num(body.lot_depth_ft, 125),
    proposed_height_ft: num(body.proposed_height_ft, 24),
    proposed_stories: Math.max(1, Math.round(num(body.proposed_stories, 2))),
    front_setback_ft: num(body.front_setback_ft, 25),
    side_setback_ft: num(body.side_setback_ft, 8),
    corner_side_setback_ft: num(body.corner_side_setback_ft, 25),
    rear_setback_ft: num(body.rear_setback_ft, 30),
    has_accessory_structure: bool(body.has_accessory_structure, false),
    accessory_height_ft: num(body.accessory_height_ft, 14),
    accessory_side_rear_setback_ft: num(body.accessory_side_rear_setback_ft, 5),
    rear_yard_coverage_pct: num(body.rear_yard_coverage_pct, 18),

    flood_zone: (body.flood_zone as ProjectMeasurements['flood_zone']) || 'X',
    bfe_ft: num(body.bfe_ft, 922.0),
    lowest_floor_elev_ft: num(body.lowest_floor_elev_ft, 925.0),
    machinery_elev_ft: num(body.machinery_elev_ft, 925.5),
    has_basement: bool(body.has_basement, false),
    has_sub_bfe_enclosure: bool(body.has_sub_bfe_enclosure, false),
    enclosure_vented_unfinished: bool(body.enclosure_vented_unfinished, true),
    substantial_improvement_pct: num(body.substantial_improvement_pct, 100),
    floodway_no_rise_cert: bool(body.floodway_no_rise_cert, false),
    is_fema_buyout_lot: bool(body.is_fema_buyout_lot, false),
    has_floodplain_permit: bool(body.has_floodplain_permit, false),

    includes_fence: bool(body.includes_fence, false),
    fence_yard_location:
      (body.fence_yard_location as ProjectMeasurements['fence_yard_location']) || 'rear_side',
    fence_front_height_ft: num(body.fence_front_height_ft, 3.5),
    fence_side_rear_height_ft: num(body.fence_side_rear_height_ft, 6.0),
    fence_corner_triangle_height_ft: num(body.fence_corner_triangle_height_ft, 0),
    fence_property_line_setback_ft: num(body.fence_property_line_setback_ft, 3.0),
    has_neighbor_fence_agreement: bool(body.has_neighbor_fence_agreement, false),
    fence_material: (body.fence_material as ProjectMeasurements['fence_material']) || 'wood',
    has_barbed_wire: bool(body.has_barbed_wire, false),
    barbed_wire_height_ft: num(body.barbed_wire_height_ft, 0),
    has_fence_permit_app: bool(body.has_fence_permit_app, false),
    iowa_one_call_811: String(body.iowa_one_call_811 ?? '').trim(),
  };
}

projectsRouter.post('/', (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>;

  const title = String(body.title || '').trim();
  const property_address = String(body.property_address || '').trim();
  const applicant_name = String(body.applicant_name || '').trim();

  if (!title || !property_address || !applicant_name) {
    res
      .status(400)
      .json({ error: 'Project title, property address, and applicant name are required.' });
    return;
  }

  const m = sanitizeMeasurements(body);
  const permit_number = nextPermitNumber();
  const status = String(body.status || 'in_review');
  const assigned_to = String(body.assigned_to || 'Planning & Zoning Staff').trim();
  const creatorId = getDefaultStaffUserId();

  const result = db
    .prepare(
      `INSERT INTO projects (
        permit_number, title, property_address, parcel_pin, ward,
        applicant_name, applicant_email, applicant_phone, description, status,
        assigned_to, created_by,
        zoning_district, land_use, public_water_sewer, is_corner_lot, adjoins_r_district,
        lot_area_sqft, lot_width_ft, lot_depth_ft, proposed_height_ft, proposed_stories,
        front_setback_ft, side_setback_ft, corner_side_setback_ft, rear_setback_ft,
        has_accessory_structure, accessory_height_ft, accessory_side_rear_setback_ft, rear_yard_coverage_pct,
        flood_zone, bfe_ft, lowest_floor_elev_ft, machinery_elev_ft,
        has_basement, has_sub_bfe_enclosure, enclosure_vented_unfinished,
        substantial_improvement_pct, floodway_no_rise_cert, is_fema_buyout_lot, has_floodplain_permit,
        includes_fence, fence_yard_location, fence_front_height_ft, fence_side_rear_height_ft,
        fence_corner_triangle_height_ft, fence_property_line_setback_ft, has_neighbor_fence_agreement,
        fence_material, has_barbed_wire, barbed_wire_height_ft, has_fence_permit_app, iowa_one_call_811
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?
      )`
    )
    .run(
      permit_number,
      title,
      property_address,
      String(body.parcel_pin || '').trim(),
      String(body.ward || 'Ward 1').trim(),
      applicant_name,
      String(body.applicant_email || '').trim(),
      String(body.applicant_phone || '').trim(),
      String(body.description || '').trim(),
      status,
      assigned_to,
      creatorId,
      m.zoning_district,
      m.land_use,
      m.public_water_sewer ? 1 : 0,
      m.is_corner_lot ? 1 : 0,
      m.adjoins_r_district ? 1 : 0,
      m.lot_area_sqft,
      m.lot_width_ft,
      m.lot_depth_ft,
      m.proposed_height_ft,
      m.proposed_stories,
      m.front_setback_ft,
      m.side_setback_ft,
      m.corner_side_setback_ft,
      m.rear_setback_ft,
      m.has_accessory_structure ? 1 : 0,
      m.accessory_height_ft,
      m.accessory_side_rear_setback_ft,
      m.rear_yard_coverage_pct,
      m.flood_zone,
      m.bfe_ft,
      m.lowest_floor_elev_ft,
      m.machinery_elev_ft,
      m.has_basement ? 1 : 0,
      m.has_sub_bfe_enclosure ? 1 : 0,
      m.enclosure_vented_unfinished ? 1 : 0,
      m.substantial_improvement_pct,
      m.floodway_no_rise_cert ? 1 : 0,
      m.is_fema_buyout_lot ? 1 : 0,
      m.has_floodplain_permit ? 1 : 0,
      m.includes_fence ? 1 : 0,
      m.fence_yard_location,
      m.fence_front_height_ft,
      m.fence_side_rear_height_ft,
      m.fence_corner_triangle_height_ft,
      m.fence_property_line_setback_ft,
      m.has_neighbor_fence_agreement ? 1 : 0,
      m.fence_material,
      m.has_barbed_wire ? 1 : 0,
      m.barbed_wire_height_ft,
      m.has_fence_permit_app ? 1 : 0,
      m.iowa_one_call_811
    );

  const projectId = Number(result.lastInsertRowid);
  syncProjectChecklist(projectId, m, assigned_to, false);

  db.prepare(
    `INSERT INTO inspection_notes (project_id, author_name, author_role, note_type, content)
     VALUES (?, ?, ?, 'general', ?)`
  ).run(
    projectId,
    assigned_to,
    'City of Independence — Planning & Zoning',
    `Created permit checklist ${permit_number} and ran initial automated comparison against Independence Zoning (Art. 1–5), Floodplain (IMC Ch. 167 / Art. 4), and Fence (IMC Ch. 152) ordinances.`
  );

  res.status(201).json(getFullProjectPayload(projectId));
});

projectsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Permit review project not found.' });
    return;
  }

  const merged = { ...rowToProject(existing), ...(req.body || {}) };
  const m = sanitizeMeasurements(merged);

  db.prepare(
    `UPDATE projects SET
      title = ?, property_address = ?, parcel_pin = ?, ward = ?,
      applicant_name = ?, applicant_email = ?, applicant_phone = ?, description = ?,
      status = ?, assigned_to = ?,
      zoning_district = ?, land_use = ?, public_water_sewer = ?, is_corner_lot = ?, adjoins_r_district = ?,
      lot_area_sqft = ?, lot_width_ft = ?, lot_depth_ft = ?, proposed_height_ft = ?, proposed_stories = ?,
      front_setback_ft = ?, side_setback_ft = ?, corner_side_setback_ft = ?, rear_setback_ft = ?,
      has_accessory_structure = ?, accessory_height_ft = ?, accessory_side_rear_setback_ft = ?, rear_yard_coverage_pct = ?,
      flood_zone = ?, bfe_ft = ?, lowest_floor_elev_ft = ?, machinery_elev_ft = ?,
      has_basement = ?, has_sub_bfe_enclosure = ?, enclosure_vented_unfinished = ?,
      substantial_improvement_pct = ?, floodway_no_rise_cert = ?, is_fema_buyout_lot = ?, has_floodplain_permit = ?,
      includes_fence = ?, fence_yard_location = ?, fence_front_height_ft = ?, fence_side_rear_height_ft = ?,
      fence_corner_triangle_height_ft = ?, fence_property_line_setback_ft = ?, has_neighbor_fence_agreement = ?,
      fence_material = ?, has_barbed_wire = ?, barbed_wire_height_ft = ?, has_fence_permit_app = ?, iowa_one_call_811 = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    String(merged.title || existing.title).trim(),
    String(merged.property_address || existing.property_address).trim(),
    String(merged.parcel_pin ?? existing.parcel_pin).trim(),
    String(merged.ward || existing.ward).trim(),
    String(merged.applicant_name || existing.applicant_name).trim(),
    String(merged.applicant_email ?? existing.applicant_email).trim(),
    String(merged.applicant_phone ?? existing.applicant_phone).trim(),
    String(merged.description ?? existing.description).trim(),
    String(merged.status || existing.status),
    String(merged.assigned_to || existing.assigned_to).trim(),
    m.zoning_district,
    m.land_use,
    m.public_water_sewer ? 1 : 0,
    m.is_corner_lot ? 1 : 0,
    m.adjoins_r_district ? 1 : 0,
    m.lot_area_sqft,
    m.lot_width_ft,
    m.lot_depth_ft,
    m.proposed_height_ft,
    m.proposed_stories,
    m.front_setback_ft,
    m.side_setback_ft,
    m.corner_side_setback_ft,
    m.rear_setback_ft,
    m.has_accessory_structure ? 1 : 0,
    m.accessory_height_ft,
    m.accessory_side_rear_setback_ft,
    m.rear_yard_coverage_pct,
    m.flood_zone,
    m.bfe_ft,
    m.lowest_floor_elev_ft,
    m.machinery_elev_ft,
    m.has_basement ? 1 : 0,
    m.has_sub_bfe_enclosure ? 1 : 0,
    m.enclosure_vented_unfinished ? 1 : 0,
    m.substantial_improvement_pct,
    m.floodway_no_rise_cert ? 1 : 0,
    m.is_fema_buyout_lot ? 1 : 0,
    m.has_floodplain_permit ? 1 : 0,
    m.includes_fence ? 1 : 0,
    m.fence_yard_location,
    m.fence_front_height_ft,
    m.fence_side_rear_height_ft,
    m.fence_corner_triangle_height_ft,
    m.fence_property_line_setback_ft,
    m.has_neighbor_fence_agreement ? 1 : 0,
    m.fence_material,
    m.has_barbed_wire ? 1 : 0,
    m.barbed_wire_height_ft,
    m.has_fence_permit_app ? 1 : 0,
    m.iowa_one_call_811,
    id
  );

  if (req.body?.auto_sync_checklist !== false) {
    const reviewerLabel = String(merged.assigned_to || existing.assigned_to || 'Planning & Zoning Staff').trim();
    syncProjectChecklist(id, m, reviewerLabel, true);
  }

  res.json(getFullProjectPayload(id));
});

projectsRouter.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const valid = new Set([
    'draft',
    'in_review',
    'corrections_required',
    'variance_needed',
    'approved',
    'denied',
  ]);
  if (!valid.has(status)) {
    res.status(400).json({ error: 'Invalid project status.' });
    return;
  }

  const result = db
    .prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.json(getFullProjectPayload(id));
});

projectsRouter.post('/:id/sync-checklist', (req, res) => {
  const id = Number(req.params.id);
  const raw = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!raw) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  const project = rowToProject(raw) as unknown as Project;
  syncProjectChecklist(
    id,
    project,
    project.assigned_to || 'Planning & Zoning Staff',
    Boolean(req.body?.preserve_manual ?? true)
  );
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(id);
  res.json(getFullProjectPayload(id));
});

projectsRouter.post('/:id/duplicate', (req, res) => {
  const id = Number(req.params.id);
  const raw = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!raw) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  const src = rowToProject(raw) as unknown as Project;
  const permit_number = nextPermitNumber();
  const creatorId = getDefaultStaffUserId();

  const result = db
    .prepare(
      `INSERT INTO projects (
        permit_number, title, property_address, parcel_pin, ward,
        applicant_name, applicant_email, applicant_phone, description, status,
        assigned_to, created_by,
        zoning_district, land_use, public_water_sewer, is_corner_lot, adjoins_r_district,
        lot_area_sqft, lot_width_ft, lot_depth_ft, proposed_height_ft, proposed_stories,
        front_setback_ft, side_setback_ft, corner_side_setback_ft, rear_setback_ft,
        has_accessory_structure, accessory_height_ft, accessory_side_rear_setback_ft, rear_yard_coverage_pct,
        flood_zone, bfe_ft, lowest_floor_elev_ft, machinery_elev_ft,
        has_basement, has_sub_bfe_enclosure, enclosure_vented_unfinished,
        substantial_improvement_pct, floodway_no_rise_cert, is_fema_buyout_lot, has_floodplain_permit,
        includes_fence, fence_yard_location, fence_front_height_ft, fence_side_rear_height_ft,
        fence_corner_triangle_height_ft, fence_property_line_setback_ft, has_neighbor_fence_agreement,
        fence_material, has_barbed_wire, barbed_wire_height_ft, has_fence_permit_app, iowa_one_call_811
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'draft',
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?
      )`
    )
    .run(
      permit_number,
      `${src.title} (Copy)`,
      src.property_address,
      src.parcel_pin,
      src.ward,
      src.applicant_name,
      src.applicant_email,
      src.applicant_phone,
      src.description,
      src.assigned_to || 'Planning & Zoning Staff',
      creatorId,
      src.zoning_district,
      src.land_use,
      src.public_water_sewer ? 1 : 0,
      src.is_corner_lot ? 1 : 0,
      src.adjoins_r_district ? 1 : 0,
      src.lot_area_sqft,
      src.lot_width_ft,
      src.lot_depth_ft,
      src.proposed_height_ft,
      src.proposed_stories,
      src.front_setback_ft,
      src.side_setback_ft,
      src.corner_side_setback_ft,
      src.rear_setback_ft,
      src.has_accessory_structure ? 1 : 0,
      src.accessory_height_ft,
      src.accessory_side_rear_setback_ft,
      src.rear_yard_coverage_pct,
      src.flood_zone,
      src.bfe_ft,
      src.lowest_floor_elev_ft,
      src.machinery_elev_ft,
      src.has_basement ? 1 : 0,
      src.has_sub_bfe_enclosure ? 1 : 0,
      src.enclosure_vented_unfinished ? 1 : 0,
      src.substantial_improvement_pct,
      src.floodway_no_rise_cert ? 1 : 0,
      src.is_fema_buyout_lot ? 1 : 0,
      src.has_floodplain_permit ? 1 : 0,
      src.includes_fence ? 1 : 0,
      src.fence_yard_location,
      src.fence_front_height_ft,
      src.fence_side_rear_height_ft,
      src.fence_corner_triangle_height_ft,
      src.fence_property_line_setback_ft,
      src.has_neighbor_fence_agreement ? 1 : 0,
      src.fence_material,
      src.has_barbed_wire ? 1 : 0,
      src.barbed_wire_height_ft,
      src.has_fence_permit_app ? 1 : 0,
      src.iowa_one_call_811
    );

  const newId = Number(result.lastInsertRowid);
  syncProjectChecklist(newId, src, src.assigned_to || 'Planning & Zoning Staff', false);
  res.status(201).json(getFullProjectPayload(newId));
});

projectsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const storedPlans = db
    .prepare('SELECT stored_filename FROM site_plans WHERE project_id = ?')
    .all(id) as Array<{ stored_filename: string }>;

  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  for (const sp of storedPlans) {
    try {
      const fp = path.join(UPLOADS_DIR, path.basename(sp.stored_filename));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch {
      // ignore unlink errors
    }
  }

  res.json({ ok: true, deletedId: id });
});
