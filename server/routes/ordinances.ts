import { Router } from 'express';
import { db } from '../db.ts';
import { requireAuth } from '../auth.ts';
import { evaluateProjectCompliance } from '../ordinanceEngine.ts';
import type { ProjectMeasurements } from '../../src/types.ts';

export const ordinancesRouter = Router();

ordinancesRouter.use(requireAuth);

ordinancesRouter.get('/', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM ordinance_rules WHERE 1=1';
  const params: string[] = [];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(String(category));
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    sql +=
      ' AND (title LIKE ? OR code_section LIKE ? OR requirement_summary LIKE ? OR ordinance_text LIKE ? OR applies_to LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY category ASC, id ASC';
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  const rules = rows.map((r) => ({ ...r, is_custom: Boolean(r.is_custom) }));
  res.json({ rules });
});

ordinancesRouter.post('/', (req, res) => {
  const {
    category = 'zoning',
    code_section,
    title,
    applies_to = 'All Districts',
    requirement_summary,
    threshold_metric = '',
    ordinance_text = '',
    remedy_guidance = '',
  } = req.body || {};

  if (!code_section || !title || !requirement_summary) {
    res
      .status(400)
      .json({ error: 'Code section, title, and requirement summary are required.' });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO ordinance_rules (
        category, code_section, title, applies_to, requirement_summary,
        threshold_metric, ordinance_text, remedy_guidance, is_custom, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
    )
    .run(
      String(category),
      String(code_section).trim(),
      String(title).trim(),
      String(applies_to).trim(),
      String(requirement_summary).trim(),
      String(threshold_metric).trim(),
      String(ordinance_text || requirement_summary).trim(),
      String(remedy_guidance).trim()
    );

  const row = db
    .prepare('SELECT * FROM ordinance_rules WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Record<string, unknown>;
  res.status(201).json({ rule: { ...row, is_custom: Boolean(row.is_custom) } });
});

ordinancesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM ordinance_rules WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Ordinance rule not found.' });
    return;
  }

  const b = req.body || {};
  db.prepare(
    `UPDATE ordinance_rules SET
      category = ?, code_section = ?, title = ?, applies_to = ?,
      requirement_summary = ?, threshold_metric = ?, ordinance_text = ?,
      remedy_guidance = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    b.category !== undefined ? String(b.category) : String(existing.category),
    b.code_section !== undefined ? String(b.code_section).trim() : String(existing.code_section),
    b.title !== undefined ? String(b.title).trim() : String(existing.title),
    b.applies_to !== undefined ? String(b.applies_to).trim() : String(existing.applies_to),
    b.requirement_summary !== undefined
      ? String(b.requirement_summary).trim()
      : String(existing.requirement_summary),
    b.threshold_metric !== undefined
      ? String(b.threshold_metric).trim()
      : String(existing.threshold_metric),
    b.ordinance_text !== undefined
      ? String(b.ordinance_text).trim()
      : String(existing.ordinance_text),
    b.remedy_guidance !== undefined
      ? String(b.remedy_guidance).trim()
      : String(existing.remedy_guidance),
    id
  );

  const row = db.prepare('SELECT * FROM ordinance_rules WHERE id = ?').get(id) as Record<
    string,
    unknown
  >;
  res.json({ rule: { ...row, is_custom: Boolean(row.is_custom) } });
});

ordinancesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM ordinance_rules WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Ordinance rule not found.' });
    return;
  }
  res.json({ ok: true, deletedId: id });
});

ordinancesRouter.post('/compare', (req, res) => {
  const m = (req.body || {}) as ProjectMeasurements;
  const evaluation = evaluateProjectCompliance(m);
  res.json({ evaluation });
});
