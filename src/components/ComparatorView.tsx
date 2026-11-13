import React, { useEffect, useState } from 'react';
import {
  Scale,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  EvaluationSummary,
  FenceMaterial,
  FenceYardLocation,
  FloodZone,
  LandUseType,
  ProjectMeasurements,
  ZoningDistrict,
} from '../types';
import {
  CATEGORY_META,
  DEFAULT_MEASUREMENTS,
  FENCE_MATERIALS,
  FLOOD_ZONES,
  LAND_USE_OPTIONS,
  ZONING_DISTRICTS,
} from '../lib/format';
import { apiFetch } from '../lib/api';
import { SitePlanDiagram } from './diagrams/SitePlanDiagram';
import { FloodplainCrossSection } from './diagrams/FloodplainCrossSection';

interface ComparatorViewProps {
  onConvertToProject: (measurements: ProjectMeasurements) => void;
}

const PRESETS: Array<{ label: string; badge: string; data: Partial<ProjectMeasurements> }> = [
  {
    label: 'R-1 Fence on Lot Line (No Agmt)',
    badge: 'IMC § 152.02 Test',
    data: {
      zoning_district: 'R-1',
      land_use: 'single_family',
      is_corner_lot: false,
      lot_area_sqft: 10800,
      lot_width_ft: 84,
      front_setback_ft: 28,
      side_setback_ft: 9,
      rear_setback_ft: 34,
      flood_zone: 'X',
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_side_rear_height_ft: 6.0,
      fence_property_line_setback_ft: 0.5,
      has_neighbor_fence_agreement: false,
      fence_material: 'wood',
    },
  },
  {
    label: 'Wapsipinicon Zone AE Rehab',
    badge: 'Ch. 167 / § 4.02.14c',
    data: {
      zoning_district: 'R-2',
      land_use: 'single_family',
      is_corner_lot: false,
      lot_area_sqft: 7800,
      lot_width_ft: 68,
      front_setback_ft: 25,
      side_setback_ft: 6,
      rear_setback_ft: 26,
      flood_zone: 'AE',
      bfe_ft: 922.0,
      lowest_floor_elev_ft: 923.4,
      machinery_elev_ft: 923.8,
      has_sub_bfe_enclosure: true,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 62,
      has_floodplain_permit: true,
      includes_fence: false,
    },
  },
  {
    label: 'Corner Lot Sight Triangle',
    badge: 'IMC § 152.01',
    data: {
      zoning_district: 'R-2',
      land_use: 'two_family',
      is_corner_lot: true,
      lot_area_sqft: 8400,
      lot_width_ft: 72,
      front_setback_ft: 25,
      side_setback_ft: 8,
      corner_side_setback_ft: 21,
      rear_setback_ft: 26,
      flood_zone: 'X',
      includes_fence: true,
      fence_yard_location: 'both',
      fence_front_height_ft: 4.0,
      fence_side_rear_height_ft: 6.5,
      fence_corner_triangle_height_ft: 4.0,
      fence_property_line_setback_ft: 3.0,
      fence_material: 'vinyl',
    },
  },
  {
    label: 'C-2 Adjoining R-1 Buffer',
    badge: 'Table 1 Note 2',
    data: {
      zoning_district: 'C-2',
      land_use: 'commercial',
      is_corner_lot: false,
      adjoins_r_district: true,
      lot_area_sqft: 18000,
      lot_width_ft: 110,
      front_setback_ft: 26,
      side_setback_ft: 10,
      rear_setback_ft: 18,
      flood_zone: 'X',
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_side_rear_height_ft: 6.5,
      fence_property_line_setback_ft: 3.5,
      fence_material: 'chain_link',
      has_barbed_wire: true,
      barbed_wire_height_ft: 6.2,
    },
  },
];

