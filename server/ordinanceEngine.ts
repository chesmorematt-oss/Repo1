import type {
  ComparisonCheckResult,
  EvaluationSummary,
  FenceMaterial,
  ProjectMeasurements,
  ZoningDistrict,
} from '../src/types.ts';

export interface BulkStandard {
  effectiveDistrictLabel: string;
  citation: string;
  minLotAreaSqft: number;
  minLotWidthFt: number;
  maxHeightFt: number | null;
  maxStories: number | null;
  minFrontFt: number;
  minSideFt: number;
  minCornerSideFt: number;
  minRearFt: number;
  isResidentialDistrict: boolean;
}

export function isResidentialZone(
  district: ZoningDistrict,
  landUse: ProjectMeasurements['land_use']
): boolean {
  if (district === 'R-1' || district === 'R-2' || district === 'R-3' || district === 'R-4') {
    return true;
  }
  if (district === 'R/C-1' && landUse !== 'commercial' && landUse !== 'industrial') {
    return true;
  }
  return false;
}

export function getBulkStandard(m: ProjectMeasurements): BulkStandard {
  const { zoning_district: d, land_use: u, public_water_sewer, adjoins_r_district } = m;

  // Handle R/C-1 Mixed Residential/Commercial hybrid rule from Independence Table 1:
  // "THE R-2 BULK REQUIREMENTS MUST BE MET IF THE USE OF THE LAND IS RESIDENTIAL.
  //  THE C-2 BULK REQUIREMENTS MUST BE MET IF THE USE OF THE LAND IS COMMERCIAL.
  //  THE R-2 BULK REQUIREMENTS MUST BE MET IF THE USE OF THE LAND IS COMMERCIAL AND ADJOINS RESIDENTIAL."
  let lookupDistrict: ZoningDistrict = d;
  let effectiveLabel: string = d;

  if (d === 'R/C-1') {
    if (u === 'commercial' && !adjoins_r_district) {
      lookupDistrict = 'C-2';
      effectiveLabel = 'R/C-1 (governed by C-2 Commercial Bulk Rules)';
    } else {
      lookupDistrict = 'R-2';
      effectiveLabel =
        u === 'commercial'
          ? 'R/C-1 (Commercial adjoining R — governed by R-2 Bulk Rules)'
          : 'R/C-1 (Residential — governed by R-2 Bulk Rules)';
    }
  }

  switch (lookupDistrict) {
    case 'A-1':
      return {
        effectiveDistrictLabel: effectiveLabel === 'A-1' ? 'A-1 Agricultural' : effectiveLabel,
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (A-1)',
        minLotAreaSqft: 130680, // 3 Acres
        minLotWidthFt: 200,
        maxHeightFt: u === 'single_family' ? 35 : null,
        maxStories: u === 'single_family' ? 3 : null,
        minFrontFt: 58,
        minSideFt: 35,
        minCornerSideFt: 58,
        minRearFt: 58,
        isResidentialDistrict: false,
      };

    case 'R-1':
      if (u === 'other_permitted') {
        return {
          effectiveDistrictLabel: 'R-1 Single Family (Other Permitted Use)',
          citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-1)',
          minLotAreaSqft: 30000,
          minLotWidthFt: 160,
          maxHeightFt: 35,
          maxStories: 3,
          minFrontFt: 40,
          minSideFt: 16,
          minCornerSideFt: 40,
          minRearFt: 40,
          isResidentialDistrict: true,
        };
      }
      return {
        effectiveDistrictLabel: public_water_sewer
          ? 'R-1 Single Family Residential'
          : 'R-1 Single Family (Unserved by Public Water/Sewer)',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-1)',
        minLotAreaSqft: public_water_sewer ? 10000 : 30000,
        minLotWidthFt: 80,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 25,
        minSideFt: 8,
        minCornerSideFt: 25,
        minRearFt: 30,
        isResidentialDistrict: true,
      };

    case 'R-2':
      if (u === 'two_family' || u === 'multi_family') {
        return {
          effectiveDistrictLabel:
            d === 'R/C-1' ? effectiveLabel : 'R-2 Mixed Residential (Two-Family)',
          citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-2)',
          minLotAreaSqft: 8000,
          minLotWidthFt: 70,
          maxHeightFt: 35,
          maxStories: 3,
          minFrontFt: 25,
          minSideFt: 7,
          minCornerSideFt: 25,
          minRearFt: 25,
          isResidentialDistrict: true,
        };
      }
      if (u === 'other_permitted') {
        return {
          effectiveDistrictLabel:
            d === 'R/C-1' ? effectiveLabel : 'R-2 Mixed Residential (Other Permitted)',
          citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-2)',
          minLotAreaSqft: 10000,
          minLotWidthFt: 80,
          maxHeightFt: 35,
          maxStories: 3,
          minFrontFt: 30,
          minSideFt: 7,
          minCornerSideFt: 40,
          minRearFt: 30,
          isResidentialDistrict: true,
        };
      }
      return {
        effectiveDistrictLabel:
          d === 'R/C-1' ? effectiveLabel : 'R-2 Mixed Residential (Single-Family)',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-2)',
        minLotAreaSqft: 7000,
        minLotWidthFt: 66,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 25,
        minSideFt: 5,
        minCornerSideFt: 25,
        minRearFt: 25,
        isResidentialDistrict: d !== 'R/C-1' || u !== 'commercial',
      };

    case 'R-3':
      if (u === 'multi_family') {
        return {
          effectiveDistrictLabel: 'R-3 Multi-Family (3-Plex or Larger)',
          citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-3)',
          minLotAreaSqft: 8000,
          minLotWidthFt: 65,
          maxHeightFt: 35,
          maxStories: 3,
          minFrontFt: 20,
          minSideFt: 10,
          minCornerSideFt: 25,
          minRearFt: 35,
          isResidentialDistrict: true,
        };
      }
      if (u === 'two_family') {
        return {
          effectiveDistrictLabel: 'R-3 Residential (Two-Family)',
          citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-3)',
          minLotAreaSqft: 7200,
          minLotWidthFt: 60,
          maxHeightFt: 35,
          maxStories: 3,
          minFrontFt: 20,
          minSideFt: 5,
          minCornerSideFt: 25,
          minRearFt: 30,
          isResidentialDistrict: true,
        };
      }
      return {
        effectiveDistrictLabel: 'R-3 Residential (Single-Family)',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-3)',
        minLotAreaSqft: 6000,
        minLotWidthFt: 60,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 20,
        minSideFt: 5,
        minCornerSideFt: 25,
        minRearFt: 30,
        isResidentialDistrict: true,
      };

    case 'R-4':
      return {
        effectiveDistrictLabel: 'R-4 High-Density / Manufactured Residential',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (R-4)',
        minLotAreaSqft: 4000,
        minLotWidthFt: 50,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 20,
        minSideFt: 8,
        minCornerSideFt: 25,
        minRearFt: 25,
        isResidentialDistrict: true,
      };

    case 'C-1':
      return {
        effectiveDistrictLabel: adjoins_r_district
          ? 'C-1 Central Commercial (Adjoining R District — Note 2)'
          : 'C-1 Central Commercial',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (C-1 & Note 2)',
        minLotAreaSqft: 0,
        minLotWidthFt: 0,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 0,
        minSideFt: adjoins_r_district ? 15 : 0,
        minCornerSideFt: 0,
        minRearFt: adjoins_r_district ? 15 : 0,
        isResidentialDistrict: false,
      };

    case 'C-2':
      return {
        effectiveDistrictLabel:
          d === 'R/C-1'
            ? effectiveLabel
            : adjoins_r_district
              ? 'C-2 Commercial (Adjoining R District — Note 2)'
              : 'C-2 General Commercial',
        citation: 'Zoning Ord. Art. 5, § 5.00 Table 1 (C-2 & Note 2)',
        minLotAreaSqft: 0,
        minLotWidthFt: 0,
        maxHeightFt: 35,
        maxStories: 3,
        minFrontFt: 25,
        minSideFt: adjoins_r_district ? 15 : 0,
        minCornerSideFt: 25,
        minRearFt: adjoins_r_district ? 15 : 0,
        isResidentialDistrict: false,
      };

    case 'M-1':
    case 'M-2':
    default:
      return {
        effectiveDistrictLabel:
          lookupDistrict === 'M-1'
            ? 'M-1 Light Industrial / Manufacturing'
            : 'M-2 Heavy Industrial',
        citation: `Zoning Ord. Art. 5, § 5.00 Table 1 (${lookupDistrict} & Note 2)`,
        minLotAreaSqft: 0,
        minLotWidthFt: 0,
        maxHeightFt: null, // Determined case-by-case / airport height overlay (§ 3.24)
        maxStories: null,
        minFrontFt: 25,
        minSideFt: adjoins_r_district ? 15 : 10,
        minCornerSideFt: 25,
        minRearFt: adjoins_r_district ? 15 : 0,
        isResidentialDistrict: false,
      };
  }
}

