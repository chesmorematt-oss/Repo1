import { db } from './db.ts';
import { evaluateProjectCompliance } from './ordinanceEngine.ts';
import type { ChecklistStatus, ProjectMeasurements } from '../src/types.ts';

export function buildChecklistRowsFromMeasurements(
  m: ProjectMeasurements,
  verifiedBy = ''
): Array<{
  category: string;
  code_citation: string;
  title: string;
  ordinance_requirement: string;
  proposed_value: string;
  status: ChecklistStatus;
  priority: string;
  inspector_notes: string;
  verified_by: string;
  sort_order: number;
}> {
  const evalSummary = evaluateProjectCompliance(m);
  return evalSummary.checks.map((c, idx) => {
    let status: ChecklistStatus = 'pending';
    if (c.verdict === 'pass') status = 'pass';
    else if (c.verdict === 'fail') status = 'fail';
    else if (c.verdict === 'na') status = 'na';
    else status = 'pending';

    const noteParts: string[] = [c.explanation];
    if (c.remedy) {
      noteParts.push(`Action: ${c.remedy}`);
    }

    return {
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
    };
  });
}

export function syncProjectChecklist(
  projectId: number,
  m: ProjectMeasurements,
  actorName: string,
  preserveManualVarianceAndNotes = true
): void {
  const existingStmt = db.prepare(
    'SELECT id, title, code_citation, status, inspector_notes, verified_by FROM checklist_items WHERE project_id = ?'
  );
  const existing = existingStmt.all(projectId) as Array<{
    id: number;
    title: string;
    code_citation: string;
    status: ChecklistStatus;
    inspector_notes: string;
    verified_by: string;
  }>;

  const existingByTitle = new Map(existing.map((item) => [item.title, item]));
  const freshRows = buildChecklistRowsFromMeasurements(m, actorName);
  const freshTitles = new Set(freshRows.map((r) => r.title));

  db.exec('BEGIN');
  try {
    // Keep custom manually added items whose title is not one of the standard engine checks
    const deleteAutoStmt = db.prepare('DELETE FROM checklist_items WHERE id = ?');
    for (const item of existing) {
      if (freshTitles.has(item.title)) {
        deleteAutoStmt.run(item.id);
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO checklist_items (
        project_id, category, code_citation, title, ordinance_requirement,
        proposed_value, status, priority, inspector_notes, verified_by, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const row of freshRows) {
      const prev = existingByTitle.get(row.title);
      let finalStatus = row.status;
      let finalNotes = row.inspector_notes;
      let finalVerified = row.verified_by;

      if (preserveManualVarianceAndNotes && prev) {
        if (prev.status === 'variance') {
          finalStatus = 'variance';
          finalVerified = prev.verified_by || actorName;
        }
        if (prev.inspector_notes && prev.inspector_notes.startsWith('[Inspector]')) {
          finalNotes = prev.inspector_notes;
        }
      }

      insertStmt.run(
        projectId,
        row.category,
        row.code_citation,
        row.title,
        row.ordinance_requirement,
        row.proposed_value,
        finalStatus,
        row.priority,
        finalNotes,
        finalVerified,
        row.sort_order
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