export const ComparatorView: React.FC<ComparatorViewProps> = ({ onConvertToProject }) => {
  const [m, setM] = useState<ProjectMeasurements>({ ...DEFAULT_MEASUREMENTS });
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const updateM = <K extends keyof ProjectMeasurements>(key: K, val: ProjectMeasurements[K]) => {
    setM((prev) => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setEvaluating(true);
      try {
        const res = await apiFetch<{ evaluation: EvaluationSummary }>('/api/ordinances/compare', {
          method: 'POST',
          body: JSON.stringify(m),
        });
        if (!cancelled) {
          setEvaluation(res.evaluation);
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) setEvaluating(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [m]);

  const applyPreset = (partial: Partial<ProjectMeasurements>) => {
    setM({ ...DEFAULT_MEASUREMENTS, ...partial });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-civic-700 bg-civic-50 border border-civic-200 px-2.5 py-0.5 rounded-full mb-1.5">
            <Scale className="w-3.5 h-3.5" />
            City Hall Counter &amp; Pre-Application Sandbox
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Interactive Independence Ordinance Comparator
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Test proposed setbacks, Wapsipinicon floodplain elevations, and fence dimensions in real
            time before filing a formal permit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onConvertToProject(m)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-sm font-semibold shadow-sm transition-colors self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Convert Scenario to Permit Checklist
        </button>
      </div>

      {/* Quick Scenario Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-civic-600" />
          Load Common Independence Counter Scenarios:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.data)}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-civic-500 hover:bg-civic-50/40 text-left transition-all"
            >
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {preset.badge}
              </span>
              <div className="text-xs font-bold text-slate-900 mt-1">{preset.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Left Controls, Right Live Results & SVG Diagrams */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Controls (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Card 1: Zoning & Setbacks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Zoning &amp; Bulk (IMC Ch. 170 / Table 1)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                <select
                  value={m.zoning_district}
                  onChange={(e) => updateM('zoning_district', e.target.value as ZoningDistrict)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {ZONING_DISTRICTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Land Use</label>
                <select
                  value={m.land_use}
                  onChange={(e) => updateM('land_use', e.target.value as LandUseType)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {LAND_USE_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.is_corner_lot}
                  onChange={(e) => updateM('is_corner_lot', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Corner Lot
              </label>
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.adjoins_r_district}
                  onChange={(e) => updateM('adjoins_r_district', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Adjoins &quot;R&quot; District
              </label>
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.has_accessory_structure}
                  onChange={(e) => updateM('has_accessory_structure', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Detached Garage
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Lot Area (sf)
                </label>
                <input
                  type="number"
                  step={200}
                  value={m.lot_area_sqft}
                  onChange={(e) => updateM('lot_area_sqft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Width (ft)
                </label>
                <input
                  type="number"
                  value={m.lot_width_ft}
                  onChange={(e) => updateM('lot_width_ft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Height (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={m.proposed_height_ft}
                  onChange={(e) => updateM('proposed_height_ft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Front (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={m.front_setback_ft}
                  onChange={(e) => updateM('front_setback_ft', Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Side (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={m.side_setback_ft}
                  onChange={(e) => updateM('side_setback_ft', Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Corner (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  disabled={!m.is_corner_lot}
                  value={m.corner_side_setback_ft}
                  onChange={(e) => updateM('corner_side_setback_ft', Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Rear (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={m.rear_setback_ft}
                  onChange={(e) => updateM('rear_setback_ft', Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Floodplain Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Floodplain (IMC Ch. 167 &amp; Zoning Art. 4)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FEMA Flood Zone
              </label>
              <select
                value={m.flood_zone}
                onChange={(e) => updateM('flood_zone', e.target.value as FloodZone)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                {FLOOD_ZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  BFE (ft)
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={m.bfe_ft}
                  onChange={(e) => updateM('bfe_ft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Floor Elev.
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={m.lowest_floor_elev_ft}
                  onChange={(e) => updateM('lowest_floor_elev_ft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  HVAC Elev.
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={m.machinery_elev_ft}
                  onChange={(e) => updateM('machinery_elev_ft', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.has_sub_bfe_enclosure}
                  onChange={(e) => updateM('has_sub_bfe_enclosure', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Sub-BFE Enclosure (+3&apos; HVAC rule)
              </label>
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.has_basement}
                  onChange={(e) => updateM('has_basement', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Basement
              </label>
              <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.has_floodplain_permit}
                  onChange={(e) => updateM('has_floodplain_permit', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                SFHA Permit Filed
              </label>
            </div>
          </div>

          {/* Card 3: Fence Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                3. Fence Ordinance (IMC Ch. 152)
              </h3>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-civic-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.includes_fence}
                  onChange={(e) => updateM('includes_fence', e.target.checked)}
                  className="rounded border-slate-300 text-civic-600"
                />
                Include Fence
              </label>
            </div>

            {m.includes_fence && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Yard Scope
                    </label>
                    <select
                      value={m.fence_yard_location}
                      onChange={(e) =>
                        updateM('fence_yard_location', e.target.value as FenceYardLocation)
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="rear_side">Side / Rear Only</option>
                      <option value="front">Front Yard Only</option>
                      <option value="both">Front + Side/Rear</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Material
                    </label>
                    <select
                      value={m.fence_material}
                      onChange={(e) =>
                        updateM('fence_material', e.target.value as FenceMaterial)
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {FENCE_MATERIALS.map((mat) => (
                        <option key={mat.value} value={mat.value}>
                          {mat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Side/Rear Ht (ft)
                    </label>
                    <input
                      type="number"
                      step={0.25}
                      value={m.fence_side_rear_height_ft}
                      onChange={(e) =>
                        updateM('fence_side_rear_height_ft', Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Lot-Line Setback
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={m.fence_property_line_setback_ft}
                      onChange={(e) =>
                        updateM('fence_property_line_setback_ft', Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      20&apos; Corner Ht
                    </label>
                    <input
                      type="number"
                      step={0.25}
                      disabled={!m.is_corner_lot}
                      value={m.fence_corner_triangle_height_ft}
                      onChange={(e) =>
                        updateM('fence_corner_triangle_height_ft', Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums rounded-lg border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-3 py-2 rounded-lg w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.has_neighbor_fence_agreement}
                    onChange={(e) => updateM('has_neighbor_fence_agreement', e.target.checked)}
                    className="rounded border-teal-300 text-teal-700"
                  />
                  Signed Neighbor Fence Agreement Filed (§ 152.02)
                </label>
              </>
            )}
          </div>
        </div>

        {/* Right Live Comparison Results & Diagrams (7 cols) */}
        <div className="xl:col-span-7 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SitePlanDiagram measurements={m} />
            <FloodplainCrossSection measurements={m} />
          </div>

          {evaluation && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Ordinance Comparison ({evaluation.effective_bulk_district})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {evaluating ? 'Updating calculations...' : 'All 3 Independence ordinances compared live'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {evaluation.pass_count} Pass
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {evaluation.fail_count} Fail
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {evaluation.checks
                  .filter((c) => c.verdict !== 'na')
                  .map((chk) => {
                    const cat = CATEGORY_META[chk.category];
                    return (
                      <div
                        key={chk.rule_key}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          chk.verdict === 'fail' ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cat.pillClass}`}
                            >
                              {cat.shortLabel}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {chk.code_citation}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">{chk.title}</div>
                          <div className="text-[11px] text-slate-600">
                            Code: <strong>{chk.ordinance_standard}</strong> &middot; Proposed:{' '}
                            <strong className="text-slate-900">{chk.proposed_display}</strong>
                          </div>
                          {chk.remedy && (
                            <div className="text-[11px] font-semibold text-rose-700">
                              Remedy: {chk.remedy}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 tabular-nums">
                          {chk.verdict === 'pass' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          ) : chk.verdict === 'fail' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              {chk.delta_display}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
