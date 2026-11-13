import React from 'react';
import type { ProjectMeasurements } from '../../types';

interface FloodplainCrossSectionProps {
  measurements: ProjectMeasurements;
}

export const FloodplainCrossSection: React.FC<FloodplainCrossSectionProps> = ({
  measurements: m,
}) => {
  const inSFHA = m.flood_zone === 'A' || m.flood_zone === 'AE' || m.flood_zone === 'FLOODWAY';
  const bfe = m.bfe_ft || 922.0;
  const reqFloor = bfe + 1.0;
  const reqMachOffset = m.has_sub_bfe_enclosure ? 3.0 : 1.0;
  const reqMach = bfe + reqMachOffset;

  // Map elevation relative to BFE into SVG Y coordinates (BFE sits at y = 148)
  const bfeY = 148;
  const pxPerFoot = 14;
  const elevToY = (elev: number) => {
    const delta = elev - bfe;
    return Math.max(24, Math.min(205, bfeY - delta * pxPerFoot));
  };

  const reqFloorY = elevToY(reqFloor);
  const reqMachY = elevToY(reqMach);
  const propFloorY = elevToY(m.lowest_floor_elev_ft);
  const propMachY = elevToY(m.machinery_elev_ft);

  const floorFail = inSFHA && m.lowest_floor_elev_ft < reqFloor;
  const machFail = inSFHA && m.machinery_elev_ft < reqMach;
  const floodwayFail = m.flood_zone === 'FLOODWAY' && !m.floodway_no_rise_cert;
  const anyFail = floorFail || machFail || floodwayFail || m.is_fema_buyout_lot || (inSFHA && m.has_basement);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Wapsipinicon Floodplain Cross-Section (Zoning Fig. 1)
          </h4>
          <p className="text-xs text-slate-600 tabular-nums">
            FEMA Zone <span className="font-semibold text-slate-800">{m.flood_zone}</span> &middot;
            BFE {bfe.toFixed(1)} ft NAVD88
          </p>
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            !inSFHA && !m.is_fema_buyout_lot
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : anyFail
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {!inSFHA && !m.is_fema_buyout_lot
            ? 'Outside 100-Yr SFHA'
            : anyFail
              ? 'Floodplain Deficit'
              : 'Freeboard Compliant'}
        </span>
      </div>

      <svg
        viewBox="0 0 360 228"
        className="w-full h-auto rounded-lg bg-gradient-to-b from-sky-50/70 to-slate-50 border border-slate-200/80"
        role="img"
        aria-label="Wapsipinicon River floodplain elevation cross-section diagram"
      >
        {/* 100-Yr Floodwater Fill up to BFE */}
        <rect
          x="0"
          y={bfeY}
          width="360"
          height={228 - bfeY}
          fill={inSFHA ? '#38bdf8' : '#bae6fd'}
          fillOpacity={inSFHA ? '0.28' : '0.18'}
        />

        {/* River channel & natural bank ground profile */}
        <path
          d="M 0 198 Q 45 224 85 196 L 145 162 L 360 156 L 360 228 L 0 228 Z"
          fill="#cbd5e1"
        />
        <path
          d="M 0 198 Q 45 224 85 196 L 145 162 L 360 156"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
        />

        {/* Wapsipinicon River Channel Label */}
        <text x="45" y="212" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#0369a1">
          Wapsipinicon
        </text>
        <text x="45" y="222" textAnchor="middle" fontSize="7.5" fill="#0369a1">
          Floodway
        </text>

        {/* Base Flood Elevation (BFE) Line */}
        <line
          x1="0"
          y1={bfeY}
          x2="360"
          y2={bfeY}
          stroke="#0284c7"
          strokeWidth="1.6"
          strokeDasharray="6 3"
        />
        <text x="8" y={bfeY - 4} fontSize="8.5" fontWeight="700" fill="#0369a1">
          100-Yr BFE: {bfe.toFixed(1)}&apos;
        </text>

        {/* Required BFE + 1.0 ft Lowest Floor Line */}
        <line
          x1="125"
          y1={reqFloorY}
          x2="352"
          y2={reqFloorY}
          stroke="#2563eb"
          strokeWidth="1.1"
          strokeDasharray="3 3"
        />
        <text x="352" y={reqFloorY - 3} textAnchor="end" fontSize="8" fontWeight="600" fill="#1d4ed8">
          Min Floor (+1&apos;): {reqFloor.toFixed(1)}&apos;
        </text>

        {/* Required BFE + 3.0 ft Machinery Line when sub-BFE enclosure exists (§ 4.02.14c) */}
        {m.has_sub_bfe_enclosure && (
          <>
            <line
              x1="125"
              y1={reqMachY}
              x2="352"
              y2={reqMachY}
              stroke="#7c3aed"
              strokeWidth="1.1"
              strokeDasharray="2 2"
            />
            <text x="352" y={reqMachY - 3} textAnchor="end" fontSize="8" fontWeight="600" fill="#6d28d9">
              § 4.02.14(c) HVAC (+3&apos;): {reqMach.toFixed(1)}&apos;
            </text>
          </>
        )}

        {/* Structure Cross-Section */}
        <g>
          {/* Foundation / Sub-BFE Enclosure or Basement */}
          <rect
            x="175"
            y={propFloorY}
            width="86"
            height={Math.max(10, (m.has_basement ? bfeY + 26 : 160) - propFloorY)}
            fill={m.has_basement && inSFHA ? '#fecdd3' : '#e2e8f0'}
            stroke="#475569"
            strokeWidth="1.4"
          />

          {/* Hydrostatic Vents indicator if sub-BFE enclosure */}
          {m.has_sub_bfe_enclosure && m.enclosure_vented_unfinished && (
            <>
              <rect x="180" y={bfeY - 5} width="8" height="5" fill="#0284c7" />
              <rect x="248" y={bfeY - 5} width="8" height="5" fill="#0284c7" />
            </>
          )}

          {/* Superstructure above Lowest Floor */}
          <rect
            x="172"
            y={Math.max(26, propFloorY - 46)}
            width="92"
            height="46"
            fill={floorFail ? '#fee2e2' : '#f8fafc'}
            stroke={floorFail ? '#dc2626' : '#0f172a'}
            strokeWidth="1.6"
          />
          {/* Pitched Roof */}
          <polygon
            points={`166,${Math.max(26, propFloorY - 46)} 218,${Math.max(10, propFloorY - 68)} 270,${Math.max(26, propFloorY - 46)}`}
            fill="#334155"
          />

          {/* Proposed Lowest Floor Marker */}
          <line
            x1="166"
            y1={propFloorY}
            x2="274"
            y2={propFloorY}
            stroke={floorFail ? '#dc2626' : '#059669'}
            strokeWidth="2.6"
          />
          <text
            x="162"
            y={propFloorY + 3}
            textAnchor="end"
            fontSize="8.5"
            fontWeight="700"
            fill={floorFail ? '#b91c1c' : '#047857'}
          >
            Floor {m.lowest_floor_elev_ft.toFixed(1)}&apos;
          </text>

          {/* HVAC / Mechanical Unit Marker */}
          <rect
            x="236"
            y={propMachY - 10}
            width="18"
            height="10"
            rx="1.5"
            fill={machFail ? '#ef4444' : '#10b981'}
            stroke="#0f172a"
            strokeWidth="0.9"
          />
          <text
            x="245"
            y={propMachY - 2.5}
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="700"
            fill="#ffffff"
          >
            HVAC
          </text>
        </g>
      </svg>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
        <span>
          Lowest Floor:{' '}
          <strong className={floorFail ? 'text-rose-700' : 'text-emerald-700'}>
            {m.lowest_floor_elev_ft.toFixed(1)}&apos;
          </strong>{' '}
          ({m.lowest_floor_elev_ft - bfe >= 0 ? '+' : ''}
          {(m.lowest_floor_elev_ft - bfe).toFixed(1)}&apos; vs BFE)
        </span>
        <span>
          HVAC/Utilities:{' '}
          <strong className={machFail ? 'text-rose-700' : 'text-emerald-700'}>
            {m.machinery_elev_ft.toFixed(1)}&apos;
          </strong>{' '}
          (Req &ge;{reqMach.toFixed(1)}&apos;)
        </span>
      </div>
    </div>
  );
};
