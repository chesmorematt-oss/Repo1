import { db } from './db.ts';
import { syncProjectChecklist } from './checklistSync.ts';
import type { ProjectMeasurements } from '../src/types.ts';

export function seedDatabaseIfEmpty(): void {
  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCountRow.cnt > 0) {
    return;
  }

  const defaultPass = 'no-auth';

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, title, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminRes = insertUser.run(
    'Matt Chesmore',
    'zoning@independenceia.gov',
    defaultPass,
    'admin',
    'Planning & Zoning Administrator',
    'City Hall — Planning & Zoning (331 1st St E)'
  );
  const inspectorRes = insertUser.run(
    'Dana Weber',
    'inspector@independenceia.gov',
    defaultPass,
    'inspector',
    'Building & Code Enforcement Official',
    'Building & Code Enforcement — (319) 334-4711'
  );
  insertUser.run(
    'Hannah Miller',
    'hannah.miller@example.com',
    defaultPass,
    'applicant',
    'Property Owner / Permit Applicant',
    'Ward 2 Resident — Independence, IA 50644'
  );

  const adminId = Number(adminRes.lastInsertRowid);
  const inspectorId = Number(inspectorRes.lastInsertRowid);

  // Seed comprehensive Independence, Iowa Ordinance Reference Rules
  const rules = [
    // ZONING ORDINANCE (Ch. 170 / Zoning Ordinance Ninth Revision Nov 15, 2025)
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 2 § 2.00',
      title: 'Zoning District Classifications (11 Municipal Districts)',
      applies_to: 'All Corporate Limits (A-1, R-1–R-4, R/C-1, C-1, C-2, M-1, M-2)',
      requirement_summary: 'Every parcel & proposed land use must conform to permitted or conditional uses of its assigned district.',
      threshold_metric: 'Permitted / Conditional Use Match',
      ordinance_text:
        'Divides the City of Independence, Buchanan County, Iowa into eleven classes of districts: A-1 Agricultural; R-1 Single-Family Residential; R-2 Mixed Residential; R-3 Multi-Family; R-4 High-Density/Mobile Home; R/C-1 Mixed Residential/Commercial; C-1 Central Commercial; C-2 Commercial; M-1 Light Industrial; M-2 Heavy Industrial.',
      remedy_guidance: 'File a Rezoning Application (§ 3.07 / Appendix 1) before the Planning & Zoning Commission or Conditional Use request.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 5 § 5.00 Table 1 (R-1)',
      title: 'R-1 Single-Family Residential Bulk & Setback Standards',
      applies_to: 'R-1 Single-Family Residential District',
      requirement_summary: 'Min Lot: 10,000 sq ft (30,000 unsewered); Width: 80 ft; Front: 25 ft; Side: 8 ft (25 ft corner); Rear: 30 ft; Max Height: 35 ft / 3 stories.',
      threshold_metric: '10,000 sf · 25\' F / 8\' S / 30\' R · <=35\'',
      ordinance_text:
        'Single-family dwellings served by public water and sewer require at least 10,000 sq ft lot area and 80 ft lot width (30,000 sq ft if unserved). Maximum building height is 35 ft or 3 stories, whichever is lower (Note 1). Minimum yards: Front 25 ft, Interior Side 8 ft, Corner Side Street 25 ft, Rear 30 ft.',
      remedy_guidance: 'Adjust building footprint to meet setbacks or petition the Independence Board of Adjustment (§ 20.07) showing unnecessary hardship.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 5 § 5.00 Table 1 (R-2 & R-3)',
      title: 'R-2 Mixed Residential & R-3 Multi-Family Bulk Standards',
      applies_to: 'R-2 and R-3 Residential Districts',
      requirement_summary: 'R-2 SF: 7,000 sf (66\' W, 25\' F, 5\' S, 25\' R); R-2 Duplex: 8,000 sf (70\' W, 7\' S); R-3 3-Plex+: 8,000 sf (65\' W, 20\' F, 10\' S, 35\' R).',
      threshold_metric: '7,000–8,000 sf · 5\'–10\' Side · 25\' Corner',
      ordinance_text:
        'R-2 Single-Family requires 7,000 sq ft lot area, 66 ft width, 25 ft front, 5 ft side, 25 ft corner street side, and 25 ft rear yard. R-2 Two-Family requires 8,000 sq ft, 70 ft width, and 7 ft side yards. R-3 Multi-Family (3-plex+) requires 8,000 sq ft, 65 ft width, 20 ft front, 10 ft side, 25 ft corner side, and 35 ft rear yard.',
      remedy_guidance: 'Verify Lot of Record status (§ 1.04.81) for older platted Ward 1–4 lots or seek Board of Adjustment dimensional variance.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 5 § 5.00 Table 1 (R/C-1)',
      title: 'R/C-1 Mixed Residential/Commercial Hybrid Bulk Rule',
      applies_to: 'R/C-1 Transitional Corridors',
      requirement_summary: 'Must meet R-2 bulk rules if residential OR if commercial adjoining an "R" District; otherwise C-2 bulk rules.',
      threshold_metric: 'R-2 Bulk (if Res or adjoins R) / C-2 Bulk',
      ordinance_text:
        'In R/C-1 Districts: The R-2 bulk requirements must be met if the use of the land is residential. The C-2 bulk requirements must be met if the use of the land is commercial. The R-2 bulk requirements must be met if the use of the land is commercial and adjoins residential.',
      remedy_guidance: 'Check zoning classification of all abutting parcels before applying C-2 zero-side-yard setbacks.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 5 § 5.00 Table 1 (C-1, C-2, M-1 & Note 2)',
      title: 'Commercial & Industrial Setbacks + 15-Ft Residential Buffer (Note 2)',
      applies_to: 'C-1, C-2, M-1, and M-2 Districts',
      requirement_summary: 'C-1: 0\' setbacks; C-2: 25\' front; M-1/M-2: 25\' front, 10\' side. ALL require >= 15 ft setback where adjoining any "R" District.',
      threshold_metric: '>= 15.0 ft buffer adjoining "R" District',
      ordinance_text:
        'Table 1 Note 2: No side or rear yard required in C-1/C-2 (and 10 ft side in M-1/M-2) EXCEPT where adjoining any "R" District, in which case not less than fifteen (15) feet shall be provided.',
      remedy_guidance: 'Maintain a minimum 15-ft landscaped buffer yard along any lot line abutting R-1, R-2, R-3, or R-4 parcels.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. § 3.10 & Art. 5 Table 1 (Notes 4, 5, 6)',
      title: 'Accessory Buildings in Residential Districts (Garages & Sheds)',
      applies_to: 'R-1, R-2, and R-3 Accessory Structures',
      requirement_summary: 'Max height 18 ft or 1 story (whichever is lower); min 4 ft side/rear setback in rear/side yard; max 30% rear yard coverage.',
      threshold_metric: '<= 18\' (1 story) · >= 4\' S/R · <= 30% Rear Cov.',
      ordinance_text:
        'Accessory buildings in R-1, R-2, and R-3 districts shall not exceed 18 ft or 1 story in height, whichever is lower. Maximum coverage of lot for accessory buildings shall be 30% of the rear yard (Note 4). Accessory buildings placed in rear or side yards may reduce minimum side and rear yard requirements to 4 feet (Notes 5 & 6).',
      remedy_guidance: 'Reduce garage peak height to <= 18 ft, shift slab >= 4 ft from alley/side lot lines, and verify rear-yard footprint <= 30%.',
    },
    {
      category: 'zoning',
      code_section: 'Zoning Ord. Art. 3 § 3.14',
      title: 'Established Block Front Yard Setback Averaging',
      applies_to: 'All "R" Residential Districts',
      requirement_summary: 'When >= 30% of frontage within 200 ft has deeper existing setbacks, average front setback governs (capped at 50 ft max).',
      threshold_metric: 'Average within 200 ft (max 50 ft)',
      ordinance_text:
        'Where lots comprising 30% or more of the frontage within 200 feet of either side lot line are developed with buildings at a greater setback, the front yard setback shall be the average of these building setbacks and the minimum setbacks required for undeveloped lots, not to exceed 50 feet in any case.',
      remedy_guidance: 'Measure adjacent house setbacks within 200 ft on established Independence residential blocks before staking foundations.',
    },

    // FLOOD PLAIN ORDINANCE (IMC Ch. 167 & Zoning Ordinance Article 4)
    {
      category: 'floodplain',
      code_section: 'IMC Ch. 167 & Zoning Ord. Art. 4 §§ 4.04–4.05',
      title: 'Special Flood Hazard Area (SFHA) & Floodplain Development Permit',
      applies_to: 'Wapsipinicon River, Malone Creek & Tributary FEMA Zones A, AE, Floodway',
      requirement_summary: 'Mandatory Floodplain Development Permit prior to any construction, fill, grading, dredging, or substantial improvement in SFHA.',
      threshold_metric: 'Approved Permit before Earthwork/Build',
      ordinance_text:
        'Adopts the Federal Insurance Administration Flood Insurance Study (FIS) and Flood Insurance Rate Maps (FIRM) for Independence / Buchanan County. A Floodplain Development Permit issued by the Building Official is required prior to any development activity within Areas of Special Flood Hazard (1% annual chance / 100-year flood).',
      remedy_guidance: 'Submit City Floodplain Development Permit application with site topography, NAVD88 benchmark elevations, and Iowa DNR joint review if applicable.',
    },
    {
      category: 'floodplain',
      code_section: 'IMC Ch. 167 & Zoning Ord. Art. 4 §§ 4.11.05, 4.17',
      title: 'Lowest Floor Freeboard Elevation (>= BFE + 1.0 Foot)',
      applies_to: 'New Construction & Substantial Improvements in Zones A / AE',
      requirement_summary: 'Lowest floor (including basement) must be elevated at least 1.0 ft above the 100-year Base Flood Elevation (BFE); commercial may dry-floodproof with PE cert.',
      threshold_metric: 'Lowest Floor >= BFE + 1.0 ft NAVD88',
      ordinance_text:
        'All new construction and substantial improvements of residential structures within the 100-year floodplain shall have the lowest floor (including basement) elevated at least 1.0 foot above the Base Flood Elevation (BFE). Non-residential structures may alternatively be dry-floodproofed with PE/Architect certification (§ 4.11.07).',
      remedy_guidance: 'Raise stem-wall/fill pad elevation and submit a surveyed FEMA Elevation Certificate verifying finished lowest floor >= BFE + 1.0 ft.',
    },
    {
      category: 'floodplain',
      code_section: 'Zoning Ord. Art. 4 § 4.02.14(a)–(d)',
      title: 'Sub-BFE Enclosures, Basement Ban & +3.0-Ft Machinery Rule',
      applies_to: 'Crawlspaces, Garages & Utilities in SFHA (Zones A / AE)',
      requirement_summary: 'No subgrade basements; enclosed areas below BFE must be unfinished, hydrostatic-vented, and keep HVAC/water heater/electrical >= BFE + 3.0 ft.',
      threshold_metric: 'Machinery >= BFE + 3.0 ft in Enclosed Area',
      ordinance_text:
        'Under § 4.02.14, an enclosed area below BFE is excluded from being the "Lowest Floor" ONLY when: (a) equipped with hydrostatic flood openings; (b) unfinished (no carpet/drywall) and used solely for access, parking, or storage; (c) machinery and service facilities (hot water heater, furnace, electrical service) in the enclosed area are located at least three (3) feet above the 100-year flood level; and (d) not a subgrade basement.',
      remedy_guidance: 'Relocate furnace, water heater, and breaker panel to an upper story or platform >= BFE + 3.0 ft, and install engineered flood vents.',
    },
    {
      category: 'floodplain',
      code_section: 'Zoning Ord. Art. 4 § 4.21',
      title: '50% Substantial Improvement & Substantial Damage Rule',
      applies_to: 'Existing Nonconforming Buildings in Floodplain',
      requirement_summary: 'Reconstruction, addition, or repair costing >= 50% of pre-project structure market value triggers full floodplain compliance.',
      threshold_metric: 'Project Cost < 50% Market Value (or Full Compliance)',
      ordinance_text:
        'Any repair, reconstruction, rehabilitation, addition, or improvement of a structure, the cost of which equals or exceeds 50 percent of the market value of the structure before the start of construction (or before flood damage occurred), constitutes a Substantial Improvement and must meet all elevation and floodproofing standards.',
      remedy_guidance: 'Provide Buchanan County Assessor valuation + itemized contractor cost affidavit; if >= 50%, elevate structure to BFE + 1.0 ft.',
    },
    {
      category: 'floodplain',
      code_section: 'IMC Ch. 167 & Zoning Ord. Art. 4 § 4.00.03',
      title: 'Wapsipinicon Regulatory Floodway Zero-Rise Standard',
      applies_to: 'FEMA Designated Regulatory Floodway',
      requirement_summary: 'Prohibits new residential buildings, fill, or flood-obstructing fences/structures unless PE certifies 0.00 ft flood stage rise.',
      threshold_metric: '0.00 ft Surcharge (Hydraulic No-Rise Cert)',
      ordinance_text:
        'Controls alteration of natural floodplains, stream channels, and floodways along the Wapsipinicon River. Encroachments, fill, new construction, or flood barriers within the regulatory Floodway are prohibited unless hydraulic analysis by a licensed Professional Engineer demonstrates 0.00 feet increase in base flood heights.',
      remedy_guidance: 'Shift all structures, fill, and solid fencing outside the FEMA Floodway boundary, or obtain Iowa DNR + PE No-Rise approval.',
    },
    {
      category: 'floodplain',
      code_section: '44 CFR § 80.19 & Independence Buyout Registry',
      title: 'FEMA Hazard Mitigation Buyout Open-Space Parcels (92 City Lots)',
      applies_to: '92 Federally Acquired Flood Buyout Lots in Independence',
      requirement_summary: 'Dedicated in perpetuity as open space; walled buildings, levees, paved parking, storage tanks, and off-site fill are permanently banned.',
      threshold_metric: 'Zero Structural / Fill Development',
      ordinance_text:
        'Iowa HSEMD & FEMA records identify 92 properties in the City of Independence acquired with federal hazard-mitigation funds. Under 44 CFR 80.19, these parcels must be maintained in perpetuity as open space conserving natural floodplain functions; walled structures, paving, and fill are strictly prohibited.',
      remedy_guidance: 'Confirm parcel PIN against City Hall buyout parcel map before accepting any building, driveway, or fence permit.',
    },

    // FENCE ORDINANCE (IMC Chapter 152 & Zoning §§ 1.04.44–1.04.45)
    {
      category: 'fence',
      code_section: 'IMC § 152.01 & Zoning Fig. 4C',
      title: 'Corner Lot 20-Ft Street Intersection Vision Triangle',
      applies_to: 'All Corner Lots in Any Zoning District',
      requirement_summary: 'Max height of 3 feet (36") above established curb grade within the 20 ft x 20 ft street intersection sight triangle.',
      threshold_metric: '<= 3\' 0" (36 in) in 20\' x 20\' Triangle',
      ordinance_text:
        'IMC § 152.01: On any corner lot in any Zoning District, no fence, wall or other structure shall be erected to a height of more than three (3) feet above the established curb grade at the intersection of the streets on that part of any yard bounded by the street lines and a line connecting two points on said street lines twenty (20) feet from their point of intersection, including plantings or foliage.',
      remedy_guidance: 'Chamfer the fence corner behind the 20-ft x 20-ft intersection triangle or step panels down to <= 36 inches above curb grade.',
    },
    {
      category: 'fence',
      code_section: 'IMC § 152.02 (Height Limits)',
      title: 'Front Yard (4\' 0") & Side/Rear Yard (6\' 6") Fence Height Caps',
      applies_to: 'All Interior & Corner Lots Across All Zoning Districts',
      requirement_summary: 'Max 4\' 0" (48") height in any required front yard; max 6\' 6" (78") height in any required side or rear yard.',
      threshold_metric: 'Front <= 4\' 0" · Side/Rear <= 6\' 6"',
      ordinance_text:
        'IMC § 152.02: On any interior lot in any Zoning District (and non-triangle portions of corner lots), no fence, wall or hedge shall exceed four (4) feet in height in any required front yard and shall not exceed six feet six inches (6\'6") in height in any required side or rear yard.',
      remedy_guidance: 'Ensure post & panel heights (including decorative caps/lattice) do not exceed 4\' 0" forward of the front building line or 6\' 6" in side/rear yards.',
    },
    {
      category: 'fence',
      code_section: 'IMC § 152.02 (Setback & Neighbor Agreement)',
      title: '3-Foot Property Line Setback OR Signed Neighbor Fence Agreement',
      applies_to: 'All Side & Rear Yard Fences, Walls, and Hedges',
      requirement_summary: 'Must sit >= 3.0 ft inside side/rear property line UNLESS a signed Neighbor Fence Agreement is filed with the City Building Official.',
      threshold_metric: '>= 3.0 ft Setback OR Signed Neighbor Form',
      ordinance_text:
        'IMC § 152.02: No fence, wall or hedge shall be within three (3) feet of the property line in any side or rear yard unless a written agreement between the adjoining property owners permitting the location of the fence, wall or hedge on the property line is filed with the City. Centerline must remain inside designated property line (§ 1.04.45).',
      remedy_guidance: 'Download & file the City of Independence Neighbor Fence Agreement signed by each abutting neighbor, or offset fence >= 3.0 ft onto your lot.',
    },
    {
      category: 'fence',
      code_section: 'IMC § 152.03',
      title: 'Written Fence Permit Application & Iowa One Call 811',
      applies_to: 'All New, Enlarged, Altered, or Reconstructed Fences/Walls/Hedges',
      requirement_summary: 'Written application stating applicant name, address, site sketch location, and height must be approved by Building Inspector prior to work.',
      threshold_metric: 'Approved Permit + 811 Utility Locate',
      ordinance_text:
        'IMC § 152.03: No fence, wall or hedge shall hereafter be erected, enlarged, altered or reconstructed without first having applied in writing to the office of the Building Inspector for a permit stating applicant name, address, location, and height. Call Iowa One Call (811) 48 hours prior to excavation.',
      remedy_guidance: 'Submit Fence Permit portal application to Building & Code Enforcement ((319) 334-4711) with lot sketch and 811 locate number.',
    },
    {
      category: 'fence',
      code_section: 'Zoning Ord. Art. 1 §§ 1.04.44 & 1.04.45',
      title: 'Fence Material Standards & Barbed-Wire Restrictions',
      applies_to: 'Residential ("R") vs. Commercial/Industrial Districts',
      requirement_summary: '"R" Districts ban corrugated sheet metal, barbed wire & salvage material; C/M Districts ban salvage & barbed wire < 6\' 0" above grade.',
      threshold_metric: 'Approved Materials · Barbed Wire >= 6\'0" (Non-R only)',
      ordinance_text:
        '§ 1.04.45 Residential Fence: Shall be constructed of materials commonly used for landscape fencing (masonry block, lumber, chain link, vinyl/iron) and shall NOT include corrugated sheet metal, barbed wire, or salvage material. § 1.04.44 Non-Residential Fence: Shall not use salvage material or barbed wire closer than 6 feet to the ground (except purely agricultural A-1 fences).',
      remedy_guidance: 'Specify lumber, vinyl, wrought iron, masonry, or chain link in residential zones; remove corrugated metal panels or low barbed wire.',
    },
  ];

  const insertRule = db.prepare(`
    INSERT INTO ordinance_rules (
      category, code_section, title, applies_to, requirement_summary,
      threshold_metric, ordinance_text, remedy_guidance, is_custom
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const r of rules) {
    insertRule.run(
      r.category,
      r.code_section,
      r.title,
      r.applies_to,
      r.requirement_summary,
      r.threshold_metric,
      r.ordinance_text,
      r.remedy_guidance
    );
  }

  // Seed 6 realistic Independence, Iowa Permit & Compliance Reviews
  interface SeedProjectInput extends ProjectMeasurements {
    permit_number: string;
    title: string;
    property_address: string;
    parcel_pin: string;
    ward: string;
    applicant_name: string;
    applicant_email: string;
    applicant_phone: string;
    description: string;
    status: string;
    assigned_to: string;
    created_by: number;
    notes: Array<{
      author_name: string;
      author_role: string;
      note_type: string;
      content: string;
    }>;
  }

  const seedProjects: SeedProjectInput[] = [
    {
      permit_number: 'PRJ-2026-0101',
      title: 'Detached Garage & 6\'0" Cedar Privacy Fence',
      property_address: '412 3rd Ave NE, Independence, IA 50644',
      parcel_pin: '06.34.278.014',
      ward: 'Ward 2',
      applicant_name: 'Hannah & Derek Miller',
      applicant_email: 'hannah.miller@example.com',
      applicant_phone: '(319) 334-6182',
      description:
        '24\'x24\' single-story detached garage in rear yard (16 ft peak height, 4.5 ft off alley/side line) plus 6\'0" western red cedar privacy fence placed 0.5 ft inside north lot line.',
      status: 'corrections_required',
      assigned_to: 'Matt Chesmore',
      created_by: adminId,
      zoning_district: 'R-1',
      land_use: 'single_family',
      public_water_sewer: true,
      is_corner_lot: false,
      adjoins_r_district: true,
      lot_area_sqft: 11440,
      lot_width_ft: 88,
      lot_depth_ft: 130,
      proposed_height_ft: 24,
      proposed_stories: 2,
      front_setback_ft: 28,
      side_setback_ft: 9.5,
      corner_side_setback_ft: 25,
      rear_setback_ft: 42,
      has_accessory_structure: true,
      accessory_height_ft: 16,
      accessory_side_rear_setback_ft: 4.5,
      rear_yard_coverage_pct: 22,
      flood_zone: 'X',
      bfe_ft: 924.0,
      lowest_floor_elev_ft: 936.5,
      machinery_elev_ft: 937.0,
      has_basement: false,
      has_sub_bfe_enclosure: false,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 18,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: false,
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_front_height_ft: 0,
      fence_side_rear_height_ft: 6.0,
      fence_corner_triangle_height_ft: 0,
      fence_property_line_setback_ft: 0.5,
      has_neighbor_fence_agreement: false,
      fence_material: 'wood',
      has_barbed_wire: false,
      barbed_wire_height_ft: 0,
      has_fence_permit_app: true,
      iowa_one_call_811: 'IA-2026-1104892',
      notes: [
        {
          author_name: 'Dana Weber',
          author_role: 'Building & Code Enforcement Official',
          note_type: 'correction',
          content:
            'Detached garage meets R-1 Table 1 Notes 4–6 (16 ft <= 18 ft max, 4.5 ft >= 4.0 ft reduced rear/side setback, 22% <= 30% rear yard coverage). However, proposed north fence sits 0.5 ft from lot line (< 3.0 ft required by IMC § 152.02). Applicant must upload signed Neighbor Fence Agreement from 416 3rd Ave NE owner or shift fence to 3.0 ft setback.',
        },
        {
          author_name: 'Matt Chesmore',
          author_role: 'Planning & Zoning Administrator',
          note_type: 'inspection',
          content:
            'Confirmed Zone X on Buchanan County FIRM panel; parcel is outside Wapsipinicon 100-year and 500-year floodplains. Sent blank City Neighbor Fence Agreement PDF to applicant.',
        },
      ],
    },
    {
      permit_number: 'PRJ-2026-0102',
      title: 'Riverfront Duplex Substantial Rehab & Floodproofing Review',
      property_address: '114 2nd Ave SW, Independence, IA 50644',
      parcel_pin: '06.34.351.009',
      ward: 'Ward 4',
      applicant_name: 'Wapsi Millworks & Riverfront Rentals LLC',
      applicant_email: 'permits@wapsimillworks.com',
      applicant_phone: '(319) 334-9044',
      description:
        'Substantial renovation (64% of assessed structure market value) of two-family dwelling near Wapsipinicon River in FEMA Zone AE (BFE 921.4 ft NAVD88) with unfinished vented lower storage enclosure.',
      status: 'corrections_required',
      assigned_to: 'Dana Weber',
      created_by: inspectorId,
      zoning_district: 'R-2',
      land_use: 'two_family',
      public_water_sewer: true,
      is_corner_lot: false,
      adjoins_r_district: true,
      lot_area_sqft: 8600,
      lot_width_ft: 72,
      lot_depth_ft: 120,
      proposed_height_ft: 29,
      proposed_stories: 2,
      front_setback_ft: 26,
      side_setback_ft: 8,
      corner_side_setback_ft: 25,
      rear_setback_ft: 28,
      has_accessory_structure: false,
      accessory_height_ft: 0,
      accessory_side_rear_setback_ft: 0,
      rear_yard_coverage_pct: 0,
      flood_zone: 'AE',
      bfe_ft: 921.4,
      lowest_floor_elev_ft: 922.8,
      machinery_elev_ft: 923.0,
      has_basement: false,
      has_sub_bfe_enclosure: true,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 64,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: true,
      includes_fence: false,
      fence_yard_location: 'rear_side',
      fence_front_height_ft: 0,
      fence_side_rear_height_ft: 0,
      fence_corner_triangle_height_ft: 0,
      fence_property_line_setback_ft: 3,
      has_neighbor_fence_agreement: false,
      fence_material: 'wood',
      has_barbed_wire: false,
      barbed_wire_height_ft: 0,
      has_fence_permit_app: false,
      iowa_one_call_811: '',
      notes: [
        {
          author_name: 'Dana Weber',
          author_role: 'Building & Code Enforcement Official',
          note_type: 'correction',
          content:
            'Substantial Improvement triggered (64% >= 50% threshold per Zoning § 4.21). First habitable floor at 922.8 ft NAVD88 passes BFE + 1.0 ft (922.4 ft). CRITICAL ISSUE: Furnace & tankless water heater in vented lower enclosure are drawn at 923.0 ft (+1.6 ft above BFE), violating Zoning § 4.02.14(c) which mandates >= 3.0 ft above BFE (924.4 ft NAVD88) when located inside an enclosed sub-BFE area.',
        },
      ],
    },
    {
      permit_number: 'PRJ-2026-0103',
      title: 'Downtown Storefront Bakery & Rear Courtyard Iron Fence',
      property_address: '205 1st Street East, Independence, IA 50644',
      parcel_pin: '06.34.401.003',
      ward: 'Ward 1',
      applicant_name: 'Heartland Prairie Bakery & Lofts',
      applicant_email: 'claire@heartlandprairieia.com',
      applicant_phone: '(319) 334-2290',
      description:
        'Historic Downtown C-1 Central Commercial interior/facade buildout with upper-story apartment and rear 6\'0" ornamental wrought-iron patio/service fence set 3.5 ft inside rear alley property line.',
      status: 'approved',
      assigned_to: 'Matt Chesmore',
      created_by: adminId,
      zoning_district: 'C-1',
      land_use: 'commercial',
      public_water_sewer: true,
      is_corner_lot: false,
      adjoins_r_district: false,
      lot_area_sqft: 5280,
      lot_width_ft: 44,
      lot_depth_ft: 120,
      proposed_height_ft: 31,
      proposed_stories: 2,
      front_setback_ft: 0,
      side_setback_ft: 0,
      corner_side_setback_ft: 0,
      rear_setback_ft: 12,
      has_accessory_structure: false,
      accessory_height_ft: 0,
      accessory_side_rear_setback_ft: 0,
      rear_yard_coverage_pct: 0,
      flood_zone: 'X_500',
      bfe_ft: 923.2,
      lowest_floor_elev_ft: 927.5,
      machinery_elev_ft: 928.0,
      has_basement: false,
      has_sub_bfe_enclosure: false,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 38,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: false,
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_front_height_ft: 0,
      fence_side_rear_height_ft: 6.0,
      fence_corner_triangle_height_ft: 0,
      fence_property_line_setback_ft: 3.5,
      has_neighbor_fence_agreement: false,
      fence_material: 'wrought_iron',
      has_barbed_wire: false,
      barbed_wire_height_ft: 0,
      has_fence_permit_app: true,
      iowa_one_call_811: 'IA-2026-1098231',
      notes: [
        {
          author_name: 'Matt Chesmore',
          author_role: 'Planning & Zoning Administrator',
          note_type: 'condition',
          content:
            'C-1 Central Commercial allows 0 ft front and side lot line buildout where parcel adjoins commercial properties on both sides. Shaded 500-year (0.2%) flood zone noted as advisory only; finished floor is +4.3 ft above nearby 100-yr BFE. Rear 6\'0" wrought-iron fence clears 3.0 ft setback (3.5 ft). Permit APPROVED.',
        },
      ],
    },
    {
      permit_number: 'PRJ-2026-0104',
      title: 'Corner Lot Duplex & Front/Corner Vinyl Picket Fence',
      property_address: '802 6th Ave NW, Independence, IA 50644',
      parcel_pin: '06.27.380.021',
      ward: 'Ward 5',
      applicant_name: 'Cedar Valley Builders Inc.',
      applicant_email: 'estimating@cedarvalleybuilders.com',
      applicant_phone: '(319) 332-7741',
      description:
        'New construction R-2 Two-Family residence on corner lot at 6th Ave NW & 8th St NW with 19.0 ft corner street-side setback and 4\'0" vinyl picket fence crossing the 20-ft street intersection corner.',
      status: 'variance_needed',
      assigned_to: 'Matt Chesmore',
      created_by: adminId,
      zoning_district: 'R-2',
      land_use: 'two_family',
      public_water_sewer: true,
      is_corner_lot: true,
      adjoins_r_district: true,
      lot_area_sqft: 8400,
      lot_width_ft: 70,
      lot_depth_ft: 120,
      proposed_height_ft: 27,
      proposed_stories: 2,
      front_setback_ft: 25,
      side_setback_ft: 7.5,
      corner_side_setback_ft: 19,
      rear_setback_ft: 26,
      has_accessory_structure: false,
      accessory_height_ft: 0,
      accessory_side_rear_setback_ft: 0,
      rear_yard_coverage_pct: 0,
      flood_zone: 'X',
      bfe_ft: 930.0,
      lowest_floor_elev_ft: 941.0,
      machinery_elev_ft: 941.5,
      has_basement: true,
      has_sub_bfe_enclosure: false,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 100,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: false,
      includes_fence: true,
      fence_yard_location: 'both',
      fence_front_height_ft: 4.0,
      fence_side_rear_height_ft: 6.0,
      fence_corner_triangle_height_ft: 4.0,
      fence_property_line_setback_ft: 3.0,
      has_neighbor_fence_agreement: true,
      fence_material: 'vinyl',
      has_barbed_wire: false,
      barbed_wire_height_ft: 0,
      has_fence_permit_app: true,
      iowa_one_call_811: 'IA-2026-1107410',
      notes: [
        {
          author_name: 'Matt Chesmore',
          author_role: 'Planning & Zoning Administrator',
          note_type: 'correction',
          content:
            'Two code conflicts flagged: (1) Corner side-street setback on 8th St NW is 19.0 ft vs 25.0 ft required in R-2 Table 1 (-6.0 ft encroachment -> requires plan revision or Board of Adjustment Variance under § 20.07); (2) Proposed 4\'0" vinyl fence passes through the 20\'x20\' intersection sight triangle where IMC § 152.01 caps height at 3\'0" (36") above curb grade.',
        },
      ],
    },
    {
      permit_number: 'PRJ-2026-0105',
      title: 'Ag-Tech Assembly Bay Addition & Security Perimeter Fence',
      property_address: '1910 Enterprise Drive East, Independence, IA 50644',
      parcel_pin: '07.31.102.005',
      ward: 'Ward 3',
      applicant_name: 'Buchanan Ag-Tech Fabrication',
      applicant_email: 'facilities@buchananagtech.com',
      applicant_phone: '(319) 334-5519',
      description:
        'M-1 Light Industrial warehouse expansion abutting R-1 subdivision on north boundary (18 ft side/rear buffer provided) plus 6\'6" chain-link security fence with barbed wire arm at 6\'2" above grade.',
      status: 'in_review',
      assigned_to: 'Dana Weber',
      created_by: inspectorId,
      zoning_district: 'M-1',
      land_use: 'industrial',
      public_water_sewer: true,
      is_corner_lot: false,
      adjoins_r_district: true,
      lot_area_sqft: 68500,
      lot_width_ft: 220,
      lot_depth_ft: 311,
      proposed_height_ft: 34,
      proposed_stories: 1,
      front_setback_ft: 35,
      side_setback_ft: 18,
      corner_side_setback_ft: 25,
      rear_setback_ft: 22,
      has_accessory_structure: false,
      accessory_height_ft: 0,
      accessory_side_rear_setback_ft: 0,
      rear_yard_coverage_pct: 0,
      flood_zone: 'X',
      bfe_ft: 945.0,
      lowest_floor_elev_ft: 958.0,
      machinery_elev_ft: 958.5,
      has_basement: false,
      has_sub_bfe_enclosure: false,
      enclosure_vented_unfinished: true,
      substantial_improvement_pct: 32,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: false,
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_front_height_ft: 0,
      fence_side_rear_height_ft: 6.5,
      fence_corner_triangle_height_ft: 0,
      fence_property_line_setback_ft: 4.0,
      has_neighbor_fence_agreement: false,
      fence_material: 'chain_link',
      has_barbed_wire: true,
      barbed_wire_height_ft: 6.2,
      has_fence_permit_app: true,
      iowa_one_call_811: '',
      notes: [
        {
          author_name: 'Dana Weber',
          author_role: 'Building & Code Enforcement Official',
          note_type: 'inspection',
          content:
            'North buffer yard (18.0 ft) exceeds the 15.0 ft minimum required by Table 1 Note 2 where M-1 adjoins an R-1 district. Barbed wire strand sits at 6.2 ft (>= 6.0 ft non-residential minimum per § 1.04.44) and overall height caps at 6\'6" per IMC § 152.02. Waiting on Iowa One Call 811 locate ticket number to issue final sign-off.',
        },
      ],
    },
    {
      permit_number: 'PRJ-2026-0106',
      title: 'Wapsipinicon Floodway Fill & 7\'0" Corrugated Metal Fence',
      property_address: '309 Wapsipinicon Ave NW, Independence, IA 50644',
      parcel_pin: '06.34.129.004',
      ward: 'Ward 5',
      applicant_name: 'Travis K. Halvorson',
      applicant_email: 'tkhalvorson@example.com',
      applicant_phone: '(319) 334-8813',
      description:
        'Proposal to place backyard fill, storage shed, and 7\'0" corrugated sheet-metal privacy fence along property line overlapping Wapsipinicon River Regulatory Floodway.',
      status: 'denied',
      assigned_to: 'Matt Chesmore',
      created_by: adminId,
      zoning_district: 'R-1',
      land_use: 'single_family',
      public_water_sewer: true,
      is_corner_lot: false,
      adjoins_r_district: true,
      lot_area_sqft: 12200,
      lot_width_ft: 85,
      lot_depth_ft: 143,
      proposed_height_ft: 22,
      proposed_stories: 1,
      front_setback_ft: 27,
      side_setback_ft: 9,
      corner_side_setback_ft: 25,
      rear_setback_ft: 32,
      has_accessory_structure: true,
      accessory_height_ft: 19.5,
      accessory_side_rear_setback_ft: 2.0,
      rear_yard_coverage_pct: 34,
      flood_zone: 'FLOODWAY',
      bfe_ft: 923.0,
      lowest_floor_elev_ft: 922.5,
      machinery_elev_ft: 922.5,
      has_basement: false,
      has_sub_bfe_enclosure: false,
      enclosure_vented_unfinished: false,
      substantial_improvement_pct: 100,
      floodway_no_rise_cert: false,
      is_fema_buyout_lot: false,
      has_floodplain_permit: false,
      includes_fence: true,
      fence_yard_location: 'rear_side',
      fence_front_height_ft: 0,
      fence_side_rear_height_ft: 7.0,
      fence_corner_triangle_height_ft: 0,
      fence_property_line_setback_ft: 0.0,
      has_neighbor_fence_agreement: false,
      fence_material: 'corrugated_metal',
      has_barbed_wire: false,
      barbed_wire_height_ft: 0,
      has_fence_permit_app: false,
      iowa_one_call_811: '',
      notes: [
        {
          author_name: 'Matt Chesmore',
          author_role: 'Planning & Zoning Administrator',
          note_type: 'correction',
          content:
            'Application DENIED across all three ordinances: (1) Floodplain: Rear parcel lies in Wapsipinicon Regulatory Floodway without Floodplain Permit, No-Rise Certification, or BFE+1 ft elevation; (2) Fence: 7\'0" height exceeds 6\'6" cap (IMC § 152.02), corrugated sheet metal is prohibited in R-1 (Zoning § 1.04.45), and 0 ft setback lacks Neighbor Agreement; (3) Zoning: Accessory shed (19.5 ft tall, 2 ft setback, 34% coverage) violates Table 1 Notes 4–6.',
        },
      ],
    },
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (
      permit_number, title, property_address, parcel_pin, ward,
      applicant_name, applicant_email, applicant_phone, description, status,
      assigned_to, created_by,
      zoning_district, land_use, public_water_sewer, is_corner_lot, adjoins_r_district,
      lot_area_sqft, lot_width_ft, lot_depth_ft, proposed_height_ft, proposed_stories,
      front_setback_ft, side_setback_ft, corner_side_setback_ft, rear_setback_ft,
      has_accessory_structure, accessory_height_ft, accessory_side_rear_setback_ft, rear_yard_coverage_pct,
      flood_zone, bfe_ft, lowest_floor_elev_ft, machinery_elev_ft,
      has_basement, has_sub_bfe_enclosure, enclosure_vented_unfinished,
      substantial_improvement_pct, floodway_no_rise_cert, is_fema_buyout_lot, has_floodplain_permit,
      includes_fence, fence_yard_location, fence_front_height_ft, fence_side_rear_height_ft,
      fence_corner_triangle_height_ft, fence_property_line_setback_ft, has_neighbor_fence_agreement,
      fence_material, has_barbed_wire, barbed_wire_height_ft, has_fence_permit_app, iowa_one_call_811
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const insertNote = db.prepare(`
    INSERT INTO inspection_notes (project_id, author_name, author_role, note_type, content)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const p of seedProjects) {
    const res = insertProject.run(
      p.permit_number,
      p.title,
      p.property_address,
      p.parcel_pin,
      p.ward,
      p.applicant_name,
      p.applicant_email,
      p.applicant_phone,
      p.description,
      p.status,
      p.assigned_to,
      p.created_by,
      p.zoning_district,
      p.land_use,
      p.public_water_sewer ? 1 : 0,
      p.is_corner_lot ? 1 : 0,
      p.adjoins_r_district ? 1 : 0,
      p.lot_area_sqft,
      p.lot_width_ft,
      p.lot_depth_ft,
      p.proposed_height_ft,
      p.proposed_stories,
      p.front_setback_ft,
      p.side_setback_ft,
      p.corner_side_setback_ft,
      p.rear_setback_ft,
      p.has_accessory_structure ? 1 : 0,
      p.accessory_height_ft,
      p.accessory_side_rear_setback_ft,
      p.rear_yard_coverage_pct,
      p.flood_zone,
      p.bfe_ft,
      p.lowest_floor_elev_ft,
      p.machinery_elev_ft,
      p.has_basement ? 1 : 0,
      p.has_sub_bfe_enclosure ? 1 : 0,
      p.enclosure_vented_unfinished ? 1 : 0,
      p.substantial_improvement_pct,
      p.floodway_no_rise_cert ? 1 : 0,
      p.is_fema_buyout_lot ? 1 : 0,
      p.has_floodplain_permit ? 1 : 0,
      p.includes_fence ? 1 : 0,
      p.fence_yard_location,
      p.fence_front_height_ft,
      p.fence_side_rear_height_ft,
      p.fence_corner_triangle_height_ft,
      p.fence_property_line_setback_ft,
      p.has_neighbor_fence_agreement ? 1 : 0,
      p.fence_material,
      p.has_barbed_wire ? 1 : 0,
      p.barbed_wire_height_ft,
      p.has_fence_permit_app ? 1 : 0,
      p.iowa_one_call_811
    );

    const projectId = Number(res.lastInsertRowid);
    syncProjectChecklist(projectId, p, p.assigned_to, false);

    for (const n of p.notes) {
      insertNote.run(projectId, n.author_name, n.author_role, n.note_type, n.content);
    }
  }
}
