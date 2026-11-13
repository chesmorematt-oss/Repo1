import React from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  Waves,
  Fence,
  CheckCircle2,
  ArrowRight,
  Scale,
  BookOpen,
  Plus,
  Building2,
  FileWarning,
} from 'lucide-react';
import type { Project } from '../types';
import { PROJECT_STATUS_META, formatDateShort } from '../lib/format';
import type { NavTab } from './Layout';
import { IndependenceLogo } from './IndependenceLogo';

interface DashboardViewProps {
  projects: Project[];
  loading: boolean;
  onSelectProject: (id: number) => void;
  onNavigate: (tab: NavTab) => void;
  onNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  loading,
  onSelectProject,
  onNavigate,
  onNewProject,
}) => {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-80 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 p-5" />
          ))}
        </div>
        <div className="h-80 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const totalProjects = projects.length;
  const actionNeeded = projects.filter(
    (p) => p.status === 'corrections_required' || p.status === 'variance_needed'
  );
  const sfhaProjects = projects.filter(
    (p) => p.flood_zone === 'A' || p.flood_zone === 'AE' || p.flood_zone === 'FLOODWAY'
  );
  const fenceProjects = projects.filter((p) => p.includes_fence);
  const approvedCount = projects.filter((p) => p.status === 'approved').length;

  const totalChecks = projects.reduce((acc, p) => acc + (p.checklist_total || 0), 0);
  const totalPassed = projects.reduce((acc, p) => acc + (p.checklist_passed || 0), 0);
  const totalFailed = projects.reduce((acc, p) => acc + (p.checklist_failed || 0), 0);
  const passRate = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="shrink-0 pb-2 sm:pb-0 sm:pr-5 sm:border-r border-slate-200">
            <IndependenceLogo size="lg" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Compliance &amp; Permit Review Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Unified checklist tracking across the Independence Zoning Ordinance (Art. 1–5),
              Floodplain Management (IMC Ch. 167), and Fence Code (IMC Ch. 152).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('comparator')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-semibold shadow-sm transition-colors"
          >
            <Scale className="w-4 h-4 text-civic-600" />
            Counter Comparator
          </button>
          <button
            type="button"
            onClick={onNewProject}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Permit Review
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-civic-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Permit Files
            </span>
            <div className="w-9 h-9 rounded-xl bg-civic-50 text-civic-700 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-3xl font-bold text-slate-900">{totalProjects}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {approvedCount} approved
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 group-hover:text-civic-700">
            <span>{passRate}% checklist items passing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-amber-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ordinance Conflicts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-3xl font-bold text-slate-900">{actionNeeded.length}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              {totalFailed} failing items
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Corrections or BOA Variance (§ 20.07) needed
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-cyan-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Wapsipinicon SFHA
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Waves className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-3xl font-bold text-slate-900">{sfhaProjects.length}</span>
            <span className="text-xs font-medium text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full">
              Zones A / AE / Floodway
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Subject to IMC Ch. 167 &amp; Art. 4 freeboard
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-teal-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ch. 152 Fence Reviews
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Fence className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-3xl font-bold text-slate-900">{fenceProjects.length}</span>
            <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
              {fenceProjects.filter((p) => p.has_neighbor_fence_agreement).length} Neighbor Agmts
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Height, 20&apos; corner sight &amp; 3&apos; lot-line checks
          </div>
        </button>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Priority Review Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Independence Permit Checklists
              </h2>
              <p className="text-xs text-slate-500">
                Click any parcel review to inspect side-by-side ordinance comparisons &amp; update checklist items
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-civic-700 hover:text-civic-800 inline-flex items-center gap-1"
            >
              View All ({projects.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">No Permit Checklists Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Start a Zoning, Floodplain, or Fence permit checklist for any parcel in Independence, IA.
              </p>
              <button
                type="button"
                onClick={onNewProject}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-civic-700 text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Create First Permit Review
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.slice(0, 6).map((p) => {
                const statusMeta = PROJECT_STATUS_META[p.status] || PROJECT_STATUS_META.in_review;
                const total = p.checklist_total || 1;
                const passed = p.checklist_passed || 0;
                const failed = p.checklist_failed || 0;
                const pct = Math.round((passed / Math.max(1, total)) * 100);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-civic-700">
                          {p.permit_number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                          {statusMeta.label}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.zoning_district}
                        </span>
                        {(p.flood_zone === 'AE' ||
                          p.flood_zone === 'A' ||
                          p.flood_zone === 'FLOODWAY') && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                            FEMA {p.flood_zone}
                          </span>
                        )}
                        {p.includes_fence && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            Fence Ch. 152
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
                        {p.property_address} &mdash; {p.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Applicant: {p.applicant_name}</span>
                        {p.parcel_pin && <span>PIN: {p.parcel_pin}</span>}
                        <span>{p.ward}</span>
                        <span>Updated {formatDateShort(p.updated_at)}</span>
                      </div>
                    </div>

                    <div className="sm:w-44 shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1.5 tabular-nums">
                      <div className="flex items-center gap-2 text-xs">
                        {failed > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <FileWarning className="w-3.5 h-3.5" />
                            {failed} violation{failed === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {passed}/{total} compliant
                          </span>
                        )}
                      </div>
                      <div className="w-28 sm:w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        {failed > 0 && (
                          <div
                            className="bg-rose-500 h-full transition-all"
                            style={{
                              width: `${Math.round((failed / Math.max(1, total)) * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Independence Ordinance Comparison Highlights */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              3-Ordinance Cross-Check Coverage
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  1. Zoning Ordinance (Ch. 170 / Art. 1–5)
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Compares lot area, width, front/side/rear/corner setbacks (Table 1), R/C-1 hybrid
                  rules, 15&apos; commercial-to-R buffers (Note 2), &amp; 18&apos; accessory caps.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-950">
                  <Waves className="w-4 h-4 text-cyan-700" />
                  2. Flood Plain Ordinance (IMC Ch. 167 &amp; Art. 4)
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Checks Wapsipinicon FIRM Zone, BFE + 1.0&apos; lowest floor, § 4.02.14(c) BFE +
                  3.0&apos; enclosed HVAC rule, 50% substantial improvement, &amp; 92 FEMA buyout lots.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-950">
                  <Fence className="w-4 h-4 text-teal-700" />
                  3. Fence Ordinance (IMC Ch. 152 &amp; §§ 1.04.44–45)
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Verifies 4&apos;0&quot; front / 6&apos;6&quot; side-rear max height, 20&apos;&times;20&apos; corner sight
                  triangle (&le;3&apos;0&quot;), 3&apos;0&quot; lot-line setback or Neighbor Fence Agreement, &amp; banned
                  sheet metal/salvage.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('comparator')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                Run Comparator
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ordinances')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Browse Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
