import React from 'react';
import type { ProjectMeasurements } from '../../types';

interface SitePlanDiagramProps {
  measurements: ProjectMeasurements;
}

export const SitePlanDiagram: React.FC<SitePlanDiagramProps> = ({ measurements: m }) => {
  // Compute required setbacks cleanly on client for visual comparison envelope
  const getReqSetbacks = () => {
    const d = m.zoning_district;
    const u = m.land_use;
    let eff = d;
    if (d === 'R/C-1') {
      eff = u === 'commercial' && !m.adjoins_r_district ? 'C-2' : 'R-2';
    }
    if (eff === 'A-1') return { front: 58, side: 35, corner: 58, rear: 58 };
    if (eff === 'R-1')
      return u === 'other_permitted'
        ? { front: 40, side: 16, corner: 40, rear: 40 }
        : { front: 25, side: 8, corner: 25, rear: 30 };
    if (eff === 'R-2')
      return u === 'two_family'
        ? { front: 25, side: 7, corner: 25, rear: 25 }
        : { front: 25, side: 5, corner: 25, rear: 25 };
    if (eff === 'R-3')
      return u === 'multi_family'
        ? { front: 20, side: 10, corner: 25, rear: 35 }
        : { front: 20, side: 5, corner: 25, rear: 30 };
    if (eff === 'R-4') return { front: 20, side: 8, corner: 25, rear: 25 };
    if (eff === 'C-1')
      return {
        front: 0,
        side: m.adjoins_r_district ? 15 : 0,
        corner: 0,
        rear: m.adjoins_r_district ? 15 : 0,
      };
    if (eff === 'C-2')
      return {
        front: 25,
        side: m.adjoins_r_district ? 15 : 0,
        corner: 25,
        rear: m.adjoins_r_district ? 15 : 0,
      };
    return {
      front: 25,
      side: m.adjoins_r_district ? 15 : 10,
      corner: 25,
      rear: m.adjoins_r_district ? 15 : 0,
    };
  };

  const req = getReqSetbacks();
  const lotW = Math.max(40, Math.min(240, m.lot_width_ft || 80));
  const lotD = Math.max(80, Math.min(300, m.lot_depth_ft || 130));

  // SVG coordinate system (360 x 280)
  const parcelX = 75;
  const parcelY = 28;
  const parcelW = 205;
  const parcelH = 195;

  const scaleX = parcelW / lotW;
  const scaleY = parcelH / lotD;

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Required envelope
  const reqLeft = parcelX + clamp(req.side * scaleX, 0, parcelW * 0.42);
  const reqRightInset = m.is_corner_lot ? req.corner : req.side;
  const reqRight = parcelX + parcelW - clamp(reqRightInset * scaleX, 0, parcelW * 0.42);
  const reqBottom = parcelY + parcelH - clamp(req.front * scaleY, 0, parcelH * 0.42);
  const reqTop = parcelY + clamp(req.rear * scaleY, 0, parcelH * 0.42);

  // Proposed footprint
  const propLeft = parcelX + clamp(m.side_setback_ft * scaleX, 2, parcelW * 0.45);
  const propRightInset = m.is_corner_lot ? m.corner_side_setback_ft : m.side_setback_ft;
  const propRight = parcelX + parcelW - clamp(propRightInset * scaleX, 2, parcelW * 0.45);
  const propBottom = parcelY + parcelH - clamp(m.front_setback_ft * scaleY, 2, parcelH * 0.45);
  const propTop = parcelY + clamp(m.rear_setback_ft * scaleY, 18, parcelH * 0.52);

  const setbackViolation =
    m.front_setback_ft < req.front ||
    m.side_setback_ft < req.side ||
    m.rear_setback_ft < req.rear ||
    (m.is_corner_lot && m.corner_side_setback_ft < req.corner);

  const fenceViolation =
    m.includes_fence &&
    ((m.fence_property_line_setback_ft < 3.0 && !m.has_neighbor_fence_agreement) ||
      m.fence_property_line_setback_ft < 0 ||
      ((m.fence_yard_location === 'rear_side' || m.fence_yard_location === 'both') &&
        m.fence_side_rear_height_ft > 6.5) ||
      ((m.fence_yard_location === 'front' || m.fence_yard_location === 'both') &&
        m.fence_front_height_ft > 4.0) ||
      (m.is_corner_lot && m.fence_corner_triangle_height_ft > 3.0));

  const fenceOffsetPx = m.includes_fence
    ? clamp(m.fence_property_line_setback_ft * scaleX * 1.4, 2, 22)
    : 0;

  // 20-ft x 20-ft corner sight triangle at Front + Side Street intersection (bottom-right corner)
  const triSizeX = clamp(20 * scaleX, 24, 52);
  const triSizeY = clamp(20 * scaleY, 24, 52);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Parcel Setback &amp; Fence Schematic
          </h4>
          <p className="text-xs text-slate-600">
            {m.zoning_district} ({m.lot_width_ft}&apos; &times; {m.lot_depth_ft}&apos;) &middot;{' '}
            {m.is_corner_lot ? 'Corner Lot (§ 152.01 Sight Triangle)' : 'Interior Lot'}
          </p>
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            setbackViolation || fenceViolation
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {setbackViolation || fenceViolation ? 'Encroachment Flagged' : 'Envelope Clear'}
        </span>
      </div>

      <svg
        viewBox="0 0 360 272"
        className="w-full h-auto rounded-lg bg-slate-50 border border-slate-200/80"
        role="img"
        aria-label="Parcel setback, fence line, and corner vision triangle schematic"
      >
        {/* Subtle engineering grid */}
        <defs>
          <pattern id="parcelGrid" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="360" height="272" fill="url(#parcelGrid)" />

        {/* Front Street R.O.W. */}
        <rect x="0" y="232" width="360" height="40" fill="#cbd5e1" opacity="0.55" />
        <line x1="0" y1="232" x2="360" y2="232" stroke="#64748b" strokeWidth="1.2" />
        <text
          x="175"
          y="255"
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#334155"
          letterSpacing="1"
        >
          FRONT STREET RIGHT-OF-WAY
        </text>

        {/* Optional Corner Intersecting Side Street on Right */}
        {m.is_corner_lot && (
          <>
            <rect x="290" y="0" width="70" height="272" fill="#cbd5e1" opacity="0.55" />
            <line x1="290" y1="0" x2="290" y2="232" stroke="#64748b" strokeWidth="1.2" />
            <text
              x="325"
              y="128"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#334155"
              transform="rotate(90 325 128)"
              letterSpacing="0.8"
            >
              SIDE STREET R.O.W.
            </text>
          </>
        )}

        {/* Parcel Boundary */}
        <rect
          x={parcelX}
          y={parcelY}
          width={parcelW}
          height={parcelH}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth="1.8"
        />

        {/* Required Setback Envelope (Dashed Civic Blue) */}
        <rect
          x={reqLeft}
          y={reqTop}
          width={Math.max(16, reqRight - reqLeft)}
          height={Math.max(16, reqBottom - reqTop)}
          fill="#dbeafe"
          fillOpacity="0.35"
          stroke="#2563eb"
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />

        {/* Proposed Fence Line (IMC Ch. 152) */}
        {m.includes_fence && (
          <path
            d={
              m.fence_yard_location === 'front'
                ? `M ${parcelX + fenceOffsetPx} ${reqBottom} L ${parcelX + fenceOffsetPx} ${parcelY + parcelH - 4} L ${parcelX + parcelW - fenceOffsetPx} ${parcelY + parcelH - 4} L ${parcelX + parcelW - fenceOffsetPx} ${reqBottom}`
                : m.fence_yard_location === 'both'
                  ? `M ${parcelX + fenceOffsetPx} ${parcelY + fenceOffsetPx} L ${parcelX + parcelW - fenceOffsetPx} ${parcelY + fenceOffsetPx} L ${parcelX + parcelW - fenceOffsetPx} ${parcelY + parcelH - 4} L ${parcelX + fenceOffsetPx} ${parcelY + parcelH - 4} Z`
                  : `M ${parcelX + fenceOffsetPx} ${propBottom - 8} L ${parcelX + fenceOffsetPx} ${parcelY + fenceOffsetPx} L ${parcelX + parcelW - fenceOffsetPx} ${parcelY + fenceOffsetPx} L ${parcelX + parcelW - fenceOffsetPx} ${propBottom - 8}`
            }
            fill="none"
            stroke={fenceViolation ? '#dc2626' : '#0d9488'}
            strokeWidth="2.4"
            strokeDasharray="6 2"
          />
        )}

        {/* Accessory Building in Rear Yard */}
        {m.has_accessory_structure && (
          <g>
            <rect
              x={parcelX + 12}
              y={parcelY + 10}
              width="46"
              height="32"
              rx="2"
              fill={
                m.accessory_height_ft > 18 ||
                m.accessory_side_rear_setback_ft < 4 ||
                m.rear_yard_coverage_pct > 30
                  ? '#fecdd3'
                  : '#e2e8f0'
              }
              stroke={
                m.accessory_height_ft > 18 ||
                m.accessory_side_rear_setback_ft < 4 ||
                m.rear_yard_coverage_pct > 30
                  ? '#dc2626'
                  : '#475569'
              }
              strokeWidth="1.3"
            />
            <text x={parcelX + 35} y={parcelY + 29} textAnchor="middle" fontSize="8" fill="#1e293b">
              Garage
            </text>
          </g>
        )}

        {/* Proposed Principal Structure */}
        <rect
          x={propLeft}
          y={Math.max(parcelY + (m.has_accessory_structure ? 48 : 8), propTop)}
          width={Math.max(24, propRight - propLeft)}
          height={Math.max(
            24,
            propBottom - Math.max(parcelY + (m.has_accessory_structure ? 48 : 8), propTop)
          )}
          rx="3"
          fill={setbackViolation ? '#fee2e2' : '#dcfce7'}
          stroke={setbackViolation ? '#dc2626' : '#059669'}
          strokeWidth="1.8"
        />
        <text
          x={(propLeft + propRight) / 2}
          y={
            (Math.max(parcelY + (m.has_accessory_structure ? 48 : 8), propTop) + propBottom) / 2 + 3
          }
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="600"
          fill={setbackViolation ? '#991b1b' : '#065f46'}
        >
          Proposed ({m.proposed_height_ft}&apos;)
        </text>

        {/* IMC § 152.01 20'x20' Corner Lot Vision Clearance Triangle */}
        {m.is_corner_lot && (
          <g>
            <polygon
              points={`${parcelX + parcelW},${parcelY + parcelH} ${parcelX + parcelW - triSizeX},${parcelY + parcelH} ${parcelX + parcelW},${parcelY + parcelH - triSizeY}`}
              fill={
                m.includes_fence && m.fence_corner_triangle_height_ft > 3.0 ? '#ef4444' : '#f59e0b'
              }
              fillOpacity="0.35"
              stroke={
                m.includes_fence && m.fence_corner_triangle_height_ft > 3.0 ? '#b91c1c' : '#d97706'
              }
              strokeWidth="1.5"
            />
            <text
              x={parcelX + parcelW - 6}
              y={parcelY + parcelH - 6}
              textAnchor="end"
              fontSize="7.5"
              fontWeight="700"
              fill="#7c2d12"
            >
              20&apos; Sight &le;3&apos;
            </text>
          </g>
        )}

        {/* Setback Callout Labels */}
        <text x={(parcelX + parcelX + parcelW) / 2} y={parcelY - 7} textAnchor="middle" fontSize="9" fill="#334155">
          Rear: {m.rear_setback_ft}&apos; (min {req.rear}&apos;)
        </text>
        <text
          x={(parcelX + parcelX + parcelW) / 2}
          y={parcelY + parcelH - 5}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="600"
          fill={m.front_setback_ft < req.front ? '#b91c1c' : '#1e3a8a'}
        >
          Front: {m.front_setback_ft}&apos; (min {req.front}&apos;)
        </text>
        <text
          x={parcelX - 6}
          y={parcelY + parcelH / 2}
          textAnchor="end"
          fontSize="8.5"
          fill={m.side_setback_ft < req.side ? '#b91c1c' : '#334155'}
        >
          Side {m.side_setback_ft}&apos;
        </text>
        <text x={parcelX - 6} y={parcelY + parcelH / 2 + 11} textAnchor="end" fontSize="8" fill="#64748b">
          (min {req.side}&apos;)
        </text>

        {m.is_corner_lot ? (
          <text
            x={parcelX + parcelW - 4}
            y={parcelY + 14}
            textAnchor="end"
            fontSize="8"
            fontWeight="600"
            fill={m.corner_side_setback_ft < req.corner ? '#b91c1c' : '#1e3a8a'}
          >
            Corner Side: {m.corner_side_setback_ft}&apos; (min {req.corner}&apos;)
          </text>
        ) : null}
      </svg>

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-600 inline-block" />
          Table 1 Setback Line
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-600 inline-block" />
          Building Footprint
        </span>
        {m.includes_fence && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-3 h-0.5 border-t-2 border-dashed inline-block ${
                fenceViolation ? 'border-rose-600' : 'border-teal-600'
              }`}
            />
            Fence ({m.fence_property_line_setback_ft}&apos; off lot line)
          </span>
        )}
        {m.is_corner_lot && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-200 border border-amber-600 inline-block" />
            20&apos;&times;20&apos; Sight Triangle (&le;3&apos;0&quot;)
          </span>
        )}
      </div>
    </div>
  );
};
