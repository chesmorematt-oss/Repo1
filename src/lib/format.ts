import type {
  ChecklistStatus,
  FenceMaterial,
  FloodZone,
  LandUseType,
  OrdinanceCategory,
  ProjectMeasurements,
  ProjectStatus,
  SitePlanType,
  ZoningDistrict,
} from '../types';

export const ZONING_DISTRICTS: Array<{ value: ZoningDistrict; label: string; summary: string }> = [
  { value: 'R-1', label: 'R-1 — Single-Family Residential', summary: '10,000 sf · 25\' F / 8\' S / 30\' R' },
  { value: 'R-2', label: 'R-2 — Mixed Residential (SF / Duplex)', summary: '7,000–8,000 sf · 25\' F / 5–7\' S / 25\' R' },
  { value: 'R-3', label: 'R-3 — Multi-Family Residential', summary: '6,000–8,000 sf · 20\' F / 5–10\' S / 30–35\' R' },
  { value: 'R-4', label: 'R-4 — High-Density / Manufactured', summary: '4,000 sf/unit · 20\' F / 8\' S / 25\' R' },
  { value: 'R/C-1', label: 'R/C-1 — Mixed Residential / Commercial', summary: 'Hybrid: R-2 or C-2 rules' },
  { value: 'C-1', label: 'C-1 — Central Commercial (Downtown)', summary: '0\' yards (15\' adjoining R)' },
  { value: 'C-2', label: 'C-2 — General Commercial', summary: '25\' F · 0\' S/R (15\' adjoining R)' },
  { value: 'M-1', label: 'M-1 — Light Industrial / Manufacturing', summary: '25\' F · 10\' S (15\' adjoining R)' },
  { value: 'M-2', label: 'M-2 — Heavy Industrial', summary: '25\' F · 10\' S (15\' adjoining R)' },
  { value: 'A-1', label: 'A-1 — Agricultural District', summary: '3 Acres · 200\' W · 58\' F/R · 35\' S' },
];

export const LAND_USE_OPTIONS: Array<{ value: LandUseType; label: string }> = [
  { value: 'single_family', label: 'Single-Family Dwelling' },
  { value: 'two_family', label: 'Two-Family Dwelling (Duplex)' },
  { value: 'multi_family', label: 'Multi-Family (3-Plex or Larger)' },
  { value: 'commercial', label: 'Commercial / Retail / Office' },
  { value: 'industrial', label: 'Industrial / Manufacturing / Warehouse' },
  { value: 'other_permitted', label: 'Other Permitted / Civic / Institutional' },
];

export const FLOOD_ZONES: Array<{ value: FloodZone; label: string; isSFHA: boolean }> = [
  { value: 'X', label: 'Zone X — Outside 100-Yr & 500-Yr Floodplain', isSFHA: false },
  { value: 'X_500', label: 'Zone X (Shaded) — 0.2% / 500-Year Floodplain', isSFHA: false },
  { value: 'AE', label: 'Zone AE — 100-Year SFHA (With Base Flood Elev.)', isSFHA: true },
  { value: 'A', label: 'Zone A — 100-Year SFHA (Approximate / Unnumbered)', isSFHA: true },
  { value: 'FLOODWAY', label: 'Regulatory Floodway — Wapsipinicon River Channel', isSFHA: true },
];

