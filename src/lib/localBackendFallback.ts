import { evaluateProjectCompliance } from '../../server/ordinanceEngine.ts';
import {
  SEED_NOTES,
  SEED_ORDINANCE_RULES,
  SEED_PROJECTS,
  SEED_SITE_PLANS,
  SEED_SITE_PLAN_SVG_DATA_URL,
} from '../shared/seedSnapshot.ts';
import type {
  ChecklistItem,
  ChecklistPriority,
  ChecklistStatus,
  InspectionNote,
  OrdinanceCategory,
  OrdinanceRule,
  Project,
  ProjectMeasurements,
  ProjectStatus,
  SitePlanDocument,
  SitePlanType,
  User,
  UserRole,
} from '../types.ts';

const STORE_KEY = 'indeecheck_local_db_v1';

interface StoredUser extends User {
  password: string;
}

interface LocalDatabase {
  users: StoredUser[];
  projects: Project[];
  checklistItems: ChecklistItem[];
  notes: InspectionNote[];
  ordinanceRules: OrdinanceRule[];
  sitePlans: SitePlanDocument[];
  sitePlanBlobs: Record<number, string>; // id -> data URL or blob URL
  nextIds: {
    user: number;
    project: number;
    checklist: number;
    note: number;
    rule: number;
    sitePlan: number;
  };
}

let memoryDb: LocalDatabase | null = null;

function buildChecklistForProject(
  projectId: number,
  m: ProjectMeasurements,
  verifiedBy: string,
  startId: number
): { items: ChecklistItem[]; nextId: number } {
  const evalSummary = evaluateProjectCompliance(m);
  let curId = startId;
  const now = new Date().toISOString();
  const items: ChecklistItem[] = evalSummary.checks.map((c, idx) => {
    let status: ChecklistStatus = 'pending';
    if (c.verdict === 'pass') status = 'pass';
    else if (c.verdict === 'fail') status = 'fail';
    else if (c.verdict === 'na') status = 'na';

    const noteParts: string[] = [c.explanation];
    if (c.remedy) noteParts.push(`Action: ${c.remedy}`);

    return {
      id: curId++,
      project_id: projectId,
      category: c.category,
      code_citation: c.code_citation,
      title: c.title,
      ordinance_requirement: c.ordinance_standard,
      proposed_value: `${c.proposed_display} (${c.delta_display})`,
      status,
      priority: c.priority,
      inspector_notes: noteParts.join(' '),
      verified_by: status === 'pass' || status === 'fail' ? verifiedBy : '',
      sort_order: (idx + 1) * 10,
      updated_at: now,
    };
  });
  return { items, nextId: curId };
}

function createInitialDb(): LocalDatabase {
  const seededUsers: StoredUser[] = [
    {
      id: 1,
      name: 'Matt Chesmore',
      email: 'zoning@independenceia.gov',
      password: 'Indee2026!',
      role: 'admin',
      title: 'Planning & Zoning Administrator',
      department: 'City Hall — Planning & Zoning (331 1st St E)',
      created_at: '2026-11-13T15:54:09Z',
    },
    {
      id: 2,
      name: 'Dana Weber',
      email: 'inspector@independenceia.gov',
      password: 'Indee2026!',
      role: 'inspector',
      title: 'Building & Code Enforcement Official',
      department: 'Building & Code Enforcement — (319) 334-4711',
      created_at: '2026-11-13T15:54:09Z',
    },
    {
      id: 3,
      name: 'Hannah Miller',
      email: 'hannah.miller@example.com',
      password: 'Indee2026!',
      role: 'applicant',
      title: 'Property Owner / Permit Applicant',
      department: 'Ward 2 Resident — Independence, IA 50644',
      created_at: '2026-11-13T15:54:09Z',
    },
  ];

  const projects: Project[] = SEED_PROJECTS.map((p) => ({ ...p }));
  let nextChecklistId = 1;
  const checklistItems: ChecklistItem[] = [];
  for (const p of projects) {
    const built = buildChecklistForProject(p.id, p, p.assigned_to, nextChecklistId);
    checklistItems.push(...built.items);
    nextChecklistId = built.nextId;
  }

  const sitePlans = SEED_SITE_PLANS.map((sp) => ({ ...sp }));
  const sitePlanBlobs: Record<number, string> = {};
  if (sitePlans[0]) {
    sitePlanBlobs[sitePlans[0].id] = SEED_SITE_PLAN_SVG_DATA_URL;
  }

  return {
    users: seededUsers,
    projects,
    checklistItems,
    notes: SEED_NOTES.map((n) => ({ ...n })),
    ordinanceRules: SEED_ORDINANCE_RULES.map((r) => ({ ...r })),
    sitePlans,
    sitePlanBlobs,
    nextIds: {
      user: 4,
      project: Math.max(0, ...projects.map((p) => p.id)) + 1,
      checklist: nextChecklistId,
      note: Math.max(0, ...SEED_NOTES.map((n) => n.id)) + 1,
      rule: Math.max(0, ...SEED_ORDINANCE_RULES.map((r) => r.id)) + 1,
      sitePlan: Math.max(0, ...sitePlans.map((s) => s.id)) + 1,
    },
  };
}

