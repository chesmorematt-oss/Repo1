import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Copy,
  Trash2,
  Edit3,
  ExternalLink,
  Filter,
  RotateCcw,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Map,
} from 'lucide-react';
import type { Project, ProjectStatus } from '../types';
import { PROJECT_STATUS_META, ZONING_DISTRICTS, formatDateShort } from '../lib/format';

interface ProjectsListViewProps {
  projects: Project[];
  loading: boolean;
  onSelectProject: (id: number) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDuplicateProject: (project: Project) => Promise<void>;
  onDeleteProject: (project: Project) => Promise<void>;
  onQuickStatusChange: (project: Project, nextStatus: ProjectStatus) => Promise<void>;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  loading,
  onSelectProject,
  onNewProject,
  onEditProject,
  onDuplicateProject,
  onDeleteProject,
  onQuickStatusChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'sfha' | 'fence'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (districtFilter !== 'all' && p.zoning_district !== districtFilter) return false;
      if (
        scopeFilter === 'sfha' &&
        p.flood_zone !== 'A' &&
        p.flood_zone !== 'AE' &&
        p.flood_zone !== 'FLOODWAY'
      ) {
        return false;
      }
      if (scopeFilter === 'fence' && !p.includes_fence) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${p.permit_number} ${p.title} ${p.property_address} ${p.parcel_pin} ${p.applicant_name} ${p.ward}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter, districtFilter, scopeFilter]);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    districtFilter !== 'all' ||
    scopeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Permit &amp; Ordinance Checklists
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage Independence, IA parcel reviews across Zoning, Floodplain (Ch. 167), and Fence (Ch. 152) codes
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Permit Checklist
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address, PIN, permit #, or applicant..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by review status"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
            >
              <option value="all">All Review Statuses</option>
              <option value="in_review">In Review</option>
              <option value="corrections_required">Corrections Required</option>
              <option value="variance_needed">BOA Variance Needed</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              aria-label="Filter by zoning district"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
            >
              <option value="all">All Districts</option>
              {ZONING_DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.value}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | 'sfha' | 'fence')}
              aria-label="Filter by ordinance scope"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
            >
              <option value="all">All Scopes</option>
              <option value="sfha">Floodplain SFHA</option>
              <option value="fence">Includes Fence</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-civic-600" />
              Showing <strong>{filtered.length}</strong> of {projects.length} permit checklists
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setDistrictFilter('all');
                setScopeFilter('all');
              }}
              className="inline-flex items-center gap-1 text-civic-700 hover:text-civic-800 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {hasActiveFilters ? 'No Matching Permit Checklists' : 'No Permit Checklists Created Yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Try clearing your search query or adjusting the Zoning District / Floodplain filters.'
              : 'Create your first Independence, IA permit review to automatically evaluate setbacks, floodplain elevations, and fence rules.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setDistrictFilter('all');
                  setScopeFilter('all');
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear All Filters
              </button>
            )}
            <button
              type="button"
              onClick={onNewProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-civic-700 text-white text-xs font-semibold hover:bg-civic-800"
            >
              <Plus className="w-4 h-4" />
              New Permit Checklist
            </button>
          </div>
        </div>
      ) : (
        /* Project Cards List */
        <div className="space-y-3">
          {filtered.map((p) => {
            const statusMeta = PROJECT_STATUS_META[p.status] || PROJECT_STATUS_META.in_review;
            const total = p.checklist_total || 1;
            const passed = p.checklist_passed || 0;
            const failed = p.checklist_failed || 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-civic-300 transition-all shadow-sm p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProject(p.id)}
                        className="font-mono text-xs font-bold text-civic-700 hover:underline"
                      >
                        {p.permit_number}
                      </button>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        {p.zoning_district}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          p.flood_zone === 'FLOODWAY' || p.flood_zone === 'AE' || p.flood_zone === 'A'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        FEMA Zone {p.flood_zone}
                      </span>
                      {p.includes_fence && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          Fence ({p.fence_side_rear_height_ft || p.fence_front_height_ft}&apos; {p.fence_material.replace('_', ' ')})
                        </span>
                      )}
                      {p.is_corner_lot && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Corner Lot
                        </span>
                      )}
                      {(p.site_plan_count ?? 0) > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                          <Map className="w-3 h-3" />
                          {p.site_plan_count} Site Plan{p.site_plan_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className="mt-1.5 block text-left group"
                    >
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-civic-700 transition-colors">
                        {p.property_address} &mdash; {p.title}
                      </h3>
                    </button>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span>
                        Applicant: <strong className="text-slate-700">{p.applicant_name}</strong>
                      </span>
                      {p.parcel_pin && <span>PIN: {p.parcel_pin}</span>}
                      <span>{p.ward}</span>
                      <span>Reviewer: {p.assigned_to}</span>
                      <span>Updated {formatDateShort(p.updated_at)}</span>
                    </div>
                  </div>

                  {/* Right Status, Progress & CRUD Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      {/* Optimistic Quick Status Select */}
                      <select
                        value={p.status}
                        onChange={(e) =>
                          onQuickStatusChange(p, e.target.value as ProjectStatus)
                        }
                        aria-label={`Status for ${p.permit_number}`}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-civic-500 ${statusMeta.badgeClass}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="in_review">In Review</option>
                        <option value="corrections_required">Corrections Required</option>
                        <option value="variance_needed">BOA Variance Needed</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onSelectProject(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold transition-colors"
                      >
                        Open Checklist
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-xs tabular-nums flex items-center gap-1.5">
                        {failed > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {failed} failing / {passed} pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {passed}/{total} passed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button
                          type="button"
                          onClick={() => onEditProject(p)}
                          title="Edit Parcel & Measurements"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-civic-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateProject(p)}
                          title="Duplicate Permit Checklist"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-civic-700 hover:bg-slate-100 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === p.id ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-0.5">
                            <button
                              type="button"
                              onClick={async () => {
                                setConfirmDeleteId(null);
                                await onDeleteProject(p);
                              }}
                              className="text-[11px] font-bold text-rose-700 hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] text-slate-500 hover:text-slate-700 ml-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            title="Delete Permit Review"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
