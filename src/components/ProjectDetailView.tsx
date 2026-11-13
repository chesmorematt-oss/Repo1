import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Printer,
  Copy,
  MessageSquarePlus,
  Scale,
  ClipboardCheck,
  FileText,
  CheckCheck,
  UploadCloud,
  Map,
} from 'lucide-react';
import type {
  ChecklistItem,
  ChecklistPriority,
  ChecklistStatus,
  EvaluationSummary,
  InspectionNote,
  OrdinanceCategory,
  Project,
  ProjectStatus,
  SitePlanDocument,
} from '../types';
import {
  CATEGORY_META,
  CHECKLIST_STATUS_META,
  PROJECT_STATUS_META,
  formatDateShort,
} from '../lib/format';
import { apiFetch, getSitePlanFileUrl } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { SitePlanDiagram } from './diagrams/SitePlanDiagram';
import { FloodplainCrossSection } from './diagrams/FloodplainCrossSection';
import { IndependenceLogo } from './IndependenceLogo';
import { SitePlansPanel } from './SitePlansPanel';

interface ProjectDetailViewProps {
  projectId: number;
  onBack: () => void;
  onEditProject: (project: Project) => void;
  onProjectUpdated: () => void;
  onDuplicateProject: (project: Project) => Promise<void>;
  onDeleteProject: (project: Project) => Promise<void>;
  refreshKey?: number;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
  onEditProject,
  onProjectUpdated,
  onDuplicateProject,
  onDeleteProject,
  refreshKey = 0,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState<InspectionNote[]>([]);
  const [sitePlans, setSitePlans] = useState<SitePlanDocument[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);

  const [activeTab, setActiveTab] = useState<
    'checklist' | 'comparison' | 'site_plans' | 'notes'
  >('checklist');
  const [autoOpenSitePlanUploader, setAutoOpenSitePlanUploader] = useState(false);
  const [catFilter, setCatFilter] = useState<'all' | OrdinanceCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ChecklistStatus>('all');

  // Add/Edit Checklist Item modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemCategory, setItemCategory] = useState<OrdinanceCategory>('zoning');
  const [itemCitation, setItemCitation] = useState('IMC / Staff Condition');
  const [itemReq, setItemReq] = useState('');
  const [itemProposed, setItemProposed] = useState('');
  const [itemPriority, setItemPriority] = useState<ChecklistPriority>('standard');
  const [itemNotes, setItemNotes] = useState('');

  // Inline note editing on checklist item
  const [inlineNoteItemId, setInlineNoteItemId] = useState<number | null>(null);
  const [inlineNoteText, setInlineNoteText] = useState('');

