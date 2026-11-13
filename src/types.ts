export type UserRole = 'admin' | 'inspector' | 'applicant';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  created_at: string;
}

export type ZoningDistrict =
  | 'A-1'
  | 'R-1'
  | 'R-2'
  | 'R-3'
  | 'R-4'
  | 'R/C-1'
  | 'C-1'
  | 'C-2'
  | 'M-1'
  | 'M-2';

export type LandUseType =
  | 'single_family'
  | 'two_family'
  | 'multi_family'
  | 'commercial'
  | 'industrial'
  | 'other_permitted';

export type FloodZone = 'X' | 'X_500' | 'A' | 'AE' | 'FLOODWAY';

export type FenceMaterial =
  | 'wood'
  | 'vinyl'
  | 'wrought_iron'
  | 'chain_link'
  | 'masonry'
  | 'corrugated_metal'
  | 'salvage'
  | 'barbed_wire';

export type FenceYardLocation = 'rear_side' | 'front' | 'both';

export type ProjectStatus =
  | 'draft'
  | 'in_review'
  | 'corrections_required'
  | 'variance_needed'
  | 'approved'
  | 'denied';

export type OrdinanceCategory = 'zoning' | 'floodplain' | 'fence';

export type ChecklistStatus = 'pass' | 'fail' | 'pending' | 'variance' | 'na';

export type ChecklistPriority = 'critical' | 'standard' | 'advisory';

export interface ProjectMeasurements {
  // Zoning & Bulk (Independence Zoning Ordinance Art. 5 Table 1)
  zoning_district: ZoningDistrict;
  land_use: LandUseType;
  public_water_sewer: boolean;
  is_corner_lot: boolean;
  adjoins_r_district: boolean;
  lot_area_sqft: number;
  lot_width_ft: number;
  lot_depth_ft: number;
  proposed_height_ft: number;
  proposed_stories: number;
  front_setback_ft: number;
  side_setback_ft: number;
  corner_side_setback_ft: number;
  rear_setback_ft: number;
  // Accessory structure (Table 1 Notes 4-6 & § 3.10)
  has_accessory_structure: boolean;
  accessory_height_ft: number;
  accessory_side_rear_setback_ft: number;
  rear_yard_coverage_pct: number;

  // Floodplain (IMC Ch. 167 & Zoning Art. 4 — Wapsipinicon River / Malone Creek)
  flood_zone: FloodZone;
  bfe_ft: number; // Base Flood Elevation (NAVD88)
  lowest_floor_elev_ft: number;
  machinery_elev_ft: number;
  has_basement: boolean;
  has_sub_bfe_enclosure: boolean;
  enclosure_vented_unfinished: boolean;
  substantial_improvement_pct: number; // >= 50% triggers full compliance (§ 4.21)
  floodway_no_rise_cert: boolean;
  is_fema_buyout_lot: boolean; // 92 buyout parcels in Independence (44 CFR 80.19)
  has_floodplain_permit: boolean;

  // Fence (IMC Ch. 152 & Zoning §§ 1.04.44 - 1.04.45)
  includes_fence: boolean;
  fence_yard_location: FenceYardLocation;
  fence_front_height_ft: number;
  fence_side_rear_height_ft: number;
  fence_corner_triangle_height_ft: number; // IMC § 152.01: max 3.0 ft in 20'x20' corner triangle
  fence_property_line_setback_ft: number; // IMC § 152.02: >= 3.0 ft unless signed Neighbor Agreement
  has_neighbor_fence_agreement: boolean;
  fence_material: FenceMaterial;
  has_barbed_wire: boolean;
  barbed_wire_height_ft: number; // Zoning § 1.04.44: >= 6.0 ft in non-R; banned in R
  has_fence_permit_app: boolean; // IMC § 152.03
  iowa_one_call_811: string;
}

export interface Project extends ProjectMeasurements {
  id: number;
  permit_number: string;
  title: string;
  property_address: string;
  parcel_pin: string;
  ward: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  description: string;
  status: ProjectStatus;
  assigned_to: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Computed summary fields returned on list/detail
  checklist_total?: number;
  checklist_passed?: number;
  checklist_failed?: number;
  checklist_pending?: number;
  checklist_variance?: number;
  site_plan_count?: number;
}

export interface ChecklistItem {
  id: number;
  project_id: number;
  category: OrdinanceCategory;
  code_citation: string;
  title: string;
  ordinance_requirement: string;
  proposed_value: string;
  status: ChecklistStatus;
  priority: ChecklistPriority;
  inspector_notes: string;
  verified_by: string;
  sort_order: number;
  updated_at: string;
}

export interface InspectionNote {
  id: number;
  project_id: number;
  author_name: string;
  author_role: string;
  note_type: 'inspection' | 'condition' | 'correction' | 'general';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface OrdinanceRule {
  id: number;
  category: OrdinanceCategory;
  code_section: string;
  title: string;
  applies_to: string;
  requirement_summary: string;
  threshold_metric: string;
  ordinance_text: string;
  remedy_guidance: string;
  is_custom: boolean;
  updated_at: string;
}

export interface ComparisonCheckResult {
  rule_key: string;
  category: OrdinanceCategory;
  code_citation: string;
  title: string;
  ordinance_standard: string;
  proposed_display: string;
  verdict: 'pass' | 'fail' | 'warning' | 'na';
  delta_display: string;
  priority: ChecklistPriority;
  explanation: string;
  remedy?: string;
}

export interface EvaluationSummary {
  overall_verdict: 'compliant' | 'action_required' | 'violations_found';
  pass_count: number;
  fail_count: number;
  warning_count: number;
  na_count: number;
  effective_bulk_district: string;
  checks: ComparisonCheckResult[];
}

export type SitePlanType =
  | 'construction_site_plan'
  | 'boundary_survey'
  | 'floodplain_elevation'
  | 'fence_sketch'
  | 'grading_drainage';

export interface SitePlanDocument {
  id: number;
  project_id: number;
  plan_type: SitePlanType;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  revision_label: string;
  notes: string;
  uploaded_by: string;
  created_at: string;
}

