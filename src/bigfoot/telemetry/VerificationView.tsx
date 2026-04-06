// HRP/TMB post-sort verification view.
// Each well is colored by deposited cell count, mimicking the colorimetric
// TMB assay photos from the Thermo Fisher Bigfoot white paper (Figures 5 & 6).
// Only meaningful when phase === 'PLATE_COMPLETE'.

import { useState } from 'react';
import { useSorterStore } from '../store/sorterStore';
import { PLATE_GEOMETRY } from '../physics/types';
import { estimatedSortTime } from '../physics/PlateKinematics';

// TMB color scale: clear → pale blue → vivid dark blue
// Mirrors the HRP/TMB colorimetric gradient from the white paper
function tmBColor(count: number, maxCount: number): string {
  if (count === 0) return '#070d16'; // empty / clear
  const t = Math.min(count / Math.max(maxCount, 1), 1);
  // pale blue (#0e2a55) → vivid blue (#00b4ff)
  const r = Math.round(14 * (1 - t));
  const g = Math.round(42 + (180 - 42) * t);
  const b = Math.round(85 + (255 - 85) * t);
  return `rgb(${r},${g},${b})`;
}

function rowLabel(r: number): string {
  if (r < 26) return String.fromCharCode(65 + r);
  return 'A' + String.fromCharCode(65 + r - 26);
}

const BENCHMARKS: Record<string, Record<string, number>> = {
  '96':   { STRAIGHT_DOWN: 19.87, FOUR_WAY: 7.65   },
  '384':  { STRAIGHT_DOWN: 61.13, FOUR_WAY: 17.38  },
  '1536': { STRAIGHT_DOWN: 194.43, FOUR_WAY: 194.43 },
};