function loadDb(): LocalDatabase {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.projects)) {
        memoryDb = parsed;
        return memoryDb;
      }
    }
  } catch {
    // ignore storage read errors
  }
  memoryDb = createInitialDb();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(db: LocalDatabase): void {
  memoryDb = db;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    // If quota exceeded (e.g. large site plan data URL), save metadata while keeping blobs in memory
    try {
      const slim: LocalDatabase = { ...db, sitePlanBlobs: {} };
      localStorage.setItem(STORE_KEY, JSON.stringify(slim));
    } catch {
      // ignore storage errors
    }
  }
}

function publicUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

function makeLocalToken(userId: number): string {
  return `local-jwt-${userId}-${Date.now()}`;
}

function parseUserFromToken(db: LocalDatabase, token: string | null): StoredUser | null {
  if (!token) return null;
  if (token.startsWith('local-jwt-')) {
    const id = Number(token.split('-')[2]);
    return db.users.find((u) => u.id === id) || null;
  }
  // Also accept standard server JWT payload if switching seamlessly from server -> local
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
        sub?: number;
        email?: string;
      };
      if (payload.email) {
        const byEmail = db.users.find(
          (u) => u.email.toLowerCase() === payload.email!.toLowerCase()
        );
        if (byEmail) return byEmail;
      }
      if (payload.sub) {
        return db.users.find((u) => u.id === payload.sub) || null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function enrichProjectCounts(db: LocalDatabase, p: Project): Project {
  const items = db.checklistItems.filter((c) => c.project_id === p.id);
  const active = items.filter((c) => c.status !== 'na');
  const plans = db.sitePlans.filter((s) => s.project_id === p.id);
  return {
    ...p,
    checklist_total: active.length,
    checklist_passed: items.filter((c) => c.status === 'pass').length,
    checklist_failed: items.filter((c) => c.status === 'fail').length,
    checklist_pending: items.filter((c) => c.status === 'pending').length,
    checklist_variance: items.filter((c) => c.status === 'variance').length,
    site_plan_count: plans.length,
  };
}

function fullProjectPayload(db: LocalDatabase, projectId: number) {
  const raw = db.projects.find((p) => p.id === projectId);
  if (!raw) return null;
  const project = enrichProjectCounts(db, raw);
  const checklist = db.checklistItems
    .filter((c) => c.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const notes = db.notes
    .filter((n) => n.project_id === projectId)
    .sort((a, b) => b.id - a.id);
  const sitePlans = db.sitePlans
    .filter((s) => s.project_id === projectId)
    .sort((a, b) => b.id - a.id);
  const evaluation = evaluateProjectCompliance(project);
  return { project, checklist, notes, sitePlans, evaluation };
}

function syncChecklistInLocalDb(
  db: LocalDatabase,
  projectId: number,
  m: ProjectMeasurements,
  actorName: string,
  preserveManual = true
): void {
  const existing = db.checklistItems.filter((c) => c.project_id === projectId);
  const existingByTitle = new Map(existing.map((c) => [c.title, c]));
  const built = buildChecklistForProject(projectId, m, actorName, db.nextIds.checklist);
  db.nextIds.checklist = built.nextId;
  const freshTitles = new Set(built.items.map((i) => i.title));

  // Keep custom items not generated by standard engine
  const keptCustom = existing.filter((c) => !freshTitles.has(c.title));
  const mergedAuto = built.items.map((item) => {
    const prev = existingByTitle.get(item.title);
    if (preserveManual && prev) {
      if (prev.status === 'variance') {
        return {
          ...item,
          status: 'variance' as ChecklistStatus,
          inspector_notes: prev.inspector_notes,
          verified_by: prev.verified_by,
        };
      }
    }
    return item;
  });

  db.checklistItems = [
    ...db.checklistItems.filter((c) => c.project_id !== projectId),
    ...mergedAuto,
    ...keptCustom,
  ];
}

export function getLocalSitePlanUrl(sitePlanId: number): string | null {
  const db = loadDb();
  return db.sitePlanBlobs[sitePlanId] || null;
}

export async function localUploadSitePlan(
  projectId: number,
  file: File,
  meta: {
    title?: string;
    plan_type?: string;
    revision_label?: string;
    notes?: string;
  },
  token: string | null
): Promise<{ sitePlan: SitePlanDocument }> {
  const db = loadDb();
  const user = parseUserFromToken(db, token) || db.users[0];
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error('Permit project not found.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read site plan file.'));
    reader.readAsDataURL(file);
  });

  const id = db.nextIds.sitePlan++;
  const cleanTitle =
    meta.title?.trim() ||
    file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
    `${project.property_address} — Construction Site Plan`;

  const sitePlan: SitePlanDocument = {
    id,
    project_id: projectId,
    plan_type: (meta.plan_type as SitePlanType) || 'construction_site_plan',
    title: cleanTitle,
    original_filename: file.name || 'site-plan.pdf',
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    revision_label: meta.revision_label?.trim() || 'Rev 1',
    notes: meta.notes?.trim() || '',
    uploaded_by: user.name,
    created_at: new Date().toISOString(),
  };

  db.sitePlans.unshift(sitePlan);
  db.sitePlanBlobs[id] = dataUrl;
  project.updated_at = new Date().toISOString();
  saveDb(db);
  return { sitePlan };
}

