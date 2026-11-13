import React, { useRef, useState } from 'react';
import { X, MapPin, Building2, Waves, Fence, Check, UploadCloud, Trash2, FileText } from 'lucide-react';
import type {
  FenceMaterial,
  FenceYardLocation,
  FloodZone,
  LandUseType,
  Project,
  ProjectMeasurements,
  ProjectStatus,
  ZoningDistrict,
} from '../types';
import {
  DEFAULT_MEASUREMENTS,
  FENCE_MATERIALS,
  FLOOD_ZONES,
  formatFileSize,
  LAND_USE_OPTIONS,
  ZONING_DISTRICTS,
} from '../lib/format';

interface ProjectFormModalProps {
  editingProject?: Project | null;
  initialMeasurements?: ProjectMeasurements | null;
  onClose: () => void;
  onSave: (
    payload: Record<string, unknown>,
    isEdit: boolean,
    id?: number,
    sitePlanFiles?: File[]
  ) => Promise<void>;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  editingProject,
  initialMeasurements,
  onClose,
  onSave,
}) => {
  const isEdit = Boolean(editingProject);
  const baseM: ProjectMeasurements = editingProject
    ? editingProject
    : initialMeasurements || DEFAULT_MEASUREMENTS;

  const [tab, setTab] = useState<'parcel' | 'zoning' | 'floodplain' | 'fence'>('parcel');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parcel & Applicant fields
  const [title, setTitle] = useState(editingProject?.title || '');
  const [propertyAddress, setPropertyAddress] = useState(
    editingProject?.property_address || ''
  );
  const [parcelPin, setParcelPin] = useState(editingProject?.parcel_pin || '');
  const [ward, setWard] = useState(editingProject?.ward || 'Ward 1');
  const [applicantName, setApplicantName] = useState(editingProject?.applicant_name || '');
  const [applicantEmail, setApplicantEmail] = useState(editingProject?.applicant_email || '');
  const [applicantPhone, setApplicantPhone] = useState(editingProject?.applicant_phone || '');
  const [description, setDescription] = useState(editingProject?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(editingProject?.status || 'in_review');
  const [assignedTo, setAssignedTo] = useState(
    editingProject?.assigned_to || 'Planning & Zoning Staff'
  );

  // Measurements state
  const [m, setM] = useState<ProjectMeasurements>({ ...baseM });

  // Optional Construction Site Plan attachment(s)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sitePlanFiles, setSitePlanFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const addSitePlanFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid: File[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > 25 * 1024 * 1024) {
        setError(`"${f.name}" exceeds the 25 MB maximum upload size.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) {
      setSitePlanFiles((prev) => [...prev, ...valid]);
    }
  };

  const updateM = <K extends keyof ProjectMeasurements>(key: K, val: ProjectMeasurements[K]) => {
    setM((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !propertyAddress.trim() || !applicantName.trim()) {
      setTab('parcel');
      setError('Project title, property address, and applicant name are required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          property_address: propertyAddress.trim(),
          parcel_pin: parcelPin.trim(),
          ward,
          applicant_name: applicantName.trim(),
          applicant_email: applicantEmail.trim(),
          applicant_phone: applicantPhone.trim(),
          description: description.trim(),
          status,
          assigned_to: assignedTo.trim(),
          ...m,
          auto_sync_checklist: true,
        },
        isEdit,
        editingProject?.id,
        sitePlanFiles
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permit review.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'parcel' as const, label: '1. Parcel & Applicant', icon: MapPin },
    { id: 'zoning' as const, label: '2. Zoning & Bulk', icon: Building2 },
    { id: 'floodplain' as const, label: '3. Floodplain (Ch. 167)', icon: Waves },
    { id: 'fence' as const, label: '4. Fence (Ch. 152)', icon: Fence },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit
                ? `Edit ${editingProject?.permit_number} — Measurements & Scope`
                : 'New Independence Permit & Ordinance Checklist'}
            </h2>
            <p className="text-xs text-slate-500">
              Checklist items automatically synchronize with Independence Zoning, Floodplain &amp; Fence ordinances
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step / Section Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex overflow-x-auto gap-1 shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-civic-700 text-civic-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {tab === 'parcel' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project / Application Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Rear Addition, Detached Garage & 6'0&quot; Cedar Fence"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Independence Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="e.g., 514 2nd Ave NE, Independence, IA 50644"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buchanan County Parcel PIN
                  </label>
                  <input
                    type="text"
                    value={parcelPin}
                    onChange={(e) => setParcelPin(e.target.value)}
                    placeholder="06.34.278.019"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City Council Ward
                  </label>
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
                  >
                    <option value="Ward 1">Ward 1 (Downtown / Central)</option>
                    <option value="Ward 2">Ward 2 (East &amp; North of Wapsipinicon)</option>
                    <option value="Ward 3">Ward 3 (Southeast / Enterprise Corridor)</option>
                    <option value="Ward 4">Ward 4 (Southwest)</option>
                    <option value="Ward 5">Ward 5 (Northwest / West Wapsi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicant / Property Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Property Owner or Contractor LLC"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicant Phone
                  </label>
                  <input
                    type="text"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="(319) 334-0000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicant Email
                  </label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned City Reviewer
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workflow Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="corrections_required">Corrections Required</option>
                    <option value="variance_needed">BOA Variance Needed</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scope of Work Summary
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe proposed construction, grading, floodplain conditions, and fence details..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                  />
                </div>

                {/* Construction Site Plan Upload Box */}
                <div className="sm:col-span-2 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Construction Site Plan / Submittal Drawing (Optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.tif,.tiff,.dwg,.dxf"
                    className="hidden"
                    onChange={(e) => addSitePlanFiles(e.target.files)}
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      addSitePlanFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                      dragActive
                        ? 'border-civic-600 bg-civic-50/70'
                        : 'border-slate-300 hover:border-civic-500 bg-slate-50/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-800">
                      <UploadCloud className="w-4 h-4 text-civic-700" />
                      <span>
                        Drag &amp; drop Construction Site Plan here or{' '}
                        <span className="text-civic-700 underline">browse files</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      PDF, PNG, JPG, WEBP, SVG, TIFF, DWG, or DXF (up to 25 MB per sheet)
                    </div>
                  </div>

                  {sitePlanFiles.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {sitePlanFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-civic-700 shrink-0" />
                            <span className="font-semibold text-slate-900 truncate">{f.name}</span>
                            <span className="text-slate-500 shrink-0">
                              ({formatFileSize(f.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSitePlanFiles((curr) => curr.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'zoning' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                <strong>Independence Zoning Ordinance (Art. 5, § 5.00 Table 1):</strong> Setbacks,
                lot area, height, and 15-ft residential transition buffers (Note 2) are evaluated
                automatically from these site dimensions.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zoning District (§ 2.00)
                  </label>
                  <select
                    value={m.zoning_district}
                    onChange={(e) => updateM('zoning_district', e.target.value as ZoningDistrict)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
                  >
                    {ZONING_DISTRICTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Principal Land Use
                  </label>
                  <select
                    value={m.land_use}
                    onChange={(e) => updateM('land_use', e.target.value as LandUseType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-civic-500"
                  >
                    {LAND_USE_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.is_corner_lot}
                    onChange={(e) => updateM('is_corner_lot', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600 focus:ring-civic-500"
                  />
                  Corner Lot (§ 3.12 / § 152.01)
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.adjoins_r_district}
                    onChange={(e) => updateM('adjoins_r_district', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600 focus:ring-civic-500"
                  />
                  Adjoins &quot;R&quot; District (Note 2: 15&apos; buffer)
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.public_water_sewer}
                    onChange={(e) => updateM('public_water_sewer', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600 focus:ring-civic-500"
                  />
                  City Water &amp; Sewer (§ 3.08)
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lot Area (sq ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={m.lot_area_sqft}
                    onChange={(e) => updateM('lot_area_sqft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lot Width (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={m.lot_width_ft}
                    onChange={(e) => updateM('lot_width_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bldg Height (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={m.proposed_height_ft}
                    onChange={(e) => updateM('proposed_height_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stories
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={m.proposed_stories}
                    onChange={(e) => updateM('proposed_stories', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Front Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={m.front_setback_ft}
                    onChange={(e) => updateM('front_setback_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Side Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={m.side_setback_ft}
                    onChange={(e) => updateM('side_setback_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corner Street (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={!m.is_corner_lot}
                    value={m.corner_side_setback_ft}
                    onChange={(e) => updateM('corner_side_setback_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rear Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={m.rear_setback_ft}
                    onChange={(e) => updateM('rear_setback_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Accessory Structure Section */}
              <div className="pt-3 border-t border-slate-200">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.has_accessory_structure}
                    onChange={(e) => updateM('has_accessory_structure', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  Includes Detached Accessory Structure / Garage (Table 1 Notes 4–6: &le;18&apos; tall, &ge;4&apos; rear/side, &le;30% rear cov.)
                </label>

                {m.has_accessory_structure && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Accessory Height (ft, max 18&apos;)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={m.accessory_height_ft}
                        onChange={(e) => updateM('accessory_height_ft', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Side/Rear Setback (ft, min 4&apos;)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={m.accessory_side_rear_setback_ft}
                        onChange={(e) =>
                          updateM('accessory_side_rear_setback_ft', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rear Yard Coverage (%, max 30%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={m.rear_yard_coverage_pct}
                        onChange={(e) => updateM('rear_yard_coverage_pct', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'floodplain' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950">
                <strong>Independence Floodplain Ordinance (IMC Ch. 167 &amp; Zoning Art. 4):</strong>{' '}
                Evaluates Wapsipinicon River FIRM zones, BFE + 1.0&apos; lowest floor freeboard,
                § 4.02.14(c) BFE + 3.0&apos; machinery rule inside sub-BFE enclosures, &amp; 92 FEMA buyout lots.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    FEMA FIRM Flood Zone (§ 4.04)
                  </label>
                  <select
                    value={m.flood_zone}
                    onChange={(e) => updateM('flood_zone', e.target.value as FloodZone)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {FLOOD_ZONES.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    100-Yr Base Flood Elevation — BFE (ft NAVD88)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={m.bfe_ft}
                    onChange={(e) => updateM('bfe_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Substantial Improvement Cost Ratio (% of Value, § 4.21)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                    value={m.substantial_improvement_pct}
                    onChange={(e) => updateM('substantial_improvement_pct', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proposed Lowest Floor Elevation (ft NAVD88)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={m.lowest_floor_elev_ft}
                    onChange={(e) => updateM('lowest_floor_elev_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Required in SFHA: &ge; {(m.bfe_ft + 1.0).toFixed(1)} ft (BFE + 1.0&apos;)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HVAC / Water Heater / Electrical Elev. (ft NAVD88)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={m.machinery_elev_ft}
                    onChange={(e) => updateM('machinery_elev_ft', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Required: &ge; {(m.bfe_ft + (m.has_sub_bfe_enclosure ? 3.0 : 1.0)).toFixed(1)} ft
                    {m.has_sub_bfe_enclosure ? ' (§ 4.02.14c +3.0\' enclosed rule)' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.has_floodplain_permit}
                    onChange={(e) => updateM('has_floodplain_permit', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  Floodplain Development Permit Filed (§ 4.05)
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.has_basement}
                    onChange={(e) => updateM('has_basement', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  Includes Subgrade Basement (§ 4.02.04)
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.has_sub_bfe_enclosure}
                    onChange={(e) => updateM('has_sub_bfe_enclosure', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  Has Enclosed Crawl/Garage Area Below BFE
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.enclosure_vented_unfinished}
                    onChange={(e) => updateM('enclosure_vented_unfinished', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  Sub-BFE Area Unfinished &amp; Flood-Vented (§ 4.02.14)
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.floodway_no_rise_cert}
                    onChange={(e) => updateM('floodway_no_rise_cert', e.target.checked)}
                    className="rounded border-slate-300 text-civic-600"
                  />
                  PE 0.00-ft Floodway No-Rise Certificate
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 text-xs font-medium text-rose-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.is_fema_buyout_lot}
                    onChange={(e) => updateM('is_fema_buyout_lot', e.target.checked)}
                    className="rounded border-rose-300 text-rose-600"
                  />
                  Flagged on 92-Lot FEMA Buyout Registry (44 CFR 80.19)
                </label>
              </div>
            </div>
          )}

          {tab === 'fence' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950">
                <strong>Independence Fence Ordinance (IMC Ch. 152 &amp; Zoning §§ 1.04.44–45):</strong>{' '}
                Front max 4&apos;0&quot;, Side/Rear max 6&apos;6&quot;, Corner 20&apos; sight triangle max
                3&apos;0&quot;, and &ge;3&apos;0&quot; side/rear lot-line setback unless a signed Neighbor Fence
                Agreement is filed.
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.includes_fence}
                  onChange={(e) => updateM('includes_fence', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-civic-600"
                />
                Application Includes a Fence, Wall, or Regulated Boundary Hedge (IMC Ch. 152)
              </label>

              {m.includes_fence && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fence Yard Location
                      </label>
                      <select
                        value={m.fence_yard_location}
                        onChange={(e) =>
                          updateM('fence_yard_location', e.target.value as FenceYardLocation)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="rear_side">Side &amp; Rear Yards Only</option>
                        <option value="front">Required Front Yard Only</option>
                        <option value="both">Both Front &amp; Side/Rear Yards</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fence Material (§§ 1.04.44–45)
                      </label>
                      <select
                        value={m.fence_material}
                        onChange={(e) =>
                          updateM('fence_material', e.target.value as FenceMaterial)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        {FENCE_MATERIALS.map((mat) => (
                          <option key={mat.value} value={mat.value}>
                            {mat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Side/Rear Fence Height (ft — max 6.5&apos; = 6&apos;6&quot;)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={14}
                        step={0.25}
                        value={m.fence_side_rear_height_ft}
                        onChange={(e) =>
                          updateM('fence_side_rear_height_ft', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Front Yard Fence Height (ft — max 4.0&apos;)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        step={0.25}
                        disabled={m.fence_yard_location === 'rear_side'}
                        value={m.fence_front_height_ft}
                        onChange={(e) => updateM('fence_front_height_ft', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Distance to Side/Rear Property Line (ft — § 152.02)
                      </label>
                      <input
                        type="number"
                        min={-5}
                        max={50}
                        step={0.5}
                        value={m.fence_property_line_setback_ft}
                        onChange={(e) =>
                          updateM('fence_property_line_setback_ft', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                      />
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        If &lt; 3.0 ft, signed Neighbor Fence Agreement is mandatory.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Height in 20&apos;&times;20&apos; Corner Triangle (ft — max 3.0&apos;)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.25}
                        disabled={!m.is_corner_lot}
                        value={m.fence_corner_triangle_height_ft}
                        onChange={(e) =>
                          updateM('fence_corner_triangle_height_ft', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 disabled:bg-slate-100"
                      />
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {m.is_corner_lot
                          ? 'Enter 0 if fence stays out of the 20\' corner triangle.'
                          : 'Corner lot checkbox on Zoning tab is off.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Iowa One Call (811) Locate Ticket #
                      </label>
                      <input
                        type="text"
                        value={m.iowa_one_call_811}
                        onChange={(e) => updateM('iowa_one_call_811', e.target.value)}
                        placeholder="e.g., IA-2026-1104892"
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                      />
                    </div>

                    {m.has_barbed_wire && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Lowest Barbed-Wire Strand Height (ft — min 6.0&apos; in C/M)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          step={0.1}
                          value={m.barbed_wire_height_ft}
                          onChange={(e) => updateM('barbed_wire_height_ft', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-teal-200 bg-teal-50/50 text-xs font-semibold text-teal-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.has_neighbor_fence_agreement}
                        onChange={(e) => updateM('has_neighbor_fence_agreement', e.target.checked)}
                        className="rounded border-teal-300 text-teal-700"
                      />
                      Signed Neighbor Agreement (§ 152.02)
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.has_fence_permit_app}
                        onChange={(e) => updateM('has_fence_permit_app', e.target.checked)}
                        className="rounded border-slate-300 text-civic-600"
                      />
                      Written Permit App Filed (§ 152.03)
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.has_barbed_wire}
                        onChange={(e) => updateM('has_barbed_wire', e.target.checked)}
                        className="rounded border-slate-300 text-civic-600"
                      />
                      Includes Barbed Wire (§ 1.04.44)
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer Navigation & Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 hidden sm:block">
              Tip: You can review all 4 ordinance tabs before saving.
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {saving
                  ? 'Evaluating & Saving...'
                  : isEdit
                    ? 'Save & Re-Sync Ordinance Checks'
                    : 'Create Permit Checklist'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
