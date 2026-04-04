// SVG plate map showing well fill status in real time.
// Updates via Zustand subscription at ~20Hz.

import { useSorterStore } from '../store/sorterStore';
import { PLATE_GEOMETRY } from '../physics/types';

const COLORS = {
  empty: '#0e1825',
  sorting: '#0044aa',
  done: '#0066ff',
  current: '#00e5ff',
};

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function fillColor(fill: number, isCurrent: boolean): string {
  if (isCurrent && fill < 1) return COLORS.current;
  if (fill <= 0) return COLORS.empty;
  // Interpolate from sorting blue to done vivid blue
  const r = 0;
  const g = 0.1 + fill * 0.15;
  const b = 0.3 + fill * 0.6;
  return toHex(r, g, b);
}

export function PlateMap() {
  const wellFills = useSorterStore((s) => s.runState.wellFills);
  const currentWell = useSorterStore((s) => s.runState.currentWellIndex);
  const phase = useSorterStore((s) => s.runState.phase);
  const plateType = useSorterStore((s) => s.config.plateType);
  const geo = PLATE_GEOMETRY[plateType];

  const SVG_W = 290;
  const SVG_H = 156;
  const PAD = 10;
  const cellW = (SVG_W - PAD * 2) / geo.cols;
  const cellH = (SVG_H - PAD * 2) / geo.rows;
  const r = Math.min(cellW, cellH) * 0.38;

  // Row labels A-H (or A-P for 384)
  const rowLabels = Array.from({ length: geo.rows }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <div style={{ padding: '4px 12px 8px' }}>
      <div style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Plate Map · {plateType}-Well
      </div>
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', background: '#070e1a', borderRadius: 4, border: '1px solid #1a2a3a' }}
      >
        {/* Row labels */}
        {rowLabels.map((label, row) => (
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
          const color = fillColor(fill, isCurrent);

          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill={color}>
              {isCurrent && phase === 'SORTING' && (
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

        {/* Column numbers (1, 6, 12) */}
        {[0, 5, 11].map((col) => (
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
