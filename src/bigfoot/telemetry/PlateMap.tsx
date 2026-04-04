// SVG plate map showing well fill status in real time.
// Updates via Zustand subscription at ~20Hz.
// Supports 96-well, 384-well, and 1536-well plates.
// In advanced sort mode, unselected wells are dimmed.

import { useSorterStore } from '../store/sorterStore';
import { PLATE_GEOMETRY } from '../physics/types';

const COLORS = {
  empty: '#0e1825',
  sorting: '#0044aa',
  done: '#0066ff',
  current: '#00e5ff',
  inactive: '#080d12',  // unselected well in advanced mode
};

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function fillColor(fill: number, isCurrent: boolean): string {
  if (isCurrent && fill < 1) return COLORS.current;
  if (fill <= 0) return COLORS.empty;
  const r = 0;
  const g = 0.1 + fill * 0.15;
  const b = 0.3 + fill * 0.6;
  return toHex(r, g, b);
}

// Row labels: A–Z for rows 0–25, then AA–AF for rows 26–31
function rowLabel(r: number): string {
  if (r < 26) return String.fromCharCode(65 + r);
  return 'A' + String.fromCharCode(65 + r - 26);
}

export function PlateMap() {
  const wellFills = useSorterStore((s) => s.runState.wellFills);
  const currentWell = useSorterStore((s) => s.runState.currentWellIndex);
  const phase = useSorterStore((s) => s.runState.phase);
  const plateType = useSorterStore((s) => s.config.plateType);
  const advancedSortMode = useSorterStore((s) => s.config.advancedSortMode);
  const selectedWells = useSorterStore((s) => s.config.selectedWells);
  const geo = PLATE_GEOMETRY[plateType];

  const is1536 = plateType === '1536';
  const selectedSet = (advancedSortMode && selectedWells) ? new Set(selectedWells) : null;

  const SVG_W = 290;
  const SVG_H = 156;

  // For 1536: no row/col labels, minimal padding, 3px wells
  const PAD = is1536 ? 4 : 10;
  const cellW = (SVG_W - PAD * 2) / geo.cols;
  const cellH = (SVG_H - PAD * 2) / geo.rows;
  const r = Math.min(cellW, cellH) * (is1536 ? 0.42 : 0.38);

  const showLabels = !is1536;
  const rowLabels = Array.from({ length: geo.rows }, (_, i) => rowLabel(i));

  // Column markers to show below the plate
  const colMarkers: number[] = is1536
    ? [] // no col markers for 1536
    : plateType === '96'
      ? [0, 5, 11]
      : [0, 5, 11, 17, 23];

  return (
    <div style={{ padding: '4px 12px 8px' }}>
      <div style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Plate Map · {plateType}-Well
        {advancedSortMode && selectedWells && (
          <span style={{ color: '#00ccff', marginLeft: 6, textTransform: 'none' }}>
            · {selectedWells.length} wells selected
          </span>
        )}
      </div>
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', background: '#070e1a', borderRadius: 4, border: '1px solid #1a2a3a' }}
      >
        {/* Row labels (not shown for 1536) */}
        {showLabels && rowLabels.map((label, row) => (
          <text
            key={label}
            x={PAD - 4}
            y={PAD + row * cellH + cellH / 2 + 3}
            fill="#334455"
            fontSize={plateType === '96' ? 8 : 6}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {label}
          </text>
        ))}

        {/* Wells */}
        {wellFills.map((fill, i) => {
          const row = Math.floor(i / geo.cols);
          const col = i % geo.cols;
          const cx = PAD + col * cellW + cellW / 2;
          const cy = PAD + row * cellH + cellH / 2;
          const isCurrent = i === currentWell && (phase === 'SORTING' || phase === 'MOVING_TO_WELL');
          const isInactive = selectedSet !== null && !selectedSet.has(i);
          const color = isInactive ? COLORS.inactive : fillColor(fill, isCurrent);

          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill={color}>
              {isCurrent && phase === 'SORTING' && !isInactive && (
                <animate
                  attributeName="opacity"
                  values="1;0.4;1"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
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
    </div>
  );
}