  // Inspection Notes CRUD state
  const [newNoteType, setNewNoteType] = useState<InspectionNote['note_type']>('inspection');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteType, setEditingNoteType] =
    useState<InspectionNote['note_type']>('inspection');

  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        project: Project;
        checklist: ChecklistItem[];
        notes: InspectionNote[];
        sitePlans?: SitePlanDocument[];
        evaluation: EvaluationSummary;
      }>(`/api/projects/${projectId}`);
      setProject(data.project);
      setChecklist(data.checklist);
      setNotes(data.notes);
      setSitePlans(data.sitePlans || []);
      setEvaluation(data.evaluation);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load permit review.', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail, refreshKey]);

  // Optimistic Project Status Update
  const handleStatusChange = async (nextStatus: ProjectStatus) => {
    if (!project) return;
    const prevStatus = project.status;
    setProject({ ...project, status: nextStatus });
    try {
      const res = await apiFetch<{
        project: Project;
        checklist: ChecklistItem[];
        notes: InspectionNote[];
        evaluation: EvaluationSummary;
      }>(`/api/projects/${project.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setProject(res.project);
      onProjectUpdated();
      showToast(`Status updated to ${PROJECT_STATUS_META[nextStatus].label}.`);
    } catch (err) {
      setProject({ ...project, status: prevStatus });
      showToast(
        err instanceof Error ? err.message : 'Failed to update status; rolled back.',
        'error'
      );
    }
  };

  // Optimistic Checklist Item Status Toggle
  const handleItemStatusChange = async (item: ChecklistItem, nextStatus: ChecklistStatus) => {
    if (item.status === nextStatus) return;
    const prevChecklist = [...checklist];
    const optimisticVerified =
      nextStatus === 'pending' || nextStatus === 'na' ? '' : user?.name || 'Inspector';

    setChecklist((curr) =>
      curr.map((c) =>
        c.id === item.id ? { ...c, status: nextStatus, verified_by: optimisticVerified } : c
      )
    );

    try {
      const res = await apiFetch<{ item: ChecklistItem }>(`/api/checklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setChecklist((curr) => curr.map((c) => (c.id === item.id ? res.item : c)));
      onProjectUpdated();
    } catch (err) {
      setChecklist(prevChecklist);
      showToast(
        err instanceof Error ? err.message : 'Checklist update failed; reverted.',
        'error'
      );
    }
  };

  // Save inline inspector note on a checklist item (optimistic)
  const handleSaveInlineItemNote = async (item: ChecklistItem) => {
    const prevChecklist = [...checklist];
    const trimmed = inlineNoteText.trim();
    setInlineNoteItemId(null);
    setChecklist((curr) =>
      curr.map((c) => (c.id === item.id ? { ...c, inspector_notes: trimmed } : c))
    );

    try {
      const res = await apiFetch<{ item: ChecklistItem }>(`/api/checklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ inspector_notes: trimmed }),
      });
      setChecklist((curr) => curr.map((c) => (c.id === item.id ? res.item : c)));
      showToast('Checklist item note saved.');
    } catch (err) {
      setChecklist(prevChecklist);
      showToast(err instanceof Error ? err.message : 'Failed to save note.', 'error');
    }
  };

  // Open modal for Create or Edit Checklist Item
  const openCreateItemModal = () => {
    setEditingItem(null);
    setItemTitle('');
    setItemCategory(catFilter === 'all' ? 'zoning' : catFilter);
    setItemCitation('IMC / Site Plan Condition');
    setItemReq('');
    setItemProposed('');
    setItemPriority('standard');
    setItemNotes('');
    setShowAddItem(true);
  };

  const openEditItemModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemCategory(item.category);
    setItemCitation(item.code_citation);
    setItemReq(item.ordinance_requirement);
    setItemProposed(item.proposed_value);
    setItemPriority(item.priority);
    setItemNotes(item.inspector_notes);
    setShowAddItem(true);
  };

  const handleSaveItemModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !itemTitle.trim()) return;

    if (editingItem) {
      const prev = [...checklist];
      const optimistic: ChecklistItem = {
        ...editingItem,
        title: itemTitle.trim(),
        category: itemCategory,
        code_citation: itemCitation.trim(),
        ordinance_requirement: itemReq.trim(),
        proposed_value: itemProposed.trim(),
        priority: itemPriority,
        inspector_notes: itemNotes.trim(),
      };
      setChecklist((curr) => curr.map((c) => (c.id === editingItem.id ? optimistic : c)));
      setShowAddItem(false);

      try {
        const res = await apiFetch<{ item: ChecklistItem }>(`/api/checklist/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify(optimistic),
        });
        setChecklist((curr) => curr.map((c) => (c.id === editingItem.id ? res.item : c)));
        showToast('Checklist item updated.');
      } catch (err) {
        setChecklist(prev);
        showToast(err instanceof Error ? err.message : 'Failed to update item.', 'error');
      }
    } else {
      const tempId = -Date.now();
      const tempItem: ChecklistItem = {
        id: tempId,
        project_id: project.id,
        category: itemCategory,
        code_citation: itemCitation.trim(),
        title: itemTitle.trim(),
        ordinance_requirement: itemReq.trim(),
        proposed_value: itemProposed.trim(),
        status: 'pending',
        priority: itemPriority,
        inspector_notes: itemNotes.trim(),
        verified_by: '',
        sort_order: 999,
        updated_at: new Date().toISOString(),
      };
      setChecklist((curr) => [...curr, tempItem]);
      setShowAddItem(false);

      try {
        const res = await apiFetch<{ item: ChecklistItem }>(
          `/api/projects/${project.id}/checklist`,
          {
            method: 'POST',
            body: JSON.stringify({
              category: itemCategory,
              code_citation: itemCitation.trim(),
              title: itemTitle.trim(),
              ordinance_requirement: itemReq.trim(),
              proposed_value: itemProposed.trim(),
              priority: itemPriority,
              inspector_notes: itemNotes.trim(),
            }),
          }
        );
        setChecklist((curr) => curr.map((c) => (c.id === tempId ? res.item : c)));
        onProjectUpdated();
        showToast('Custom checklist item added.');
      } catch (err) {
        setChecklist((curr) => curr.filter((c) => c.id !== tempId));
        showToast(err instanceof Error ? err.message : 'Failed to add checklist item.', 'error');
      }
    }
  };

  const handleDeleteChecklistItem = async (item: ChecklistItem) => {
    const prev = [...checklist];
    setChecklist((curr) => curr.filter((c) => c.id !== item.id));
    try {
      await apiFetch(`/api/checklist/${item.id}`, { method: 'DELETE' });
      onProjectUpdated();
      showToast('Checklist item deleted.');
    } catch (err) {
      setChecklist(prev);
      showToast(err instanceof Error ? err.message : 'Failed to delete item.', 'error');
    }
  };

  const handleBulkStatus = async (status: ChecklistStatus) => {
    if (!project) return;
    const prev = [...checklist];
    setChecklist((curr) =>
      curr.map((c) => {
        if (c.status === 'na') return c;
        if (catFilter !== 'all' && c.category !== catFilter) return c;
        return { ...c, status, verified_by: status === 'pending' ? '' : user?.name || '' };
      })
    );
    try {
      const res = await apiFetch<{ checklist: ChecklistItem[] }>(
        `/api/projects/${project.id}/checklist/bulk-status`,
        {
          method: 'POST',
          body: JSON.stringify({ category: catFilter, status }),
        }
      );
      setChecklist(res.checklist);
      onProjectUpdated();
      showToast(
        `Marked ${catFilter === 'all' ? 'all active' : CATEGORY_META[catFilter].shortLabel} items as ${CHECKLIST_STATUS_META[status].shortLabel}.`
      );
    } catch (err) {
      setChecklist(prev);
      showToast(err instanceof Error ? err.message : 'Bulk update failed.', 'error');
    }
  };

  const handleResyncWithOrdinances = async () => {
    if (!project) return;
    setSyncing(true);
    try {
      const res = await apiFetch<{
        project: Project;
        checklist: ChecklistItem[];
        notes: InspectionNote[];
        evaluation: EvaluationSummary;
      }>(`/api/projects/${project.id}/sync-checklist`, {
        method: 'POST',
        body: JSON.stringify({ preserve_manual: true }),
      });
      setProject(res.project);
      setChecklist(res.checklist);
      setEvaluation(res.evaluation);
      onProjectUpdated();
      showToast('Re-evaluated measurements & synced checklist against Independence ordinances.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Quick one-click toggle on key field remedies right from Comparison tab (e.g., Neighbor Agreement filed!)
  const handleQuickPatchProject = async (patch: Record<string, unknown>, label: string) => {
    if (!project) return;
    try {
      const res = await apiFetch<{
        project: Project;
        checklist: ChecklistItem[];
        notes: InspectionNote[];
        evaluation: EvaluationSummary;
      }>(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...patch, auto_sync_checklist: true }),
      });
      setProject(res.project);
      setChecklist(res.checklist);
      setEvaluation(res.evaluation);
      onProjectUpdated();
      showToast(label);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    }
  };

  // Inspection Notes CRUD (Optimistic)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newNoteContent.trim()) return;
    const tempId = -Date.now();
    const optimisticNote: InspectionNote = {
      id: tempId,
      project_id: project.id,
      author_name: user?.name || 'Inspector',
      author_role: user?.title || 'Planning & Zoning',
      note_type: newNoteType,
      content: newNoteContent.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const savedText = newNoteContent.trim();
    setNotes((curr) => [optimisticNote, ...curr]);
    setNewNoteContent('');

    try {
      const res = await apiFetch<{ note: InspectionNote }>(`/api/projects/${project.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note_type: newNoteType, content: savedText }),
      });
      setNotes((curr) => curr.map((n) => (n.id === tempId ? res.note : n)));
      showToast('Inspection note logged.');
    } catch (err) {
      setNotes((curr) => curr.filter((n) => n.id !== tempId));
      setNewNoteContent(savedText);
      showToast(err instanceof Error ? err.message : 'Failed to add note.', 'error');
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editingNoteContent.trim()) return;
    const prev = [...notes];
    setNotes((curr) =>
      curr.map((n) =>
        n.id === noteId
          ? { ...n, content: editingNoteContent.trim(), note_type: editingNoteType }
          : n
      )
    );
    setEditingNoteId(null);

    try {
      const res = await apiFetch<{ note: InspectionNote }>(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: editingNoteContent.trim(),
          note_type: editingNoteType,
        }),
      });
      setNotes((curr) => curr.map((n) => (n.id === noteId ? res.note : n)));
      showToast('Inspection note updated.');
    } catch (err) {
      setNotes(prev);
      showToast(err instanceof Error ? err.message : 'Failed to update note.', 'error');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const prev = [...notes];
    setNotes((curr) => curr.filter((n) => n.id !== noteId));
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      showToast('Inspection note removed.');
    } catch (err) {
      setNotes(prev);
      showToast(err instanceof Error ? err.message : 'Failed to delete note.', 'error');
    }
  };

  const filteredChecklist = useMemo(() => {
    return checklist.filter((c) => {
      if (catFilter !== 'all' && c.category !== catFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [checklist, catFilter, statusFilter]);

  const counts = useMemo(() => {
    const active = checklist.filter((c) => c.status !== 'na');
    return {
      totalActive: active.length,
      pass: checklist.filter((c) => c.status === 'pass').length,
      fail: checklist.filter((c) => c.status === 'fail').length,
      pending: checklist.filter((c) => c.status === 'pending').length,
      variance: checklist.filter((c) => c.status === 'variance').length,
      na: checklist.filter((c) => c.status === 'na').length,
    };
  }, [checklist]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-44 bg-slate-200 rounded-lg" />
        <div className="h-36 bg-white rounded-2xl border border-slate-200" />
        <div className="h-96 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-600">Permit review project could not be found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-civic-700 text-white text-xs font-semibold"
        >
          Back to Permit Checklists
        </button>
      </div>
    );
  }

  const statusMeta = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.in_review;
  const pctDone =
    counts.totalActive > 0
      ? Math.round(((counts.pass + counts.variance) / counts.totalActive) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Permit Checklists
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResyncWithOrdinances}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Re-Sync Ordinance Checks
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoOpenSitePlanUploader(true);
              setActiveTab('site_plans');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-civic-200 bg-civic-50 hover:bg-civic-100 text-xs font-semibold text-civic-800"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Site Plan
          </button>

          <button
            type="button"
            onClick={() => onEditProject(project)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Measurements
          </button>

          <button
            type="button"
            onClick={() => onDuplicateProject(project)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

          {confirmDeleteProject ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
              <span className="text-xs text-rose-800 font-medium">Delete permit?</span>
              <button
                type="button"
                onClick={() => onDeleteProject(project)}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteProject(false)}
                className="text-xs text-slate-600 ml-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteProject(true)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200"
              title="Delete Permit Checklist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Project Summary Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-4 mb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <IndependenceLogo size="sm" />
          <div className="text-right text-[11px] text-slate-500 leading-tight">
            <div className="font-semibold text-slate-700">
              City of Independence — Official Ordinance Compliance Record
            </div>
            <div>City Hall &middot; 331 1st Street East, Independence, IA 50644 &middot; (319) 334-4711</div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-civic-50 text-civic-800 border border-civic-200">
                {project.permit_number}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-900 text-white">
                {project.zoning_district} District
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  project.flood_zone === 'AE' ||
                  project.flood_zone === 'A' ||
                  project.flood_zone === 'FLOODWAY'
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                FEMA Zone {project.flood_zone}
              </span>
              {project.includes_fence && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  IMC Ch. 152 Fence Included
                </span>
              )}
              {sitePlans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('site_plans')}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1 transition-colors"
                >
                  <Map className="w-3.5 h-3.5" />
                  {sitePlans.length} Site Plan{sitePlans.length === 1 ? '' : 's'}
                </button>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {project.property_address} &mdash; {project.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl">{project.description}</p>

            <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 tabular-nums">
              <span>
                Applicant: <strong className="text-slate-900">{project.applicant_name}</strong>
                {project.applicant_phone ? ` (${project.applicant_phone})` : ''}
              </span>
              {project.parcel_pin && (
                <span>
                  Buchanan Co. PIN: <strong className="font-mono">{project.parcel_pin}</strong>
                </span>
              )}
              <span>{project.ward}</span>
              <span>Reviewer: {project.assigned_to}</span>
              <span>Updated: {formatDateShort(project.updated_at)}</span>
            </div>
          </div>

          {/* Right Status Control & Compliance Meter */}
          <div className="lg:w-72 shrink-0 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">Permit Status</span>
              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-civic-500 ${statusMeta.badgeClass}`}
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="corrections_required">Corrections Required</option>
                <option value="variance_needed">BOA Variance Needed</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs tabular-nums mb-1">
                <span className="font-semibold text-slate-700">Checklist Compliance</span>
                <span className="font-bold text-slate-900">{pctDone}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{
                    width: `${Math.round((counts.pass / Math.max(1, counts.totalActive)) * 100)}%`,
                  }}
                />
                <div
                  className="bg-purple-500 h-full transition-all"
                  style={{
                    width: `${Math.round((counts.variance / Math.max(1, counts.totalActive)) * 100)}%`,
                  }}
                />
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{
                    width: `${Math.round((counts.fail / Math.max(1, counts.totalActive)) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span className="text-emerald-700 font-semibold">{counts.pass} Pass</span>
                <span className="text-rose-700 font-semibold">{counts.fail} Fail</span>
                <span className="text-amber-700 font-semibold">{counts.pending} Pending</span>
                {counts.variance > 0 && (
                  <span className="text-purple-700 font-semibold">{counts.variance} Var.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Mode Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'checklist'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Interactive Compliance Checklist ({checklist.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'comparison'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            Ordinance Comparison &amp; Site Diagrams
            {evaluation && evaluation.fail_count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                {evaluation.fail_count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoOpenSitePlanUploader(false);
              setActiveTab('site_plans');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'site_plans'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Map className="w-4 h-4" />
            Construction Site Plans ({sitePlans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Inspection Log &amp; Conditions ({notes.length})
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: INTERACTIVE COMPLIANCE CHECKLIST (FULL CRUD + OPTIMISTIC) */}
      {/* ================================================================= */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Ordinances' },
                  { id: 'zoning', label: 'Zoning (Art. 1–5)' },
                  { id: 'floodplain', label: 'Floodplain (Ch. 167)' },
                  { id: 'fence', label: 'Fence (Ch. 152)' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatFilter(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    catFilter === c.id
                      ? 'bg-civic-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | ChecklistStatus)}
                aria-label="Filter checklist items by status"
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="fail">Violations (Fail)</option>
                <option value="pending">Pending Verification</option>
                <option value="pass">Compliant (Pass)</option>
                <option value="variance">BOA Variance</option>
                <option value="na">Not Applicable</option>
              </select>

              <button
                type="button"
                onClick={() => handleBulkStatus('pass')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark Visible Pass
              </button>

              <button
                type="button"
                onClick={openCreateItemModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Check Item
              </button>
            </div>
          </div>

          {filteredChecklist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No checklist items match your current filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCatFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-3 text-xs font-semibold text-civic-700 hover:underline"
              >
                Show all checklist items
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredChecklist.map((item) => {
                const catMeta = CATEGORY_META[item.category] || CATEGORY_META.zoning;
                const stMeta = CHECKLIST_STATUS_META[item.status] || CHECKLIST_STATUS_META.pending;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
                      item.status === 'fail'
                        ? 'border-rose-200 bg-rose-50/15'
                        : item.status === 'pass'
                          ? 'border-slate-200'
                          : item.status === 'na'
                            ? 'border-slate-200 opacity-70'
                            : 'border-amber-200/80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Item Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${catMeta.pillClass}`}
                          >
                            {catMeta.shortLabel}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.code_citation}
                          </span>
                          {item.priority === 'critical' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                              Critical
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stMeta.badgeClass}`}
                          >
                            {stMeta.label}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Independence Ordinance Standard
                            </span>
                            <span className="text-slate-800 font-medium">
                              {item.ordinance_requirement || 'Standard compliance check'}
                            </span>
                          </div>
                          <div
                            className={`p-2.5 rounded-lg border ${
                              item.status === 'fail'
                                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                : 'bg-slate-50 border-slate-200/80 text-slate-800'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Applicant Proposed / Measured
                            </span>
                            <span className="font-semibold tabular-nums">
                              {item.proposed_value || 'Pending field verification'}
                            </span>
                          </div>
                        </div>

                        {/* Inline Inspector Note Display or Editor */}
                        {inlineNoteItemId === item.id ? (
                          <div className="pt-2 space-y-2 no-print">
                            <textarea
                              rows={2}
                              value={inlineNoteText}
                              onChange={(e) => setInlineNoteText(e.target.value)}
                              placeholder="Enter inspector verification note, variance docket #, or required remedy..."
                              className="w-full px-3 py-2 text-xs rounded-lg border border-civic-400 focus:outline-none focus:ring-2 focus:ring-civic-500"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveInlineItemNote(item)}
                                className="px-3 py-1 rounded-md bg-civic-700 text-white text-xs font-semibold"
                              >
                                Save Note
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineNoteItemId(null)}
                                className="px-2.5 py-1 rounded-md text-xs text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                            <p className="leading-relaxed flex-1">
                              {item.inspector_notes}
                              {item.verified_by && (
                                <span className="ml-2 text-[11px] text-slate-400">
                                  &bull; Verified by {item.verified_by}
                                </span>
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineNoteItemId(item.id);
                                setInlineNoteText(item.inspector_notes);
                              }}
                              className="text-[11px] font-semibold text-civic-700 hover:underline shrink-0 no-print"
                            >
                              {item.inspector_notes ? 'Edit Note' : '+ Add Note'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Optimistic 1-Click Status Buttons + Edit/Delete */}
                      <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 no-print">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-0.5">
                          {(
                            [
                              { s: 'pass', label: 'Pass', activeCls: 'bg-emerald-600 text-white' },
                              { s: 'fail', label: 'Fail', activeCls: 'bg-rose-600 text-white' },
                              { s: 'pending', label: 'Pending', activeCls: 'bg-amber-500 text-white' },
                              { s: 'variance', label: 'Variance', activeCls: 'bg-purple-600 text-white' },
                              { s: 'na', label: 'N/A', activeCls: 'bg-slate-600 text-white' },
                            ] as const
                          ).map((btn) => (
                            <button
                              key={btn.s}
                              type="button"
                              onClick={() => handleItemStatusChange(item, btn.s)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                item.status === btn.s
                                  ? `${btn.activeCls} shadow-sm`
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              }`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            title="Edit Checklist Item"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-civic-700 hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(item)}
                            title="Delete Checklist Item"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: SIDE-BY-SIDE ORDINANCE COMPARISON & ENGINEERING DIAGRAMS    */}
      {/* ================================================================= */}
      {activeTab === 'comparison' && evaluation && (
        <div className="space-y-6">
          {/* Quick link to Uploaded Applicant Construction Site Plan if on file */}
          {sitePlans.length > 0 ? (
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-civic-700 flex items-center justify-center shrink-0">
                  <Map className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Applicant Site Plan Attached: {sitePlans[0].title} ({sitePlans[0].revision_label})
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {sitePlans.length} uploaded construction drawing{sitePlans.length === 1 ? '' : 's'} on file for verification against Independence bulk setbacks
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('site_plans')}
                  className="px-3 py-1.5 rounded-lg bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm"
                >
                  Inspect Uploaded Site Plan
                </button>
                <a
                  href={getSitePlanFileUrl(sitePlans[0].id, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-sky-300 bg-white hover:bg-sky-50 text-sky-900 text-xs font-semibold"
                >
                  Open Side-by-Side
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100/80 border border-dashed border-slate-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 no-print">
              <span className="text-xs text-slate-600">
                Have a PDF, CAD plot, or hand-drawn parcel sketch from the applicant?
              </span>
              <button
                type="button"
                onClick={() => {
                  setAutoOpenSitePlanUploader(true);
                  setActiveTab('site_plans');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-civic-700 shrink-0"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Construction Site Plan
              </button>
            </div>
          )}

          {/* Live Engineering Diagrams Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SitePlanDiagram measurements={project} />
            <FloodplainCrossSection measurements={project} />
          </div>

          {/* Quick Actionable Remedies Banner if Violations Exist */}
          {evaluation.fail_count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    {evaluation.fail_count} Ordinance Conflict
                    {evaluation.fail_count === 1 ? '' : 's'} Detected ({evaluation.effective_bulk_district})
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Apply a one-click filing update below when documents arrive, or edit parcel measurements.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {project.includes_fence &&
                  project.fence_property_line_setback_ft >= 0 &&
                  project.fence_property_line_setback_ft < 3.0 &&
                  !project.has_neighbor_fence_agreement && (
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPatchProject(
                          { has_neighbor_fence_agreement: true },
                          'Recorded signed Neighbor Fence Agreement (IMC § 152.02)!'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm"
                    >
                      Mark Neighbor Fence Agreement Filed
                    </button>
                  )}

                {(project.flood_zone === 'AE' ||
                  project.flood_zone === 'A' ||
                  project.flood_zone === 'FLOODWAY') &&
                  !project.has_floodplain_permit && (
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPatchProject(
                          { has_floodplain_permit: true },
                          'Recorded Floodplain Development Permit (§ 4.05)!'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold shadow-sm"
                    >
                      Record Floodplain Permit
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => onEditProject(project)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Adjust Plan Dimensions
                </button>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Automated Independence Ordinance Comparison Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Effective Bulk Standard: <strong>{evaluation.effective_bulk_district}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {evaluation.pass_count} Pass
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {evaluation.fail_count} Fail
                </span>
                {evaluation.warning_count > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {evaluation.warning_count} Advisory
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Ordinance &amp; Section</th>
                    <th className="py-3 px-4">Rule / Parameter</th>
                    <th className="py-3 px-4">Independence Code Requirement</th>
                    <th className="py-3 px-4">Applicant Proposed</th>
                    <th className="py-3 px-4">Verdict / Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {evaluation.checks.map((chk) => {
                    const catMeta = CATEGORY_META[chk.category];
                    return (
                      <tr
                        key={chk.rule_key}
                        className={
                          chk.verdict === 'fail'
                            ? 'bg-rose-50/40'
                            : chk.verdict === 'na'
                              ? 'opacity-60'
                              : 'hover:bg-slate-50/80'
                        }
                      >
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1 ${catMeta.pillClass}`}
                          >
                            {catMeta.shortLabel}
                          </span>
                          <div className="font-mono text-[11px] text-slate-600">
                            {chk.code_citation}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">{chk.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                            {chk.explanation}
                          </div>
                          {chk.remedy && (
                            <div className="mt-1 text-[11px] font-semibold text-rose-700 max-w-xs">
                              Remedy: {chk.remedy}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top font-medium text-slate-700 max-w-xs">
                          {chk.ordinance_standard}
                        </td>
                        <td className="py-3.5 px-4 align-top font-semibold text-slate-900 tabular-nums">
                          {chk.proposed_display}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap tabular-nums">
                          {chk.verdict === 'pass' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          ) : chk.verdict === 'fail' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          ) : chk.verdict === 'warning' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
                              {chk.delta_display}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: CONSTRUCTION SITE PLANS & SUBMITTAL DRAWINGS               */}
      {/* ================================================================= */}
      {activeTab === 'site_plans' && (
        <SitePlansPanel
          projectId={project.id}
          propertyAddress={project.property_address}
          sitePlans={sitePlans}
          autoOpenUploader={autoOpenSitePlanUploader}
          onSitePlansChanged={(nextPlans) => {
            setSitePlans(nextPlans);
            onProjectUpdated();
          }}
        />
      )}

      {/* ================================================================= */}
      {/* TAB 4: INSPECTION LOG & CONDITIONS OF APPROVAL (FULL CRUD)         */}
      {/* ================================================================= */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Note Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit no-print">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <MessageSquarePlus className="w-4 h-4 text-civic-600" />
              Log Field Inspection or Condition
            </h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Classification
                </label>
                <select
                  value={newNoteType}
                  onChange={(e) =>
                    setNewNoteType(e.target.value as InspectionNote['note_type'])
                  }
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                >
                  <option value="inspection">Field Inspection Note</option>
                  <option value="correction">Plan Correction Required</option>
                  <option value="condition">Condition of Approval</option>
                  <option value="general">General Staff / Applicant Note</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Findings
                </label>
                <textarea
                  rows={4}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record site measurements, stakeout checks, FEMA Elevation Certificate notes, or Neighbor Fence Agreement status..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Post Official Review Note
              </button>
            </form>
          </div>

          {/* Notes Feed */}
          <div className="lg:col-span-2 space-y-3">
            {notes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No Inspection Notes Logged</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Use the form to record site inspection observations, variance dockets, or conditions of permit approval.
                </p>
              </div>
            ) : (
              notes.map((n) => {
                const badgeMap: Record<InspectionNote['note_type'], { label: string; cls: string }> =
                  {
                    inspection: {
                      label: 'Field Inspection',
                      cls: 'bg-blue-50 text-blue-700 border-blue-200',
                    },
                    correction: {
                      label: 'Correction Required',
                      cls: 'bg-rose-50 text-rose-700 border-rose-200',
                    },
                    condition: {
                      label: 'Condition of Approval',
                      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    },
                    general: {
                      label: 'General Note',
                      cls: 'bg-slate-100 text-slate-700 border-slate-200',
                    },
                  };
                const meta = badgeMap[n.note_type] || badgeMap.general;

                return (
                  <div
                    key={n.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{n.author_name}</span>
                        <span className="text-xs text-slate-500">&middot; {n.author_role}</span>
                        <span className="text-xs text-slate-400">
                          &middot; {formatDateShort(n.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 no-print">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditingNoteContent(n.content);
                            setEditingNoteType(n.note_type);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-civic-700 hover:bg-slate-100"
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {editingNoteId === n.id ? (
                      <div className="mt-3 space-y-2">
                        <select
                          value={editingNoteType}
                          onChange={(e) =>
                            setEditingNoteType(e.target.value as InspectionNote['note_type'])
                          }
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                        >
                          <option value="inspection">Field Inspection</option>
                          <option value="correction">Correction Required</option>
                          <option value="condition">Condition of Approval</option>
                          <option value="general">General Note</option>
                        </select>
                        <textarea
                          rows={3}
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-civic-400 focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateNote(n.id)}
                            className="px-3 py-1.5 rounded-lg bg-civic-700 text-white text-xs font-semibold"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {n.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal for Adding / Editing a Checklist Item */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Checklist Requirement' : 'Add Custom Checklist Requirement'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveItemModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordinance Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as OrdinanceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="zoning">Planning &amp; Zoning (Art. 1–5)</option>
                    <option value="floodplain">Flood Plain (IMC Ch. 167)</option>
                    <option value="fence">Fence Ordinance (IMC Ch. 152)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={itemPriority}
                    onChange={(e) => setItemPriority(e.target.value as ChecklistPriority)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="standard">Standard</option>
                    <option value="advisory">Advisory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Code Section Citation
                </label>
                <input
                  type="text"
                  value={itemCitation}
                  onChange={(e) => setItemCitation(e.target.value)}
                  placeholder="e.g., IMC § 152.02 or Zoning § 3.14"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Checklist Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g., Verify 200-ft Block Front-Yard Setback Average"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ordinance Standard
                </label>
                <input
                  type="text"
                  value={itemReq}
                  onChange={(e) => setItemReq(e.target.value)}
                  placeholder="e.g., Average front setback of developed lots within 200 ft (max 50 ft)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicant Proposed / Field Measurement
                </label>
                <input
                  type="text"
                  value={itemProposed}
                  onChange={(e) => setItemProposed(e.target.value)}
                  placeholder="e.g., 28.5 ft staked from front property pins"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspector Notes
                </label>
                <textarea
                  rows={2}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