export const FENCE_MATERIALS: Array<{ value: FenceMaterial; label: string; rAllowed: boolean }> = [
  { value: 'wood', label: 'Cedar / Treated Wood Lumber', rAllowed: true },
  { value: 'vinyl', label: 'Architectural Vinyl / PVC', rAllowed: true },
  { value: 'wrought_iron', label: 'Wrought Iron / Ornamental Aluminum', rAllowed: true },
  { value: 'chain_link', label: 'Chain Link (Galvanized / Coated)', rAllowed: true },
  { value: 'masonry', label: 'Masonry Block / Brick Wall', rAllowed: true },
  { value: 'corrugated_metal', label: 'Corrugated Sheet Metal (Banned in R)', rAllowed: false },
  { value: 'barbed_wire', label: 'Barbed Wire Strand (Banned in R; >=6\' in C/M)', rAllowed: false },
  { value: 'salvage', label: 'Salvaged / Scrap Material (Prohibited)', rAllowed: false },
];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  in_review: {
    label: 'In Review',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  corrections_required: {
    label: 'Corrections Required',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  variance_needed: {
    label: 'BOA Variance Needed',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  denied: {
    label: 'Denied',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const CHECKLIST_STATUS_META: Record<
  ChecklistStatus,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  pass: {
    label: 'Compliant (Pass)',
    shortLabel: 'Pass',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  fail: {
    label: 'Violation (Fail)',
    shortLabel: 'Fail',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  pending: {
    label: 'Pending Verification',
    shortLabel: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  variance: {
    label: 'BOA Variance Granted',
    shortLabel: 'Variance',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  na: {
    label: 'Not Applicable',
    shortLabel: 'N/A',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const CATEGORY_META: Record<
  OrdinanceCategory,
  { label: string; shortLabel: string; codeRef: string; pillClass: string }
> = {
  zoning: {
    label: 'Planning & Zoning Ordinance',
    shortLabel: 'Zoning & Bulk',
    codeRef: 'IMC Ch. 170 / Zoning Art. 1–5',
    pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  floodplain: {
    label: 'Flood Plain Ordinance',
    shortLabel: 'Floodplain',
    codeRef: 'IMC Ch. 167 / Zoning Art. 4',
    pillClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  fence: {
    label: 'Fences, Walls & Hedges Ordinance',
    shortLabel: 'Fence Code',
    codeRef: 'IMC Ch. 152 & §§ 1.04.44–45',
    pillClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
};

export function formatFeetInches(feetDecimal: number): string {
  const whole = Math.floor(feetDecimal + 1e-6);
  const inches = Math.round((feetDecimal - whole) * 12);
  if (inches === 12) return `${whole + 1}' 0"`;
  if (inches <= 0) return `${whole}' 0"`;
  return `${whole}' ${inches}"`;
}

export function formatDateShort(isoOrSql: string): string {
  if (!isoOrSql) return '';
  const normalized = isoOrSql.includes('T') ? isoOrSql : `${isoOrSql.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoOrSql;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DEFAULT_MEASUREMENTS: ProjectMeasurements = {
  zoning_district: 'R-1',
  land_use: 'single_family',
  public_water_sewer: true,
  is_corner_lot: false,
  adjoins_r_district: true,
  lot_area_sqft: 10800,
  lot_width_ft: 84,
  lot_depth_ft: 128,
  proposed_height_ft: 24,
  proposed_stories: 2,
  front_setback_ft: 26,
  side_setback_ft: 9,
  corner_side_setback_ft: 25,
  rear_setback_ft: 34,
  has_accessory_structure: false,
  accessory_height_ft: 15,
  accessory_side_rear_setback_ft: 5,
  rear_yard_coverage_pct: 18,
  flood_zone: 'X',
  bfe_ft: 922.0,
  lowest_floor_elev_ft: 926.0,
  machinery_elev_ft: 926.5,
  has_basement: false,
  has_sub_bfe_enclosure: false,
  enclosure_vented_unfinished: true,
  substantial_improvement_pct: 100,
  floodway_no_rise_cert: false,
  is_fema_buyout_lot: false,
  has_floodplain_permit: false,
  includes_fence: true,
  fence_yard_location: 'rear_side',
  fence_front_height_ft: 3.5,
  fence_side_rear_height_ft: 6.0,
  fence_corner_triangle_height_ft: 0,
  fence_property_line_setback_ft: 3.0,
  has_neighbor_fence_agreement: false,
  fence_material: 'wood',
  has_barbed_wire: false,
  barbed_wire_height_ft: 0,
  has_fence_permit_app: true,
  iowa_one_call_811: 'IA-2026-1110200',
};

export const SITE_PLAN_TYPE_META: Record<
  SitePlanType,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  construction_site_plan: {
    label: 'Construction Site Plan',
    shortLabel: 'Site Plan',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  boundary_survey: {
    label: 'Boundary / Lot-Line Survey',
    shortLabel: 'Survey',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  floodplain_elevation: {
    label: 'FEMA Elevation / Floodplain Exhibit',
    shortLabel: 'Floodplain Exhibit',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  fence_sketch: {
    label: 'Fence & Sight-Triangle Sketch',
    shortLabel: 'Fence Sketch',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  grading_drainage: {
    label: 'Grading & Drainage Plan',
    shortLabel: 'Grading Plan',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

