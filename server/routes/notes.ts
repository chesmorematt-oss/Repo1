import { Router } from 'express';
import { db } from '../db.ts';

export const notesRouter = Router();

notesRouter.post('/projects/:projectId/notes', (req, res) => {
  const projectId = Number(req.params.projectId);
  const proj = db.prepare('SELECT id, assigned_to FROM projects WHERE id = ?').get(projectId) as
    | { id: number; assigned_to: string }
    | undefined;
  if (!proj) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { note_type = 'inspection', content, author_name, author_role } = req.body || {};
  if (!content || !String(content).trim()) {
    res.status(400).json({ error: 'Note content is required.' });
    return;
  }

  const resolvedAuthor =
    String(author_name || proj.assigned_to || 'Planning & Zoning Staff').trim();
  const resolvedRole =
    String(author_role || 'City of Independence — Planning & Zoning').trim();

  const result = db
    .prepare(
      `INSERT INTO inspection_notes (project_id, author_name, author_role, note_type, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(projectId, resolvedAuthor, resolvedRole, String(note_type), String(content).trim());

  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);

  const note = db
    .prepare('SELECT * FROM inspection_notes WHERE id = ?')
    .get(Number(result.lastInsertRowid));
  res.status(201).json({ note });
});

notesRouter.patch('/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM inspection_notes WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Inspection note not found.' });
    return;
  }

  const { note_type, content } = req.body || {};
  db.prepare(
    `UPDATE inspection_notes SET
      note_type = ?,
      content = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    note_type !== undefined ? String(note_type) : String(existing.note_type),
    content !== undefined ? String(content).trim() : String(existing.content),
    id
  );

  const note = db.prepare('SELECT * FROM inspection_notes WHERE id = ?').get(id);
  res.json({ note });
});

notesRouter.delete('/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM inspection_notes WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Inspection note not found.' });
    return;
  }
  res.json({ ok: true, deletedId: id });
});