function fmtFeetInches(feetDecimal: number): string {
  const wholeFeet = Math.floor(feetDecimal + 1e-6);
  const inches = Math.round((feetDecimal - wholeFeet) * 12);
  if (inches === 12) {
    return `${wholeFeet + 1}' 0"`;
  }
  if (inches <= 0) {
    return `${wholeFeet}' 0" (${feetDecimal.toFixed(1)} ft)`;
  }
  return `${wholeFeet}' ${inches}" (${feetDecimal.toFixed(1)} ft)`;
}

function materialLabel(mat: FenceMaterial): string {
  const map: Record<FenceMaterial, string> = {
    wood: 'Treated Wood / Cedar Lumber',
    vinyl: 'Architectural Vinyl / PVC',
    wrought_iron: 'Wrought Iron / Ornamental Aluminum',
    chain_link: 'Galvanized / Coated Chain Link',
    masonry: 'Masonry Block / Brick',
    corrugated_metal: 'Corrugated Sheet Metal',
    salvage: 'Salvaged / Reclaimed Scrap Material',
    barbed_wire: 'Barbed Wire Strand Fencing',
  };
  return map[mat] || mat;
}

export function evaluateProjectCompliance(m: ProjectMeasurements): EvaluationSummary {
  const checks: ComparisonCheckResult[] = [];
  const bulk = getBulkStandard(m);
  const inRZone = isResidentialZone(m.zoning_district, m.land_use);

  // =========================================================================
  // 1. INDEPENDENCE PLANNING & ZONING ORDINANCE (Ch. 170 / Zoning Ord. Art 1-5)
  // =========================================================================

  // 1A. Use Compatibility Check
  const residentialInIndustrial =
    (m.zoning_district === 'M-1' || m.zoning_district === 'M-2') &&
    (m.land_use === 'single_family' || m.land_use === 'two_family' || m.land_use === 'multi_family');
  const industrialInResidential =
    (m.zoning_district === 'R-1' ||
      m.zoning_district === 'R-2' ||
      m.zoning_district === 'R-3' ||
      m.zoning_district === 'R-4') &&
    (m.land_use === 'industrial' || m.land_use === 'commercial');
  const multiFamilyInR1 =
    m.zoning_district === 'R-1' && (m.land_use === 'two_family' || m.land_use === 'multi_family');

  if (residentialInIndustrial || industrialInResidential || multiFamilyInR1) {
    checks.push({
      rule_key: 'zoning_use_compatibility',
      category: 'zoning',
      code_citation: 'Zoning Ord. Art. 2 § 2.00 & Art. 3 § 3.00',
      title: 'District Land Use Compatibility',
      ordinance_standard: `Permitted principal use within ${m.zoning_district} District`,
      proposed_display: `${m.land_use.replace('_', ' ')} in ${m.zoning_district}`,
      verdict: 'fail',
      delta_display: 'Non-permitted use',
      priority: 'critical',
      explanation: multiFamilyInR1
        ? 'R-1 District permits Single-Family Residential and approved conditional uses only; Two-Family/Multi-Family requires R-2 or R-3 zoning.'
        : `Proposed ${m.land_use.replace('_', ' ')} use conflicts with ${m.zoning_district} district classifications.`,
      remedy: 'Apply for Rezoning (§ 3.07 / Appendix 1) before the Independence Planning & Zoning Commission, or revise use.',
    });
  } else {
    checks.push({
      rule_key: 'zoning_use_compatibility',
      category: 'zoning',
      code_citation: 'Zoning Ord. Art. 2 § 2.00 & Art. 3 § 3.00',
      title: 'District Land Use Compatibility',
      ordinance_standard: `Permitted principal use within ${bulk.effectiveDistrictLabel}`,
      proposed_display: `${m.land_use.replace('_', ' ')} in ${m.zoning_district}`,
      verdict: 'pass',
      delta_display: 'Permitted by right',
      priority: 'critical',
      explanation: `Proposed ${m.land_use.replace('_', ' ')} aligns with permitted uses in ${bulk.effectiveDistrictLabel}.`,
    });
  }

  // 1B. Minimum Lot Area
  if (bulk.minLotAreaSqft > 0) {
    const diff = m.lot_area_sqft - bulk.minLotAreaSqft;
    checks.push({
      rule_key: 'zoning_lot_area',
      category: 'zoning',
      code_citation: bulk.citation,
      title: 'Minimum Lot Area',
      ordinance_standard: `>= ${bulk.minLotAreaSqft.toLocaleString()} sq ft`,
      proposed_display: `${m.lot_area_sqft.toLocaleString()} sq ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display:
        diff >= 0
          ? `+${diff.toLocaleString()} sq ft margin`
          : `${diff.toLocaleString()} sq ft deficit`,
      priority: 'standard',
      explanation:
        diff >= 0
          ? `Parcel area meets ${bulk.effectiveDistrictLabel} minimum lot size.`
          : `Parcel is smaller than the ${bulk.minLotAreaSqft.toLocaleString()} sq ft minimum required in ${bulk.effectiveDistrictLabel}.`,
      remedy:
        diff < 0
          ? 'Verify pre-existing Lot of Record status (§ 1.04.81 / § 3.11) or request an Area Variance from the Board of Adjustment.'
          : undefined,
    });
  } else {
    checks.push({
      rule_key: 'zoning_lot_area',
      category: 'zoning',
      code_citation: bulk.citation,
      title: 'Minimum Lot Area',
      ordinance_standard: 'No minimum lot area specified',
      proposed_display: `${m.lot_area_sqft.toLocaleString()} sq ft`,
      verdict: 'pass',
      delta_display: 'Exempt in district',
      priority: 'advisory',
      explanation: `${bulk.effectiveDistrictLabel} imposes no minimum square footage requirement beyond required yards and off-street loading/parking.`,
    });
  }

  // 1C. Minimum Lot Width
  if (bulk.minLotWidthFt > 0) {
    const diff = m.lot_width_ft - bulk.minLotWidthFt;
    checks.push({
      rule_key: 'zoning_lot_width',
      category: 'zoning',
      code_citation: `${bulk.citation} & § 1.04.83`,
      title: 'Minimum Lot Width at Building Line',
      ordinance_standard: `>= ${bulk.minLotWidthFt} ft`,
      proposed_display: `${m.lot_width_ft} ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display: diff >= 0 ? `+${diff.toFixed(1)} ft` : `${diff.toFixed(1)} ft short`,
      priority: 'standard',
      explanation:
        diff >= 0
          ? 'Lot width measured at the front building setback line satisfies Table 1.'
          : `Lot width (${m.lot_width_ft} ft) is narrower than the ${bulk.minLotWidthFt} ft Table 1 standard.`,
      remedy:
        diff < 0
          ? 'Check Lot of Record grandfathering (§ 1.04.81) or seek Board of Adjustment dimensional variance.'
          : undefined,
    });
  }

  // 1D. Principal Building Height & Stories (Table 1 Note 1: footage or stories, whichever is lower)
  if (bulk.maxHeightFt !== null && bulk.maxStories !== null) {
    const heightOk = m.proposed_height_ft <= bulk.maxHeightFt;
    const storiesOk = m.proposed_stories <= bulk.maxStories;
    const pass = heightOk && storiesOk;
    checks.push({
      rule_key: 'zoning_building_height',
      category: 'zoning',
      code_citation: `${bulk.citation} (Note 1)`,
      title: 'Principal Building Height & Stories',
      ordinance_standard: `<= ${bulk.maxHeightFt} ft OR ${bulk.maxStories} stories (whichever is lower)`,
      proposed_display: `${m.proposed_height_ft} ft (${m.proposed_stories} ${m.proposed_stories === 1 ? 'story' : 'stories'})`,
      verdict: pass ? 'pass' : 'fail',
      delta_display: pass
        ? `${(bulk.maxHeightFt - m.proposed_height_ft).toFixed(1)} ft below cap`
        : !heightOk
          ? `+${(m.proposed_height_ft - bulk.maxHeightFt).toFixed(1)} ft over cap`
          : `+${m.proposed_stories - bulk.maxStories} story over cap`,
      priority: 'standard',
      explanation: pass
        ? 'Proposed building height complies with both footage and story caps under Table 1 Note 1.'
        : 'Table 1 Note 1 enforces whichever limit is lower between maximum feet (35 ft) and maximum stories (3 stories).',
      remedy: !pass
        ? 'Reduce roof peak/story height or apply for a height variance before the Board of Adjustment (also verify Independence Municipal Airport approach zone).'
        : undefined,
    });
  } else {
    checks.push({
      rule_key: 'zoning_building_height',
      category: 'zoning',
      code_citation: 'Zoning Ord. Art. 5 Table 1 & § 3.24(6)(b)',
      title: 'Building Height & Airport Approach Overlay',
      ordinance_standard: 'No fixed district cap; must clear Independence Municipal Airport approach surfaces',
      proposed_display: `${m.proposed_height_ft} ft (${m.proposed_stories} stories)`,
      verdict: m.proposed_height_ft <= 75 ? 'pass' : 'warning',
      delta_display: m.proposed_height_ft <= 75 ? 'Within standard clearance' : 'Airport review needed',
      priority: 'advisory',
      explanation:
        'Industrial districts have no fixed Table 1 height limit, but structures must comply with Independence Municipal Airport Ordinance height zones.',
    });
  }

  // 1E. Front Yard Setback
  {
    const diff = m.front_setback_ft - bulk.minFrontFt;
    checks.push({
      rule_key: 'zoning_front_setback',
      category: 'zoning',
      code_citation: `${bulk.citation} & § 3.14`,
      title: 'Minimum Front Yard Setback',
      ordinance_standard: `>= ${bulk.minFrontFt} ft from front R.O.W. line`,
      proposed_display: `${m.front_setback_ft} ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display: diff >= 0 ? `+${diff.toFixed(1)} ft clearance` : `${diff.toFixed(1)} ft encroachment`,
      priority: 'critical',
      explanation:
        diff >= 0
          ? `Front yard setback satisfies the ${bulk.minFrontFt} ft requirement (Note: § 3.14 front-yard averaging up to 50 ft applies if >=30% of block within 200 ft has deeper setbacks).`
          : `Proposed structure encroaches ${Math.abs(diff).toFixed(1)} ft into the required ${bulk.minFrontFt} ft front yard.`,
      remedy:
        diff < 0
          ? `Shift building footprint back at least ${Math.abs(diff).toFixed(1)} ft or apply for a Board of Adjustment Variance (§ 20.07).`
          : undefined,
    });
  }

  // 1F. Interior Side Yard Setback (includes Note 2 15-ft R-district buffer!)
  {
    const diff = m.side_setback_ft - bulk.minSideFt;
    checks.push({
      rule_key: 'zoning_side_setback',
      category: 'zoning',
      code_citation: `${bulk.citation} & § 3.15`,
      title: m.adjoins_r_district && !inRZone
        ? 'Side Yard Setback (Adjoining "R" District Buffer — Note 2)'
        : 'Minimum Interior Side Yard Setback',
      ordinance_standard: `>= ${bulk.minSideFt} ft`,
      proposed_display: `${m.side_setback_ft} ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display: diff >= 0 ? `+${diff.toFixed(1)} ft clearance` : `${diff.toFixed(1)} ft encroachment`,
      priority: 'critical',
      explanation:
        diff >= 0
          ? m.adjoins_r_district && !inRZone
            ? 'Satisfies the 15-ft residential transition buffer required by Table 1 Note 2 where commercial/industrial parcels adjoin an "R" District.'
            : `Interior side setback meets ${bulk.effectiveDistrictLabel} minimum.`
          : `Side yard (${m.side_setback_ft} ft) is less than the required ${bulk.minSideFt} ft minimum.`,
      remedy:
        diff < 0
          ? `Increase side setback to >= ${bulk.minSideFt} ft or pursue a side-yard exception/variance.`
          : undefined,
    });
  }

  // 1G. Corner Side Street Setback (§ 3.12 & Table 1)
  if (m.is_corner_lot) {
    const diff = m.corner_side_setback_ft - bulk.minCornerSideFt;
    checks.push({
      rule_key: 'zoning_corner_side_setback',
      category: 'zoning',
      code_citation: `${bulk.citation} & § 3.12`,
      title: 'Corner Lot Side-Street Setback',
      ordinance_standard: `>= ${bulk.minCornerSideFt} ft on abutting side street`,
      proposed_display: `${m.corner_side_setback_ft} ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display: diff >= 0 ? `+${diff.toFixed(1)} ft clearance` : `${diff.toFixed(1)} ft encroachment`,
      priority: 'critical',
      explanation:
        diff >= 0
          ? `Corner lot side-street setback meets the ${bulk.minCornerSideFt} ft street-side requirement.`
          : `Corner lot side-street setback (${m.corner_side_setback_ft} ft) violates the ${bulk.minCornerSideFt} ft requirement along the intersecting street.`,
      remedy:
        diff < 0
          ? `Relocate building footprint to maintain >= ${bulk.minCornerSideFt} ft from side street R.O.W., or petition Board of Adjustment.`
          : undefined,
    });
  } else {
    checks.push({
      rule_key: 'zoning_corner_side_setback',
      category: 'zoning',
      code_citation: 'Zoning Ord. § 1.04.75 & § 3.12',
      title: 'Corner Lot Side-Street Setback',
      ordinance_standard: 'Applies to Corner Lots only',
      proposed_display: 'Interior Lot (N/A)',
      verdict: 'na',
      delta_display: 'Not a corner lot',
      priority: 'advisory',
      explanation: 'Parcel is classified as an interior lot (§ 1.04.75); street-side corner setback does not apply.',
    });
  }

  // 1H. Rear Yard Setback
  {
    const diff = m.rear_setback_ft - bulk.minRearFt;
    checks.push({
      rule_key: 'zoning_rear_setback',
      category: 'zoning',
      code_citation: bulk.citation,
      title: m.adjoins_r_district && !inRZone
        ? 'Rear Yard Setback (Adjoining "R" District Buffer — Note 2)'
        : 'Minimum Rear Yard Setback',
      ordinance_standard: `>= ${bulk.minRearFt} ft`,
      proposed_display: `${m.rear_setback_ft} ft`,
      verdict: diff >= 0 ? 'pass' : 'fail',
      delta_display: diff >= 0 ? `+${diff.toFixed(1)} ft clearance` : `${diff.toFixed(1)} ft encroachment`,
      priority: 'critical',
      explanation:
        diff >= 0
          ? `Rear yard setback complies with ${bulk.effectiveDistrictLabel} Table 1 standards.`
          : `Principal building encroaches ${Math.abs(diff).toFixed(1)} ft into the required ${bulk.minRearFt} ft rear yard.`,
      remedy:
        diff < 0
          ? `Adjust rear building wall to maintain >= ${bulk.minRearFt} ft rear yard.`
          : undefined,
    });
  }

  // 1I. Accessory Structure Standards (Table 1 Notes 4, 5, 6 & § 3.10)
  if (m.has_accessory_structure) {
    const heightOk = m.accessory_height_ft <= 18;
    const setbackOk = m.accessory_side_rear_setback_ft >= 4;
    const covOk = m.rear_yard_coverage_pct <= 30;
    const allOk = heightOk && setbackOk && covOk;
    const issues: string[] = [];
    if (!heightOk) issues.push(`height ${m.accessory_height_ft} ft > 18 ft max`);
    if (!setbackOk) issues.push(`setback ${m.accessory_side_rear_setback_ft} ft < 4 ft min`);
    if (!covOk) issues.push(`rear yard coverage ${m.rear_yard_coverage_pct}% > 30% max`);

    checks.push({
      rule_key: 'zoning_accessory_structure',
      category: 'zoning',
      code_citation: 'Zoning Ord. § 3.10 & Art. 5 Table 1 (Notes 4, 5, 6)',
      title: 'Accessory Building Height, Setback & Rear Coverage',
      ordinance_standard: 'Height <= 18 ft (1 story); Side/Rear >= 4 ft; Rear Yard Coverage <= 30%',
      proposed_display: `${m.accessory_height_ft} ft tall · ${m.accessory_side_rear_setback_ft} ft setback · ${m.rear_yard_coverage_pct}% rear cov.`,
      verdict: allOk ? 'pass' : 'fail',
      delta_display: allOk ? 'Meets Notes 4–6' : issues.join('; '),
      priority: 'standard',
      explanation: allOk
        ? 'Detached accessory building satisfies Independence Table 1 Notes 4–6 (max 18 ft/1 story, min 4 ft rear/side setback, <=30% rear yard coverage).'
        : `Accessory structure violates Table 1 Notes 4–6: ${issues.join(', ')}.`,
      remedy: !allOk
        ? 'Keep accessory garage/shed <= 18 ft (1 story), at least 4.0 ft off side/rear lot lines, and covering <= 30% of the rear yard.'
        : undefined,
    });
  }

  // =========================================================================
  // 2. INDEPENDENCE FLOOD PLAIN ORDINANCE (IMC Ch. 167 & Zoning Art. 4)
  // =========================================================================

  const inSFHA = m.flood_zone === 'A' || m.flood_zone === 'AE' || m.flood_zone === 'FLOODWAY';

  // 2A. FEMA Buyout Open Space Deed Check (92 federally acquired parcels in Independence - 44 CFR 80.19)
  if (m.is_fema_buyout_lot) {
    checks.push({
      rule_key: 'flood_fema_buyout',
      category: 'floodplain',
      code_citation: '44 CFR § 80.19 & IMC Ch. 167 Open-Space Registry',
      title: 'FEMA Hazard Mitigation Buyout Parcel Check (92 City Parcels)',
      ordinance_standard: 'Dedicated in perpetuity to open space; no walled structures, fill, or paving',
      proposed_display: 'Flagged on Federal Buyout Registry',
      verdict: 'fail',
      delta_display: 'Deed-restricted open space',
      priority: 'critical',
      explanation:
        'Parcel is one of the 92 federally funded flood-mitigation buyout properties in Independence dedicated in perpetuity to open-space conservation.',
      remedy: 'Walled buildings, levees, paved parking, and off-site fill are permanently prohibited under federal & municipal deed restrictions.',
    });
  } else {
    checks.push({
      rule_key: 'flood_fema_buyout',
      category: 'floodplain',
      code_citation: '44 CFR § 80.19 & IMC Ch. 167',
      title: 'FEMA Hazard Mitigation Buyout Registry Check',
      ordinance_standard: 'Not one of Independence’s 92 deed-restricted FEMA open-space parcels',
      proposed_display: 'Clear — Private developable parcel',
      verdict: 'pass',
      delta_display: 'Unrestricted title',
      priority: 'standard',
      explanation: 'Parcel is clear of perpetual 44 CFR 80.19 hazard-mitigation open-space deed restrictions.',
    });
  }

  if (!inSFHA) {
    // Zone X or X_500
    checks.push({
      rule_key: 'flood_sfha_status',
      category: 'floodplain',
      code_citation: 'Zoning Ord. Art. 4 § 4.04 & IMC Ch. 167',
      title: 'FEMA FIRM Special Flood Hazard Area (SFHA) Determination',
      ordinance_standard: 'Identify 100-yr (1% annual chance) Wapsipinicon River / tributary floodplain',
      proposed_display:
        m.flood_zone === 'X_500'
          ? 'Zone X (Shaded 0.2% / 500-Yr Floodplain)'
          : 'Zone X (Outside 100-Yr & 500-Yr Floodplain)',
      verdict: m.flood_zone === 'X_500' ? 'warning' : 'pass',
      delta_display: m.flood_zone === 'X_500' ? 'Advisory 500-yr zone' : 'Outside SFHA',
      priority: 'advisory',
      explanation:
        m.flood_zone === 'X_500'
          ? 'Outside mandatory 100-yr SFHA regulatory zone, though within shaded 0.2% (500-year) Wapsipinicon flood boundary; critical facilities should elevate.'
          : 'Property lies outside the FEMA Special Flood Hazard Area on the City of Independence Flood Insurance Rate Map.',
    });
  } else {
    // Inside SFHA (Zone A, AE, or FLOODWAY)
    // 2B. Floodplain Development Permit (§ 4.05 / Ch. 167)
    checks.push({
      rule_key: 'flood_dev_permit',
      category: 'floodplain',
      code_citation: 'Zoning Ord. Art. 4 § 4.05, § 4.12 & IMC Ch. 167',
      title: 'Floodplain Development Permit & Elevation Record',
      ordinance_standard: 'Approved Floodplain Development Permit prior to grading, fill, or construction',
      proposed_display: m.has_floodplain_permit
        ? `Floodplain Permit Filed (Zone ${m.flood_zone})`
        : `Missing Floodplain Permit (Zone ${m.flood_zone})`,
      verdict: m.has_floodplain_permit ? 'pass' : 'fail',
      delta_display: m.has_floodplain_permit ? 'On file' : 'Permit required',
      priority: 'critical',
      explanation: m.has_floodplain_permit
        ? 'Floodplain Development Permit application and benchmark elevation data submitted to the Building Official (§ 4.10).'
        : 'Section 4.05 requires a Floodplain Development Permit before any construction, fill, grading, or substantial improvement in the SFHA.',
      remedy: !m.has_floodplain_permit
        ? 'Submit City of Independence Floodplain Development Permit with surveyed NGVD/NAVD88 elevations (§ 4.11.05) and Iowa DNR joint application if applicable.'
        : undefined,
    });

    // 2C. Regulatory Floodway Check
    if (m.flood_zone === 'FLOODWAY') {
      const residentialBlocked = inRZone || m.land_use === 'single_family' || m.land_use === 'two_family' || m.land_use === 'multi_family';
      const pass = !residentialBlocked && m.floodway_no_rise_cert;
      checks.push({
        rule_key: 'flood_floodway_encroachment',
        category: 'floodplain',
        code_citation: 'IMC Ch. 167 & Zoning Ord. Art. 4 §§ 4.00.03, 4.17',
        title: 'Wapsipinicon Regulatory Floodway Encroachment & No-Rise Rule',
        ordinance_standard: 'No new residential buildings; certified 0.00 ft hydraulic No-Rise & Iowa DNR permit for any encroachment',
        proposed_display: residentialBlocked
          ? `Residential/Fence Obstruction in Floodway (No-Rise: ${m.floodway_no_rise_cert ? 'Yes' : 'No'})`
          : m.floodway_no_rise_cert
            ? 'PE Certified 0.00 ft No-Rise on File'
            : 'No Hydraulic No-Rise Certification',
        verdict: pass ? 'pass' : 'fail',
        delta_display: pass ? '0.00 ft surcharge certified' : 'Prohibited Floodway obstruction',
        priority: 'critical',
        explanation: pass
          ? 'Licensed Professional Engineer hydraulic study confirms 0.00 ft rise in 100-year base flood profile.'
          : 'Encroachments, fill, new dwellings, or solid flood-obstructing barriers in the regulatory Floodway are prohibited unless certified for zero (0.00 ft) flood stage increase.',
        remedy: !pass
          ? 'Relocate development outside the regulatory Floodway or provide a Licensed PE No-Rise Certification + Iowa DNR Floodplain Permit.'
          : undefined,
      });
    }

    // 2D. Lowest Floor Elevation vs BFE + 1.0 ft Freeboard (Ch. 167 & § 4.17 / § 4.21)
    const reqLowestFloor = Number((m.bfe_ft + 1.0).toFixed(2));
    const elevDiff = Number((m.lowest_floor_elev_ft - reqLowestFloor).toFixed(2));
    const triggersSubstantial = m.substantial_improvement_pct >= 50;

    checks.push({
      rule_key: 'flood_lowest_floor_elevation',
      category: 'floodplain',
      code_citation: 'IMC Ch. 167 & Zoning Ord. Art. 4 §§ 4.11.05, 4.17, 4.21',
      title: 'Lowest Floor Elevation (>= 1.0 ft Freeboard Above BFE)',
      ordinance_standard: `>= ${reqLowestFloor.toFixed(1)} ft NAVD88 (BFE ${m.bfe_ft.toFixed(1)} ft + 1.0 ft freeboard)`,
      proposed_display: `${m.lowest_floor_elev_ft.toFixed(1)} ft NAVD88 (Impr. ratio: ${m.substantial_improvement_pct}%)`,
      verdict: elevDiff >= 0 ? 'pass' : triggersSubstantial ? 'fail' : 'warning',
      delta_display:
        elevDiff >= 0
          ? `+${(m.lowest_floor_elev_ft - m.bfe_ft).toFixed(1)} ft above BFE (+${elevDiff.toFixed(1)} ft over min)`
          : `${elevDiff.toFixed(1)} ft below required freeboard`,
      priority: 'critical',
      explanation:
        elevDiff >= 0
          ? `Proposed lowest floor (${m.lowest_floor_elev_ft.toFixed(1)} ft) clears Base Flood Elevation (${m.bfe_ft.toFixed(1)} ft) by +${(m.lowest_floor_elev_ft - m.bfe_ft).toFixed(1)} ft, satisfying the 1.0 ft freeboard mandate.`
          : triggersSubstantial
            ? `New construction / Substantial Improvement (${m.substantial_improvement_pct}% >= 50% market value threshold under § 4.21) must elevate lowest floor to >= ${reqLowestFloor.toFixed(1)} ft NAVD88.`
            : `Improvement is ${m.substantial_improvement_pct}% (< 50% Substantial Improvement threshold under § 4.21), but existing floor sits below BFE + 1.0 ft.`,
      remedy:
        elevDiff < 0
          ? `Elevate lowest habitable floor (or dry-floodproof commercial structure per § 4.11.07) to at least ${reqLowestFloor.toFixed(1)} ft NAVD88.`
          : undefined,
    });

    // 2E. Basement Prohibition in SFHA (§ 4.02.04 & § 4.02.14(d))
    checks.push({
      rule_key: 'flood_basement_prohibition',
      category: 'floodplain',
      code_citation: 'Zoning Ord. Art. 4 §§ 4.02.04 & 4.02.14(d)',
      title: 'Subgrade Basement Restriction in 100-Year Floodplain',
      ordinance_standard: 'No enclosed area below grade on all sides; sub-BFE enclosures must be unfinished & hydrostatic-vented',
      proposed_display: m.has_basement
        ? 'Includes Subgrade Basement'
        : m.has_sub_bfe_enclosure
          ? m.enclosure_vented_unfinished
            ? 'No Basement; Vented Unfinished Crawl/Access'
            : 'Unvented / Finished Sub-BFE Enclosure'
          : 'Slab / Elevated Above Grade (No Basement)',
      verdict: m.has_basement || (m.has_sub_bfe_enclosure && !m.enclosure_vented_unfinished) ? 'fail' : 'pass',
      delta_display: m.has_basement
        ? 'Subgrade basement prohibited'
        : m.has_sub_bfe_enclosure && !m.enclosure_vented_unfinished
          ? 'Missing flood vents / unfinished spec'
          : 'Compliant foundation',
      priority: 'critical',
      explanation: m.has_basement
        ? 'Section 4.02.04 & 4.02.14(d) classify any subgrade basement as the Lowest Floor, prohibiting below-BFE residential basements in SFHAs.'
        : m.has_sub_bfe_enclosure && !m.enclosure_vented_unfinished
          ? 'Under § 4.02.14(a)-(b), enclosed areas below BFE must have automatic flood openings and unfinished Materials (no drywall/carpet) used solely for parking, access, or storage.'
          : 'Foundation avoids prohibited subgrade basements and satisfies § 4.02.14 criteria.',
      remedy:
        m.has_basement || (m.has_sub_bfe_enclosure && !m.enclosure_vented_unfinished)
          ? 'Eliminate subgrade basement; fill to grade or use engineered hydrostatic flood vents with unfinished flood-resistant materials.'
          : undefined,
    });

    // 2F. Machinery, HVAC & Service Facilities Elevation (Zoning § 4.02.14(c) — +3.0 ft rule in enclosed areas!)
    const reqMachineryOffset = m.has_sub_bfe_enclosure ? 3.0 : 1.0;
    const reqMachineryElev = Number((m.bfe_ft + reqMachineryOffset).toFixed(2));
    const machDiff = Number((m.machinery_elev_ft - reqMachineryElev).toFixed(2));

    checks.push({
      rule_key: 'flood_machinery_elevation',
      category: 'floodplain',
      code_citation: m.has_sub_bfe_enclosure
        ? 'Zoning Ord. Art. 4 § 4.02.14(c) (+3.0 ft Enclosed Area Rule)'
        : 'IMC Ch. 167 & Zoning Ord. Art. 4 § 4.16',
      title: 'Mechanical, HVAC, Water Heater & Electrical Service Elevation',
      ordinance_standard: m.has_sub_bfe_enclosure
        ? `>= ${reqMachineryElev.toFixed(1)} ft NAVD88 (BFE + 3.0 ft required inside sub-BFE enclosed area per § 4.02.14(c))`
        : `>= ${reqMachineryElev.toFixed(1)} ft NAVD88 (BFE + 1.0 ft minimum utility protection)`,
      proposed_display: `${m.machinery_elev_ft.toFixed(1)} ft NAVD88`,
      verdict: machDiff >= 0 ? 'pass' : 'fail',
      delta_display:
        machDiff >= 0
          ? `+${(m.machinery_elev_ft - m.bfe_ft).toFixed(1)} ft above BFE`
          : `${machDiff.toFixed(1)} ft below § 4.02.14(c) threshold`,
      priority: 'critical',
      explanation:
        machDiff >= 0
          ? 'Furnace, water heater, HVAC condenser, and electrical panel meet Independence flood elevation protection.'
          : m.has_sub_bfe_enclosure
            ? `Independence Zoning Ordinance § 4.02.14(c) specifically requires machinery and service facilities (water heater, furnace, electrical service) in an enclosed area to be located at least three (3) feet above the 100-year flood level (${reqMachineryElev.toFixed(1)} ft).`
            : `Mechanical and electrical equipment must be elevated or floodproofed to at least ${reqMachineryElev.toFixed(1)} ft NAVD88.`,
      remedy:
        machDiff < 0
          ? `Relocate furnace, water heater, and electrical service panel to upper floor or elevated platform >= ${reqMachineryElev.toFixed(1)} ft NAVD88.`
          : undefined,
    });
  }

  // =========================================================================
  // 3. INDEPENDENCE FENCE ORDINANCE (IMC Chapter 152 & Zoning §§ 1.04.44-45)
  // =========================================================================

  if (!m.includes_fence) {
    checks.push({
      rule_key: 'fence_not_included',
      category: 'fence',
      code_citation: 'IMC Chapter 152 (§§ 152.01–152.03)',
      title: 'Fence, Wall, or Hedge Scope',
      ordinance_standard: 'IMC Ch. 152 applies when erecting, enlarging, altering, or reconstructing a fence/wall/hedge',
      proposed_display: 'No fence in scope',
      verdict: 'na',
      delta_display: 'N/A — No fence proposed',
      priority: 'advisory',
      explanation: 'No fence, boundary wall, or regulated hedge is included in this application.',
    });
  } else {
    // 3A. Fence Permit & Iowa One Call 811 Locate (IMC § 152.03)
    const has811 = m.iowa_one_call_811.trim().length > 0;
    const permitReady = m.has_fence_permit_app && has811;
    checks.push({
      rule_key: 'fence_permit_811',
      category: 'fence',
      code_citation: 'IMC § 152.03',
      title: 'Written Fence Permit Application & Utility Locate (811)',
      ordinance_standard: 'Written application to Building Inspector (location & height) + Iowa One Call 811 ticket',
      proposed_display: `${m.has_fence_permit_app ? 'Permit App Filed' : 'No Permit App'} · 811: ${has811 ? m.iowa_one_call_811 : 'Pending'}`,
      verdict: permitReady ? 'pass' : m.has_fence_permit_app ? 'warning' : 'fail',
      delta_display: permitReady
        ? 'Application & 811 verified'
        : !m.has_fence_permit_app
          ? 'Missing § 152.03 application'
          : 'Awaiting 811 ticket #',
      priority: 'standard',
      explanation: permitReady
        ? 'Written Fence Permit application with height/site sketch and Iowa One Call 811 locate ticket are on file.'
        : 'IMC § 152.03 prohibits erecting, enlarging, altering, or reconstructing any fence, wall, or hedge without first applying in writing to the Building Inspector.',
      remedy: !permitReady
        ? 'Submit signed IMC § 152.03 Fence Permit Application with parcel sketch and record Iowa One Call 811 utility locate ticket prior to digging post holes.'
        : undefined,
    });

    // 3B. Corner Lot 20-ft Vision Clearance Triangle (IMC § 152.01 & Zoning Fig. 4C)
    if (m.is_corner_lot) {
      const diff = 3.0 - m.fence_corner_triangle_height_ft;
      checks.push({
        rule_key: 'fence_corner_sight_triangle',
        category: 'fence',
        code_citation: 'IMC § 152.01 & Zoning Fig. 4C',
        title: 'Corner Lot 20-Ft Intersection Sight Triangle Height',
        ordinance_standard: '<= 3\' 0" (3.0 ft) above curb grade within 20 ft x 20 ft street intersection triangle',
        proposed_display:
          m.fence_corner_triangle_height_ft === 0
            ? '0 ft (Kept clear of 20-ft triangle)'
            : fmtFeetInches(m.fence_corner_triangle_height_ft),
        verdict: diff >= 0 ? 'pass' : 'fail',
        delta_display:
          diff >= 0
            ? m.fence_corner_triangle_height_ft === 0
              ? 'Clear of sight triangle'
              : `${diff.toFixed(1)} ft under 3'0" cap`
            : `+${Math.abs(diff).toFixed(1)} ft over 3'0" limit`,
        priority: 'critical',
        explanation:
          diff >= 0
            ? 'Complies with IMC § 152.01 traffic visibility restriction across corner street intersections.'
            : 'IMC § 152.01 prohibits any fence, wall, structure, or foliage higher than 3 feet above established curb grade within the triangle bounded by street lines 20 feet from their intersection.',
        remedy:
          diff < 0
            ? 'Lower fence/hedge height to <= 3\' 0" (36 inches) inside the 20 ft x 20 ft corner intersection triangle, or route fence behind the sight line.'
            : undefined,
      });
    } else {
      checks.push({
        rule_key: 'fence_corner_sight_triangle',
        category: 'fence',
        code_citation: 'IMC § 152.01',
        title: 'Corner Lot 20-Ft Intersection Sight Triangle',
        ordinance_standard: '<= 3\' 0" height within 20 ft x 20 ft street intersection triangle',
        proposed_display: 'Interior Lot (N/A)',
        verdict: 'na',
        delta_display: 'Interior parcel',
        priority: 'advisory',
        explanation: 'IMC § 152.01 street intersection sight triangle applies to corner lots.',
      });
    }

    // 3C. Front Yard Fence Height (IMC § 152.02 — max 4'0")
    if (m.fence_yard_location === 'front' || m.fence_yard_location === 'both') {
      const diff = 4.0 - m.fence_front_height_ft;
      checks.push({
        rule_key: 'fence_front_height',
        category: 'fence',
        code_citation: 'IMC § 152.02',
        title: 'Required Front Yard Fence / Hedge Height',
        ordinance_standard: '<= 4\' 0" (4.0 ft / 48 inches) in any required front yard',
        proposed_display: fmtFeetInches(m.fence_front_height_ft),
        verdict: diff >= 0 ? 'pass' : 'fail',
        delta_display:
          diff >= 0
            ? `${(diff * 12).toFixed(0)}" below 4'0" max`
            : `+${(Math.abs(diff) * 12).toFixed(0)}" over 4'0" max`,
        priority: 'critical',
        explanation:
          diff >= 0
            ? 'Proposed front yard fence height satisfies IMC § 152.02 (<= 4 feet).'
            : `Front yard fence height (${fmtFeetInches(m.fence_front_height_ft)}) exceeds the 4' 0" maximum allowed in required front yards across all Zoning Districts.`,
        remedy:
          diff < 0
            ? 'Reduce front-yard fence height to <= 4\' 0" (48 in) or terminate the taller fence behind the front building setback line.'
            : undefined,
      });
    }

    // 3D. Side & Rear Yard Fence Height (IMC § 152.02 — max 6'6" = 6.5 ft)
    if (m.fence_yard_location === 'rear_side' || m.fence_yard_location === 'both') {
      const diff = 6.5 - m.fence_side_rear_height_ft;
      checks.push({
        rule_key: 'fence_side_rear_height',
        category: 'fence',
        code_citation: 'IMC § 152.02 & Zoning Figs. 8A–8C',
        title: 'Side & Rear Yard Fence Height Limit',
        ordinance_standard: '<= 6\' 6" (6.5 ft / 78 inches) in any required side or rear yard',
        proposed_display: fmtFeetInches(m.fence_side_rear_height_ft),
        verdict: diff >= 0 ? 'pass' : 'fail',
        delta_display:
          diff >= 0
            ? `${Math.round(diff * 12)}" below 6'6" max`
            : `+${Math.round(Math.abs(diff) * 12)}" over 6'6" max`,
        priority: 'critical',
        explanation:
          diff >= 0
            ? 'Proposed side/rear fence height complies with Independence IMC § 152.02 (6 ft 6 in maximum).'
            : `Proposed height (${fmtFeetInches(m.fence_side_rear_height_ft)}) exceeds Independence's strict 6' 6" (78-inch) maximum for side and rear yards.`,
        remedy:
          diff < 0
            ? 'Specify 6\' 0" or 6\' 6" max post/panel height to comply with IMC § 152.02.'
            : undefined,
      });
    }

    // 3E. 3-Foot Property Line Setback OR Written Neighbor Fence Agreement (IMC § 152.02 & § 1.04.45)
    {
      const setback = m.fence_property_line_setback_ft;
      const inROW = setback < 0;
      const withinThreeFeet = setback >= 0 && setback < 3.0;
      const pass = !inROW && (setback >= 3.0 || m.has_neighbor_fence_agreement);

      checks.push({
        rule_key: 'fence_property_line_agreement',
        category: 'fence',
        code_citation: 'IMC § 152.02 & Zoning § 1.04.45',
        title: '3-Foot Side/Rear Lot Line Setback & Neighbor Fence Agreement',
        ordinance_standard:
          '>= 3.0 ft inside side/rear property line, OR >= 0.0 ft with signed Neighbor Fence Agreement filed with City',
        proposed_display: `${setback.toFixed(1)} ft from lot line · Neighbor Agreement: ${m.has_neighbor_fence_agreement ? 'Signed & Filed' : 'Not Filed'}`,
        verdict: pass ? 'pass' : 'fail',
        delta_display: inROW
          ? 'Encroaches past lot line / R.O.W.'
          : setback >= 3.0
            ? `${setback.toFixed(1)} ft setback (>= 3.0 ft)`
            : m.has_neighbor_fence_agreement
              ? 'Authorized via Neighbor Agreement'
              : `${(3.0 - setback).toFixed(1)} ft short without Agreement`,
        priority: 'critical',
        explanation: inROW
          ? 'Zoning §§ 1.04.44–45 require the fence centerline to be located inside the designated property line; placement in City right-of-way or across lot lines is prohibited.'
          : setback >= 3.0
            ? 'Fence maintains at least 3.0 feet of maintenance clearance inside the side/rear lot line per IMC § 152.02.'
            : m.has_neighbor_fence_agreement
              ? 'Signed written Neighbor Fence Agreement between adjoining property owners is on file with the City Building Official per IMC § 152.02.'
              : `IMC § 152.02 prohibits placing any fence, wall, or hedge within 3 feet of a side or rear property line (proposed: ${setback.toFixed(1)} ft) unless a written Neighbor Fence Agreement signed by the adjoining owner is filed with the City.`,
        remedy: !pass
          ? inROW
            ? 'Relocate fence inside the surveyed property boundary.'
            : 'Either shift the fence line to >= 3.0 ft inside your property line OR file the official City of Independence Neighbor Fence Agreement signed by the abutting owner.'
          : undefined,
      });
    }

    // 3F. Fence Materials & Barbed Wire Standards (Zoning §§ 1.04.44 & 1.04.45)
    {
      if (inRZone) {
        const bannedMaterial =
          m.fence_material === 'corrugated_metal' ||
          m.fence_material === 'salvage' ||
          m.fence_material === 'barbed_wire';
        const hasBarbed = m.has_barbed_wire || m.fence_material === 'barbed_wire';
        const pass = !bannedMaterial && !hasBarbed;

        checks.push({
          rule_key: 'fence_materials',
          category: 'fence',
          code_citation: 'Zoning Ord. Art. 1 § 1.04.45 (Residential Fence)',
          title: 'Residential Fence Material & Barbed-Wire Prohibition',
          ordinance_standard:
            'Customary landscape fencing (lumber, vinyl, chain link, wrought iron, masonry); NO corrugated sheet metal, barbed wire, or salvage material',
          proposed_display: `${materialLabel(m.fence_material)}${m.has_barbed_wire ? ' + Barbed Wire' : ''}`,
          verdict: pass ? 'pass' : 'fail',
          delta_display: pass ? 'Approved "R" District material' : 'Prohibited material in "R" District',
          priority: 'critical',
          explanation: pass
            ? `${materialLabel(m.fence_material)} is an approved residential landscape fencing material under § 1.04.45.`
            : 'Independence Zoning Ordinance § 1.04.45 expressly prohibits corrugated sheet metal, barbed wire, and salvage material in any "R" Residential District.',
          remedy: !pass
            ? 'Replace prohibited material with lumber/wood, vinyl, ornamental iron/aluminum, masonry block, or standard chain link without barbed wire.'
            : undefined,
        });
      } else {
        // Non-residential district (§ 1.04.44)
        const isSalvage = m.fence_material === 'salvage';
        const isAgExempt = m.zoning_district === 'A-1';
        const invalidBarbed =
          !isAgExempt &&
          (m.has_barbed_wire || m.fence_material === 'barbed_wire') &&
          m.barbed_wire_height_ft < 6.0;
        const pass = !isSalvage && !invalidBarbed;

        checks.push({
          rule_key: 'fence_materials',
          category: 'fence',
          code_citation: 'Zoning Ord. Art. 1 § 1.04.44 (Non-Residential Fence)',
          title: 'Non-Residential Fence Material & Barbed-Wire Clearance',
          ordinance_standard:
            'No salvage material; barbed wire prohibited closer than 6\' 0" (6.0 ft) to ground (except A-1 agricultural)',
          proposed_display: `${materialLabel(m.fence_material)}${m.has_barbed_wire ? ` (Barbed wire at ${m.barbed_wire_height_ft.toFixed(1)} ft)` : ''}`,
          verdict: pass ? 'pass' : 'fail',
          delta_display: pass
            ? 'Complies with § 1.04.44'
            : isSalvage
              ? 'Salvage material prohibited'
              : `Barbed wire too low (${m.barbed_wire_height_ft.toFixed(1)} ft < 6.0 ft)`,
          priority: 'standard',
          explanation: pass
            ? 'Proposed commercial/industrial fence material satisfies § 1.04.44.'
            : isSalvage
              ? 'Section 1.04.44 prohibits salvage materials for non-residential fencing.'
              : `Section 1.04.44 prohibits barbed wire closer than 6 feet to the ground in non-residential districts (proposed at ${m.barbed_wire_height_ft.toFixed(1)} ft).`,
          remedy: !pass
            ? isSalvage
              ? 'Specify new commercial-grade fencing materials.'
              : 'Mount security barbed-wire strands at least 6.0 feet above finished grade (note: total side/rear fence height cap under IMC § 152.02 is 6\' 6").'
            : undefined,
        });
      }
    }
  }

  let pass_count = 0;
  let fail_count = 0;
  let warning_count = 0;
  let na_count = 0;

  for (const c of checks) {
    if (c.verdict === 'pass') pass_count++;
    else if (c.verdict === 'fail') fail_count++;
    else if (c.verdict === 'warning') warning_count++;
    else na_count++;
  }

  const overall_verdict: EvaluationSummary['overall_verdict'] =
    fail_count > 0 ? 'violations_found' : warning_count > 0 ? 'action_required' : 'compliant';

  return {
    overall_verdict,
    pass_count,
    fail_count,
    warning_count,
    na_count,
    effective_bulk_district: bulk.effectiveDistrictLabel,
    checks,
  };
}