export async function handleLocalApiFallback<T>(
  rawPath: string,
  options: RequestInit,
  currentToken: string | null
): Promise<{ status: number; data: T }> {
  const db = loadDb();
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(rawPath, 'http://localhost');
  const pathname = url.pathname;
  const body: Record<string, unknown> =
    typeof options.body === 'string' && options.body
      ? (JSON.parse(options.body) as Record<string, unknown>)
      : {};

  // --- AUTH ROUTES ---
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = parseUserFromToken(db, currentToken);
    if (!user) {
      return { status: 401, data: { error: 'Not signed in.' } as unknown as T };
    }
    return { status: 200, data: { user: publicUser(user) } as unknown as T };
  }

  if (pathname === '/api/auth/demo-login' && method === 'POST') {
    const email = String(body.email || 'zoning@independenceia.gov').trim().toLowerCase();
    const found =
      db.users.find((u) => u.email.toLowerCase() === email) || db.users[0];
    const token = makeLocalToken(found.id);
    return { status: 200, data: { user: publicUser(found), token } as unknown as T };
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return {
        status: 400,
        data: { error: 'Email and password are required.' } as unknown as T,
      };
    }
    const found = db.users.find((u) => u.email.toLowerCase() === email);
    if (!found) {
      return {
        status: 401,
        data: {
          error:
            'No account found for that email. Click "Create Account" above to register, or use one of the instant demo accounts.',
        } as unknown as T,
      };
    }
    if (found.password !== password) {
      return {
        status: 401,
        data: {
          error: 'Incorrect password. (For demo accounts, use password: Indee2026!)',
        } as unknown as T,
      };
    }
    const token = makeLocalToken(found.id);
    return { status: 200, data: { user: publicUser(found), token } as unknown as T };
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const roleRaw = String(body.role || 'inspector');
    if (!name || !email || !password) {
      return {
        status: 400,
        data: { error: 'Name, email, and password are required.' } as unknown as T,
      };
    }
    if (password.length < 6) {
      return {
        status: 400,
        data: { error: 'Password must be at least 6 characters.' } as unknown as T,
      };
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return {
        status: 409,
        data: { error: 'An account with this email already exists.' } as unknown as T,
      };
    }
    const role: UserRole =
      roleRaw === 'admin' || roleRaw === 'applicant' ? roleRaw : 'inspector';
    const defaultTitle =
      role === 'admin'
        ? 'Planning & Zoning Administrator'
        : role === 'applicant'
          ? 'Property Owner / Permit Applicant'
          : 'Zoning & Code Reviewer';
    const newUser: StoredUser = {
      id: db.nextIds.user++,
      name,
      email,
      password,
      role,
      title: String(body.title || defaultTitle).trim() || defaultTitle,
      department:
        String(
          body.department ||
            (role === 'applicant'
              ? 'Independence, IA Resident / Contractor'
              : 'City of Independence — Planning & Zoning')
        ).trim(),
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);
    const token = makeLocalToken(newUser.id);
    return { status: 201, data: { user: publicUser(newUser), token } as unknown as T };
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    return { status: 200, data: { ok: true } as unknown as T };
  }

  if (pathname === '/api/auth/profile' && method === 'PATCH') {
    const user = parseUserFromToken(db, currentToken) || db.users[0];
    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim();
    if (typeof body.title === 'string' && body.title.trim()) user.title = body.title.trim();
    if (typeof body.department === 'string' && body.department.trim())
      user.department = body.department.trim();
    if (body.role === 'admin' || body.role === 'inspector' || body.role === 'applicant') {
      user.role = body.role;
    }
    saveDb(db);
    return { status: 200, data: { user: publicUser(user) } as unknown as T };
  }

  // Authenticated user for workspace endpoints
  const actor = parseUserFromToken(db, currentToken) || db.users[0];

  // --- ORDINANCES ---
  if (pathname === '/api/ordinances/compare' && method === 'POST') {
    const evaluation = evaluateProjectCompliance(body as unknown as ProjectMeasurements);
    return { status: 200, data: { evaluation } as unknown as T };
  }

  if (pathname === '/api/ordinances' && method === 'GET') {
    const cat = url.searchParams.get('category');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const rules = db.ordinanceRules.filter((r) => {
      if (cat && cat !== 'all' && r.category !== cat) return false;
      if (search) {
        const hay = `${r.title} ${r.code_section} ${r.requirement_summary} ${r.ordinance_text} ${r.applies_to}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return { status: 200, data: { rules } as unknown as T };
  }

  if (pathname === '/api/ordinances' && method === 'POST') {
    const rule: OrdinanceRule = {
      id: db.nextIds.rule++,
      category: (body.category as OrdinanceCategory) || 'zoning',
      code_section: String(body.code_section || '').trim(),
      title: String(body.title || '').trim(),
      applies_to: String(body.applies_to || 'All Districts').trim(),
      requirement_summary: String(body.requirement_summary || '').trim(),
      threshold_metric: String(body.threshold_metric || '').trim(),
      ordinance_text: String(body.ordinance_text || body.requirement_summary || '').trim(),
      remedy_guidance: String(body.remedy_guidance || '').trim(),
      is_custom: true,
      updated_at: new Date().toISOString(),
    };
    db.ordinanceRules.push(rule);
    saveDb(db);
    return { status: 201, data: { rule } as unknown as T };
  }

  const ordIdMatch = pathname.match(/^\/api\/ordinances\/(\d+)$/);
  if (ordIdMatch) {
    const id = Number(ordIdMatch[1]);
    const idx = db.ordinanceRules.findIndex((r) => r.id === id);
    if (idx === -1) return { status: 404, data: { error: 'Rule not found.' } as unknown as T };
    if (method === 'PUT') {
      db.ordinanceRules[idx] = {
        ...db.ordinanceRules[idx],
        ...(body as Partial<OrdinanceRule>),
        id,
        updated_at: new Date().toISOString(),
      };
      saveDb(db);
      return { status: 200, data: { rule: db.ordinanceRules[idx] } as unknown as T };
    }
    if (method === 'DELETE') {
      db.ordinanceRules.splice(idx, 1);
      saveDb(db);
      return { status: 200, data: { ok: true } as unknown as T };
    }
  }

  // --- PROJECTS ---
  if (pathname === '/api/projects' && method === 'GET') {
    const projects = [...db.projects]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)
      .map((p) => enrichProjectCounts(db, p));
    return { status: 200, data: { projects } as unknown as T };
  }

  if (pathname === '/api/projects' && method === 'POST') {
    const id = db.nextIds.project++;
    const now = new Date().toISOString();
    const seq = String(100 + id).padStart(4, '0');
    const newProj: Project = {
      ...(body as unknown as ProjectMeasurements),
      id,
      permit_number: `PRJ-2026-${seq}`,
      title: String(body.title || 'Permit Review'),
      property_address: String(body.property_address || ''),
      parcel_pin: String(body.parcel_pin || ''),
      ward: String(body.ward || 'Ward 1'),
      applicant_name: String(body.applicant_name || ''),
      applicant_email: String(body.applicant_email || ''),
      applicant_phone: String(body.applicant_phone || ''),
      description: String(body.description || ''),
      status: (body.status as ProjectStatus) || 'in_review',
      assigned_to: String(body.assigned_to || actor.name),
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    };
    db.projects.unshift(newProj);
    syncChecklistInLocalDb(db, id, newProj, actor.name, false);
    saveDb(db);
    return { status: 201, data: fullProjectPayload(db, id) as unknown as T };
  }

  const projDetailMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
  if (projDetailMatch) {
    const id = Number(projDetailMatch[1]);
    if (method === 'GET') {
      const payload = fullProjectPayload(db, id);
      if (!payload) return { status: 404, data: { error: 'Project not found.' } as unknown as T };
      return { status: 200, data: payload as unknown as T };
    }
    if (method === 'PUT') {
      const idx = db.projects.findIndex((p) => p.id === id);
      if (idx === -1) return { status: 404, data: { error: 'Project not found.' } as unknown as T };
      const updated: Project = {
        ...db.projects[idx],
        ...(body as Partial<Project>),
        id,
        updated_at: new Date().toISOString(),
      };
      db.projects[idx] = updated;
      if (body.auto_sync_checklist !== false) {
        syncChecklistInLocalDb(db, id, updated, actor.name, true);
      }
      saveDb(db);
      return { status: 200, data: fullProjectPayload(db, id) as unknown as T };
    }
    if (method === 'DELETE') {
      db.projects = db.projects.filter((p) => p.id !== id);
      db.checklistItems = db.checklistItems.filter((c) => c.project_id !== id);
      db.notes = db.notes.filter((n) => n.project_id !== id);
      db.sitePlans = db.sitePlans.filter((s) => s.project_id !== id);
      saveDb(db);
      return { status: 200, data: { ok: true, deletedId: id } as unknown as T };
    }
  }

  const projStatusMatch = pathname.match(/^\/api\/projects\/(\d+)\/status$/);
  if (projStatusMatch && method === 'PATCH') {
    const id = Number(projStatusMatch[1]);
    const proj = db.projects.find((p) => p.id === id);
    if (!proj) return { status: 404, data: { error: 'Project not found.' } as unknown as T };
    proj.status = (body.status as ProjectStatus) || proj.status;
    proj.updated_at = new Date().toISOString();
    saveDb(db);
    return { status: 200, data: fullProjectPayload(db, id) as unknown as T };
  }

  const projSyncMatch = pathname.match(/^\/api\/projects\/(\d+)\/sync-checklist$/);
  if (projSyncMatch && method === 'POST') {
    const id = Number(projSyncMatch[1]);
    const proj = db.projects.find((p) => p.id === id);
    if (!proj) return { status: 404, data: { error: 'Project not found.' } as unknown as T };
    syncChecklistInLocalDb(db, id, proj, actor.name, body.preserve_manual !== false);
    proj.updated_at = new Date().toISOString();
    saveDb(db);
    return { status: 200, data: fullProjectPayload(db, id) as unknown as T };
  }

  const projDupMatch = pathname.match(/^\/api\/projects\/(\d+)\/duplicate$/);
  if (projDupMatch && method === 'POST') {
    const srcId = Number(projDupMatch[1]);
    const src = db.projects.find((p) => p.id === srcId);
    if (!src) return { status: 404, data: { error: 'Project not found.' } as unknown as T };
    const newId = db.nextIds.project++;
    const now = new Date().toISOString();
    const copy: Project = {
      ...src,
      id: newId,
      permit_number: `PRJ-2026-${String(100 + newId).padStart(4, '0')}`,
      title: `${src.title} (Copy)`,
      status: 'in_review',
      created_at: now,
      updated_at: now,
    };
    db.projects.unshift(copy);
    syncChecklistInLocalDb(db, newId, copy, actor.name, false);
    saveDb(db);
    return { status: 201, data: fullProjectPayload(db, newId) as unknown as T };
  }

  // --- CHECKLIST ITEMS ---
  const addCheckMatch = pathname.match(/^\/api\/projects\/(\d+)\/checklist$/);
  if (addCheckMatch && method === 'POST') {
    const projectId = Number(addCheckMatch[1]);
    const maxSort = Math.max(
      0,
      ...db.checklistItems.filter((c) => c.project_id === projectId).map((c) => c.sort_order)
    );
    const status = (body.status as ChecklistStatus) || 'pending';
    const item: ChecklistItem = {
      id: db.nextIds.checklist++,
      project_id: projectId,
      category: (body.category as OrdinanceCategory) || 'zoning',
      code_citation: String(body.code_citation || 'IMC / Staff Condition').trim(),
      title: String(body.title || '').trim(),
      ordinance_requirement: String(body.ordinance_requirement || '').trim(),
      proposed_value: String(body.proposed_value || '').trim(),
      status,
      priority: (body.priority as ChecklistPriority) || 'standard',
      inspector_notes: String(body.inspector_notes || '').trim(),
      verified_by: status === 'pass' || status === 'fail' ? actor.name : '',
      sort_order: maxSort + 10,
      updated_at: new Date().toISOString(),
    };
    db.checklistItems.push(item);
    saveDb(db);
    return { status: 201, data: { item } as unknown as T };
  }

  const bulkCheckMatch = pathname.match(/^\/api\/projects\/(\d+)\/checklist\/bulk-status$/);
  if (bulkCheckMatch && method === 'POST') {
    const projectId = Number(bulkCheckMatch[1]);
    const cat = String(body.category || 'all');
    const nextStatus = (body.status as ChecklistStatus) || 'pass';
    db.checklistItems = db.checklistItems.map((c) => {
      if (c.project_id !== projectId || c.status === 'na') return c;
      if (cat !== 'all' && c.category !== cat) return c;
      return {
        ...c,
        status: nextStatus,
        verified_by: nextStatus === 'pending' ? '' : actor.name,
        updated_at: new Date().toISOString(),
      };
    });
    saveDb(db);
    const checklist = db.checklistItems
      .filter((c) => c.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    return { status: 200, data: { checklist } as unknown as T };
  }

  const checkItemMatch = pathname.match(/^\/api\/checklist\/(\d+)$/);
  if (checkItemMatch) {
    const id = Number(checkItemMatch[1]);
    const idx = db.checklistItems.findIndex((c) => c.id === id);
    if (idx === -1) return { status: 404, data: { error: 'Item not found.' } as unknown as T };
    if (method === 'PATCH') {
      const prev = db.checklistItems[idx];
      const nextStatus = (body.status as ChecklistStatus) || prev.status;
      const updated: ChecklistItem = {
        ...prev,
        ...(body as Partial<ChecklistItem>),
        id,
        status: nextStatus,
        verified_by:
          body.status !== undefined
            ? nextStatus === 'pending' || nextStatus === 'na'
              ? ''
              : actor.name
            : prev.verified_by,
        updated_at: new Date().toISOString(),
      };
      db.checklistItems[idx] = updated;
      saveDb(db);
      return { status: 200, data: { item: updated } as unknown as T };
    }
    if (method === 'DELETE') {
      db.checklistItems.splice(idx, 1);
      saveDb(db);
      return { status: 200, data: { ok: true } as unknown as T };
    }
  }

  // --- INSPECTION NOTES ---
  const addNoteMatch = pathname.match(/^\/api\/projects\/(\d+)\/notes$/);
  if (addNoteMatch && method === 'POST') {
    const projectId = Number(addNoteMatch[1]);
    const now = new Date().toISOString();
    const note: InspectionNote = {
      id: db.nextIds.note++,
      project_id: projectId,
      author_name: actor.name,
      author_role: actor.title,
      note_type: (body.note_type as InspectionNote['note_type']) || 'inspection',
      content: String(body.content || '').trim(),
      created_at: now,
      updated_at: now,
    };
    db.notes.unshift(note);
    saveDb(db);
    return { status: 201, data: { note } as unknown as T };
  }

  const noteMatch = pathname.match(/^\/api\/notes\/(\d+)$/);
  if (noteMatch) {
    const id = Number(noteMatch[1]);
    const idx = db.notes.findIndex((n) => n.id === id);
    if (idx === -1) return { status: 404, data: { error: 'Note not found.' } as unknown as T };
    if (method === 'PATCH') {
      db.notes[idx] = {
        ...db.notes[idx],
        note_type: (body.note_type as InspectionNote['note_type']) || db.notes[idx].note_type,
        content:
          typeof body.content === 'string' ? body.content.trim() : db.notes[idx].content,
        updated_at: new Date().toISOString(),
      };
      saveDb(db);
      return { status: 200, data: { note: db.notes[idx] } as unknown as T };
    }
    if (method === 'DELETE') {
      db.notes.splice(idx, 1);
      saveDb(db);
      return { status: 200, data: { ok: true } as unknown as T };
    }
  }

  // --- SITE PLANS METADATA ---
  const listPlansMatch = pathname.match(/^\/api\/projects\/(\d+)\/site-plans$/);
  if (listPlansMatch && method === 'GET') {
    const projectId = Number(listPlansMatch[1]);
    const sitePlans = db.sitePlans
      .filter((s) => s.project_id === projectId)
      .sort((a, b) => b.id - a.id);
    return { status: 200, data: { sitePlans } as unknown as T };
  }

  const sitePlanMatch = pathname.match(/^\/api\/site-plans\/(\d+)$/);
  if (sitePlanMatch) {
    const id = Number(sitePlanMatch[1]);
    const idx = db.sitePlans.findIndex((s) => s.id === id);
    if (idx === -1) return { status: 404, data: { error: 'Site plan not found.' } as unknown as T };
    if (method === 'PATCH') {
      db.sitePlans[idx] = {
        ...db.sitePlans[idx],
        title:
          typeof body.title === 'string' && body.title.trim()
            ? body.title.trim()
            : db.sitePlans[idx].title,
        plan_type: (body.plan_type as SitePlanType) || db.sitePlans[idx].plan_type,
        revision_label:
          typeof body.revision_label === 'string' && body.revision_label.trim()
            ? body.revision_label.trim()
            : db.sitePlans[idx].revision_label,
        notes: typeof body.notes === 'string' ? body.notes.trim() : db.sitePlans[idx].notes,
      };
      saveDb(db);
      return { status: 200, data: { sitePlan: db.sitePlans[idx] } as unknown as T };
    }
    if (method === 'DELETE') {
      db.sitePlans.splice(idx, 1);
      delete db.sitePlanBlobs[id];
      saveDb(db);
      return { status: 200, data: { ok: true, deletedId: id } as unknown as T };
    }
  }

  return { status: 404, data: { error: `Unknown endpoint: ${pathname}` } as unknown as T };
}