export function VerificationView() {
  const wellCounts = useSorterStore((s) => s.runState.wellCounts);
  const elapsed    = useSorterStore((s) => s.runState.elapsed);
  const totalCellsSorted      = useSorterStore((s) => s.runState.totalCellsSorted);
  const totalEventsProcessed  = useSorterStore((s) => s.runState.totalEventsProcessed);
  const infinisortPlateCount  = useSorterStore((s) => s.runState.infinisortPlateCount);
  const infinisortTotalCells  = useSorterStore((s) => s.runState.infinisortTotalCells);
  const config     = useSorterStore((s) => s.config);
  const geo        = PLATE_GEOMETRY[config.plateType];

  const [hoveredWell, setHoveredWell] = useState<number | null>(null);

  const is1536 = config.plateType === '1536';
  const maxCount = config.eventsPerWell;

  const SVG_W = 290;
  const SVG_H = 156;
  const PAD   = is1536 ? 4 : 10;
  const cellW = (SVG_W - PAD * 2) / geo.cols;
  const cellH = (SVG_H - PAD * 2) / geo.rows;
  const r     = Math.min(cellW, cellH) * (is1536 ? 0.42 : 0.38);

  const showLabels = !is1536;
  const colMarkers: number[] = is1536
    ? []
    : config.plateType === '96'
      ? [0, 5, 11]
      : [0, 5, 11, 17, 23];

  // Summary stats
  const efficiency = totalEventsProcessed > 0
    ? ((totalCellsSorted / totalEventsProcessed) * 100).toFixed(1)
    : '—';
  const thisBench  = BENCHMARKS[config.plateType]?.[config.sortMode] ?? null;
  const modeLabel  = config.sortMode === 'FOUR_WAY' ? '4-way' : 'straight-down';
  const totalPlates = infinisortPlateCount + 1; // includes current plate
  const cumulativeCells = infinisortTotalCells + totalCellsSorted;

  const fmt = (s: number) => s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}:${(s % 60).toFixed(0).padStart(2, '0')}`;

  // Tooltip content for hovered well
  const tooltip = hoveredWell !== null ? (() => {
    const row = Math.floor(hoveredWell / geo.cols);
    const col = hoveredWell % geo.cols;
    const cnt = wellCounts[hoveredWell] ?? 0;
    return `${rowLabel(row)}${col + 1}: ${cnt} cell${cnt !== 1 ? 's' : ''}`;
  })() : null;

  return (
    <div style={{ padding: '4px 12px 12px' }}>
      {/* Section label */}
      <div style={{
        fontSize: 10, color: '#556677',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>HRP/TMB Verification · {config.plateType}-Well</span>
        <span style={{ color: '#334455', textTransform: 'none', letterSpacing: 0 }}>
          {modeLabel}
        </span>
      </div>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 9, color: '#445566' }}>
        <span>0 cells</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} style={{
              width: 14, height: 10, borderRadius: 2,
              background: tmBColor(t * maxCount, maxCount),
              border: '1px solid #1a2a3a',
            }} />
          ))}
        </div>
        <span>{maxCount} cell{maxCount !== 1 ? 's' : ''}</span>
      </div>

      {/* SVG plate map */}
      <div style={{ position: 'relative' }}>
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display: 'block', background: '#040a12', borderRadius: 4, border: '1px solid #1a2a3a' }}
        >
          {/* Row labels */}
          {showLabels && Array.from({ length: geo.rows }, (_, row) => (
            <text
              key={row}
              x={PAD - 4}
              y={PAD + row * cellH + cellH / 2 + 3}
              fill="#334455"
              fontSize={config.plateType === '96' ? 8 : 6}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {rowLabel(row)}
            </text>
          ))}

          {/* Wells */}
          {wellCounts.map((count, i) => {
            const row = Math.floor(i / geo.cols);
            const col = i % geo.cols;
            const cx  = PAD + col * cellW + cellW / 2;
            const cy  = PAD + row * cellH + cellH / 2;
            const color = tmBColor(count, maxCount);
            const isHovered = i === hoveredWell;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isHovered ? r * 1.25 : r}
                fill={color}
                stroke={isHovered ? '#00e5ff' : 'none'}
                strokeWidth={isHovered ? 0.8 : 0}
                style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
                onMouseEnter={() => setHoveredWell(i)}
                onMouseLeave={() => setHoveredWell(null)}
              />
            );
          })}

          {/* Column markers */}
          {colMarkers.map((col) => (
            <text
              key={col}
              x={PAD + col * cellW + cellW / 2}
              y={SVG_H - 1}
              fill="#334455"
              fontSize={7}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {col + 1}
            </text>
          ))}
        </svg>

        {/* Hover tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            background: 'rgba(5, 15, 30, 0.92)',
            border: '1px solid #1a4a7a',
            borderRadius: 4,
            padding: '3px 7px',
            fontSize: 10,
            color: '#80ccff',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}>
            {tooltip}
          </div>
        )}
      </div>

      {/* Sort summary */}
      <div style={{
        marginTop: 10,
        padding: '8px 10px',
        background: '#050e1c',
        border: '1px solid #0a2240',
        borderRadius: 5,
        fontSize: 10,
      }}>
        <div style={{ fontWeight: 'bold', color: '#00e5aa', marginBottom: 6, fontSize: 11 }}>
          Sort Summary
        </div>

        {/* Stat rows */}
        {[
          ['Plates completed', totalPlates],
          ['Cells sorted (this plate)', totalCellsSorted.toLocaleString()],
          ['Gate efficiency', `${efficiency}%`],
          ['Elapsed (this plate)', fmt(elapsed)],
          ...(thisBench ? [['Benchmark (' + modeLabel + ')', `~${thisBench.toFixed(1)}s`]] : []),
        ].map(([label, value]) => (
          <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#556677' }}>{label}</span>
            <span style={{ color: '#c0d8f0', fontFamily: 'monospace' }}>{value}</span>
          </div>
        ))}

        {/* InfiniSort cumulative block */}
        {infinisortPlateCount > 0 && (
          <div style={{
            marginTop: 8,
            paddingTop: 7,
            borderTop: '1px solid #0a1e36',
          }}>
            <div style={{ color: '#334455', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              InfiniSort Cumulative
            </div>
            {[
              ['Total plates', totalPlates],
              ['Total cells sorted', cumulativeCells.toLocaleString()],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#556677' }}>{label}</span>
                <span style={{ color: '#00e5aa', fontFamily: 'monospace', fontWeight: 'bold' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
