import React, { useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode2,
  Plus,
} from 'lucide-react';
import type { SitePlanDocument, SitePlanType } from '../types';
import { formatDateShort, formatFileSize, SITE_PLAN_TYPE_META } from '../lib/format';
import { apiFetch, getSitePlanFileUrl, uploadSitePlanFile } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface SitePlansPanelProps {
  projectId: number;
  propertyAddress: string;
  sitePlans: SitePlanDocument[];
  onSitePlansChanged: (nextPlans: SitePlanDocument[]) => void;
  autoOpenUploader?: boolean;
}

export const SitePlansPanel: React.FC<SitePlansPanelProps> = ({
  projectId,
  propertyAddress,
  sitePlans,
  onSitePlansChanged,
  autoOpenUploader = false,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    sitePlans[0]?.id ?? null
  );
  const [zoomPct, setZoomPct] = useState<number | 'fit'>('fit');

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState<boolean>(
    autoOpenUploader || sitePlans.length === 0
  );
  const [dragActive, setDragActive] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [planType, setPlanType] = useState<SitePlanType>('construction_site_plan');
  const [title, setTitle] = useState('');
  const [revisionLabel, setRevisionLabel] = useState(
    `Rev ${Math.max(1, sitePlans.length + 1)}`
  );
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Metadata inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<SitePlanType>('construction_site_plan');
  const [editRev, setEditRev] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (autoOpenUploader) {
      setShowUploadForm(true);
    }
  }, [autoOpenUploader]);

  useEffect(() => {
    if (sitePlans.length === 0) {
      setSelectedPlanId(null);
    } else if (!sitePlans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(sitePlans[0].id);
    }
  }, [sitePlans, selectedPlanId]);

  const handleChooseFile = (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showToast('Site plan file exceeds the 25 MB maximum upload size.', 'error');
      return;
    }
    setPendingFile(file);
    setShowUploadForm(true);
    if (!title.trim()) {
      const cleanBase = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle(cleanBase || `${propertyAddress} — Construction Site Plan`);
    }
    setRevisionLabel(`Rev ${sitePlans.length + 1}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      handleChooseFile(dropped);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) {
      showToast('Select a Construction Site Plan file to upload first.', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadSitePlanFile<{ sitePlan: SitePlanDocument }>(
        projectId,
        pendingFile,
        {
          title: title.trim() || `${propertyAddress} — Construction Site Plan`,
          plan_type: planType,
          revision_label: revisionLabel.trim() || 'Rev 1',
          notes: notes.trim(),
        }
      );
      const next = [res.sitePlan, ...sitePlans];
      onSitePlansChanged(next);
      setSelectedPlanId(res.sitePlan.id);
      setPendingFile(null);
      setTitle('');
      setNotes('');
      setShowUploadForm(false);
      showToast(`Uploaded "${res.sitePlan.title}" to permit record.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload site plan.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const startEditPlan = (plan: SitePlanDocument) => {
    setEditingId(plan.id);
    setEditTitle(plan.title);
    setEditType(plan.plan_type);
    setEditRev(plan.revision_label);
    setEditNotes(plan.notes);
  };

  const handleSaveEdit = async (planId: number) => {
    try {
      const res = await apiFetch<{ sitePlan: SitePlanDocument }>(`/api/site-plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          plan_type: editType,
          revision_label: editRev,
          notes: editNotes,
        }),
      });
      onSitePlansChanged(sitePlans.map((p) => (p.id === planId ? res.sitePlan : p)));
      setEditingId(null);
      showToast('Site plan details updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    const prev = [...sitePlans];
    const next = sitePlans.filter((p) => p.id !== planId);
    onSitePlansChanged(next);
    setConfirmDeleteId(null);
    try {
      await apiFetch(`/api/site-plans/${planId}`, { method: 'DELETE' });
      showToast('Site plan removed from permit.', 'info');
    } catch (err) {
      onSitePlansChanged(prev);
      showToast(err instanceof Error ? err.message : 'Failed to delete site plan.', 'error');
    }
  };

  const selectedPlan = sitePlans.find((p) => p.id === selectedPlanId) || null;
  const isImagePlan = (mime: string) =>
    mime.startsWith('image/') && mime !== 'image/tiff';
  const isPdfPlan = (mime: string) => mime === 'application/pdf';

  return (
    <div className="space-y-5">
      {/* Top Action / Upload Toggle Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Construction Site Plans &amp; Submittal Drawings
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Attach dimensioned parcel site plans, boundary surveys, FEMA elevation certificates,
              or fence layout sketches (PDF, PNG, JPG, WEBP, SVG, TIFF, DWG, DXF &mdash; up to 25 MB).
            </p>
          </div>
          {!showUploadForm && (
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload Construction Site Plan
            </button>
          )}
        </div>

        {/* Expandable Drag & Drop Upload Form */}
        {showUploadForm && (
          <form onSubmit={handleUploadSubmit} className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.tif,.tiff,.dwg,.dxf"
              className="hidden"
              onChange={(e) => handleChooseFile(e.target.files?.[0])}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive
                  ? 'border-civic-600 bg-civic-50/70'
                  : pendingFile
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-civic-500 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-2.5 text-civic-700">
                <UploadCloud className="w-5 h-5" />
              </div>
              {pendingFile ? (
                <div className="space-y-1">
                  <div className="text-sm font-bold text-emerald-900">
                    Selected: {pendingFile.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {formatFileSize(pendingFile.size)} &middot; Click or drop another file to replace
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">
                    Drag &amp; drop a Construction Site Plan here, or{' '}
                    <span className="text-civic-700 underline">browse computer</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Supports PDF blueprints, PNG / JPG / SVG site drawings, TIFF scans, and AutoCAD DWG / DXF (max 25 MB)
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sheet / Drawing Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${propertyAddress} — Construction Site Plan`}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submittal Classification
                </label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as SitePlanType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
                >
                  {(Object.keys(SITE_PLAN_TYPE_META) as SitePlanType[]).map((k) => (
                    <option key={k} value={k}>
                      {SITE_PLAN_TYPE_META[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revision / Sheet #
                </label>
                <input
                  type="text"
                  value={revisionLabel}
                  onChange={(e) => setRevisionLabel(e.target.value)}
                  placeholder="Rev 1 / C-101"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                />
              </div>

              <div className="sm:col-span-12">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submittal Notes (Optional — scale, surveyor, setback callouts, 811 locate notes)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., 1&quot; = 20' scale; shows 28' front yard setback, driveway, and 6' privacy fence 3' off lot line"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {sitePlans.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setPendingFile(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!pendingFile || uploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                {uploading ? 'Uploading Site Plan...' : 'Save & Attach Site Plan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Uploaded Plans List + Interactive Preview */}
      {sitePlans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Plan Submittal List */}
          <div className="lg:col-span-4 space-y-2.5 no-print">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Attached Drawings ({sitePlans.length})
            </div>
            {sitePlans.map((plan) => {
              const active = plan.id === selectedPlanId;
              const meta =
                SITE_PLAN_TYPE_META[plan.plan_type] || SITE_PLAN_TYPE_META.construction_site_plan;

              if (editingId === plan.id) {
                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl border-2 border-civic-500 p-3.5 space-y-2.5 shadow-sm"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300"
                      placeholder="Drawing title"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as SitePlanType)}
                        className="px-2 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      >
                        {(Object.keys(SITE_PLAN_TYPE_META) as SitePlanType[]).map((k) => (
                          <option key={k} value={k}>
                            {SITE_PLAN_TYPE_META[k].shortLabel}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editRev}
                        onChange={(e) => setEditRev(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded border border-slate-300"
                        placeholder="Rev 1"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                      placeholder="Notes"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(plan.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-civic-700 text-white text-xs font-semibold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    active
                      ? 'bg-white border-civic-600 ring-2 ring-civic-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}
                      >
                        {meta.shortLabel}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {plan.revision_label}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => startEditPlan(plan)}
                        title="Edit Drawing Metadata"
                        className="p-1 rounded text-slate-400 hover:text-civic-700 hover:bg-slate-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === plan.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(plan.id)}
                          title="Delete Site Plan"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-start gap-2">
                    {isPdfPlan(plan.mime_type) ? (
                      <FileText className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : isImagePlan(plan.mime_type) ? (
                      <ImageIcon className="w-4 h-4 text-civic-600 shrink-0 mt-0.5" />
                    ) : (
                      <FileCode2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {plan.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {plan.original_filename} &middot; {formatFileSize(plan.file_size)}
                      </div>
                    </div>
                  </div>

                  {plan.notes && (
                    <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 leading-relaxed">
                      {plan.notes}
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>By {plan.uploaded_by}</span>
                    <span>{formatDateShort(plan.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Live Site Plan Viewer */}
          <div className="lg:col-span-8">
            {selectedPlan && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Viewer Toolbar */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedPlan.title}{' '}
                      <span className="ml-1 font-mono text-[11px] text-civic-700">
                        ({selectedPlan.revision_label})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedPlan.original_filename} &middot;{' '}
                      {formatFileSize(selectedPlan.file_size)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 no-print">
                    {isImagePlan(selectedPlan.mime_type) && (
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setZoomPct('fit')}
                          className={`px-2 py-1 rounded text-[11px] font-semibold ${
                            zoomPct === 'fit'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setZoomPct((z) =>
                              z === 'fit' ? 100 : Math.max(50, z - 25)
                            )
                          }
                          title="Zoom Out"
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1.5 text-[11px] font-mono text-slate-700">
                          {zoomPct === 'fit' ? 'Auto' : `${zoomPct}%`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setZoomPct((z) =>
                              z === 'fit' ? 125 : Math.min(250, z + 25)
                            )
                          }
                          title="Zoom In"
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <a
                      href={getSitePlanFileUrl(selectedPlan.id, false)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                      title="Open in Full Browser Tab"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Full Screen</span>
                    </a>

                    <a
                      href={getSitePlanFileUrl(selectedPlan.id, true)}
                      download={selectedPlan.original_filename}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>

                {/* Preview Body */}
                <div className="bg-slate-100/80 p-4 overflow-auto max-h-[680px] flex items-center justify-center">
                  {isImagePlan(selectedPlan.mime_type) ? (
                    <img
                      src={getSitePlanFileUrl(selectedPlan.id, false)}
                      alt={selectedPlan.title}
                      style={
                        zoomPct === 'fit'
                          ? { maxWidth: '100%', height: 'auto' }
                          : { width: `${zoomPct}%`, maxWidth: 'none', height: 'auto' }
                      }
                      className="rounded-lg shadow-sm bg-white border border-slate-200"
                    />
                  ) : isPdfPlan(selectedPlan.mime_type) ? (
                    <iframe
                      src={getSitePlanFileUrl(selectedPlan.id, false)}
                      title={selectedPlan.title}
                      className="w-full h-[620px] rounded-lg border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="py-16 px-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <FileCode2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        CAD / High-Res Engineering File ({selectedPlan.original_filename})
                      </div>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Download this drawing file to open directly in AutoCAD, Civil 3D, QGIS, or
                        your desktop CAD viewer.
                      </p>
                      <a
                        href={getSitePlanFileUrl(selectedPlan.id, true)}
                        download={selectedPlan.original_filename}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        Download {selectedPlan.original_filename} (
                        {formatFileSize(selectedPlan.file_size)})
                      </a>
                    </div>
                  )}
                </div>

                {selectedPlan.notes && (
                  <div className="px-4 py-2.5 border-t border-slate-200 bg-white text-xs text-slate-600 flex items-center justify-between gap-2">
                    <span>
                      <strong className="text-slate-800">Submittal Note:</strong>{' '}
                      {selectedPlan.notes}
                    </span>
                    <a
                      href={getSitePlanFileUrl(selectedPlan.id, false)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-civic-700 font-semibold hover:underline inline-flex items-center gap-1 no-print"
                    >
                      Open Original
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
