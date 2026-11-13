import { Router } from 'express';
import { db } from '../db.ts';

export const checklistRouter = Router();

checklistRouter.post('/projects/:projectId/checklist', (req, res) => {
  const projectId = Number(req.params.projectId);
  const proj = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!proj) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const {
    category = 'zoning',
    code_citation = 'IMC / Local Condition',
    title,
    ordinance_requirement = '',
    proposed_value = '',
    status = 'pending',
    priority = 'standard',
    inspector_notes = '',
  } = req.body || {};

  if (!title || !String(title).trim()) {
    res.status(400).json({ error: 'Checklist item title is required.' });
    return;
  }

  const maxSortRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM checklist_items WHERE project_id = ?')
    .get(projectId) as { max_sort: number };

  const reviewer = String(req.body?.verified_by || 'Planning & Zoning Staff').trim();
  const verifiedBy =
    status === 'pass' || status === 'fail' || status === 'variance' ? reviewer : '';

  const result = db
    .prepare(
      `INSERT INTO checklist_items (
        project_id, category, code_citation, title, ordinance_requirement,
        proposed_value, status, priority, inspector_notes, verified_by, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      projectId,
      String(category),
      String(code_citation).trim(),
      String(title).trim(),
      String(ordinance_requirement).trim(),
      String(proposed_value).trim(),
      String(status),
      String(priority),
      String(inspector_notes).trim(),
      verifiedBy,
      (maxSortRow?.max_sort || 0) + 10
    );

  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);

  const item = db
    .prepare('SELECT * FROM checklist_items WHERE id = ?')
    .get(Number(result.lastInsertRowid));
  res.status(201).json({ item });
});

checklistRouter.patch('/checklist/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Checklist item not found.' });
    return;
  }

  const body = req.body || {};
  const reviewer = String(body.verified_by || 'Planning & Zoning Staff').trim();
  const nextStatus = body.status !== undefined ? String(body.status) : String(existing.status);
  const nextVerifiedBy =
    body.status !== undefined
      ? nextStatus === 'pending' || nextStatus === 'na'
        ? ''
        : reviewer
      : String(existing.verified_by || '');

  db.prepare(
    `UPDATE checklist_items SET
      category = ?,
      code_citation = ?,
      title = ?,
      ordinance_requirement = ?,
      proposed_value = ?,
      status = ?,
      priority = ?,
      inspector_notes = ?,
      verified_by = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    body.category !== undefined ? String(body.category) : String(existing.category),
    body.code_citation !== undefined
      ? String(body.code_citation).trim()
      : String(existing.code_citation),
    body.title !== undefined ? String(body.title).trim() : String(existing.title),
    body.ordinance_requirement !== undefined
      ? String(body.ordinance_requirement).trim()
      : String(existing.ordinance_requirement),
    body.proposed_value !== undefined
      ? String(body.proposed_value).trim()
      : String(existing.proposed_value),
    nextStatus,
    body.priority !== undefined ? String(body.priority) : String(existing.priority),
    body.inspector_notes !== undefined
      ? String(body.inspector_notes).trim()
      : String(existing.inspector_notes),
    nextVerifiedBy,
    id
  );

  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(
    Number(existing.project_id)
  );

  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(id);
  res.json({ item });
});

checklistRouter.post('/projects/:projectId/checklist/bulk-status', (req, res) => {
  const projectId = Number(req.params.projectId);
  const { category, status, verified_by } = req.body || {};
  const validStatuses = new Set(['pass', 'fail', 'pending', 'variance', 'na']);
  if (!validStatuses.has(status)) {
    res.status(400).json({ error: 'Invalid checklist status.' });
    return;
  }

  const reviewer = String(verified_by || 'Planning & Zoning Staff').trim();
  const verifiedBy = status === 'pending' || status === 'na' ? '' : reviewer;
  if (category && category !== 'all') {
    db.prepare(
      "UPDATE checklist_items SET status = ?, verified_by = ?, updated_at = datetime('now') WHERE project_id = ? AND category = ? AND status != 'na'"
    ).run(status, verifiedBy, projectId, String(category));
  } else {
    db.prepare(
      "UPDATE checklist_items SET status = ?, verified_by = ?, updated_at = datetime('now') WHERE project_id = ? AND status != 'na'"
    ).run(status, verifiedBy, projectId);
  }
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);

  const checklist = db
    .prepare('SELECT * FROM checklist_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC')
    .all(projectId);
  res.json({ checklist });
});

checklistRouter.delete('/checklist/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT project_id FROM checklist_items WHERE id = ?').get(id) as
    | { project_id: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Checklist item not found.' });
    return;
  }
  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(id);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(
    existing.project_id
  );
  res.json({ ok: true, deletedId: id });
});
