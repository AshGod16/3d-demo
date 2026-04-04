// Interactive SVG well-selection map for Advanced Sort Mode.
// Click individual wells to toggle; drag to select/deselect a rectangle.
// Preset buttons: All, Odd Rows, Even Rows, Clear.

import { useRef, useState, useCallback } from 'react';
import { useSorterStore } from '../store/sorterStore';
import { PLATE_GEOMETRY } from '../physics/types';
import type { PlateType } from '../physics/types';

const PICKER_W = 266;
const PICKER_H = 120;
const PAD = 4;

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '3px 0',
        borderRadius: 3,
        border: '1px solid #1e2a3a',
        background: 'transparent',
        color: '#00ccff',
        cursor: 'pointer',
        fontSize: 9,
      }}
    >
      {label}
    </button>
  );
}

interface WellPickerProps {
  plateType: PlateType;
}

export function WellPicker({ plateType }: WellPickerProps) {
  const setSelectedWells = useSorterStore((s) => s.setSelectedWells);
  const selectedWells = useSorterStore((s) => s.config.selectedWells);
  const geo = PLATE_GEOMETRY[plateType];

  const selectedSet = selectedWells ? new Set(selectedWells) : new Set<number>();

  const cellW = (PICKER_W - PAD * 2) / geo.cols;
  const cellH = (PICKER_H - PAD * 2) / geo.rows;
  const r = Math.min(cellW, cellH) * 0.40;

  // Drag-to-select state
  const dragStart = useRef<{ col: number; row: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null);
  const dragMode = useRef<'select' | 'deselect'>('select');

  const wellAt = useCallback((clientX: number, clientY: number, svgEl: SVGSVGElement) => {
    const rect = svgEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor((x - PAD) / cellW);
    const row = Math.floor((y - PAD) / cellH);
    if (col < 0 || col >= geo.cols || row < 0 || row >= geo.rows) return null;
    return { col, row };
  }, [cellW, cellH, geo.cols, geo.rows]);

  const applyRect = useCallback((r1: number, c1: number, r2: number, c2: number, mode: 'select' | 'deselect') => {
    const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    const next = new Set(selectedSet);
    for (let row = minR; row <= maxR; row++) {
      for (let col = minC; col <= maxC; col++) {
        const idx = row * geo.cols + col;
        if (mode === 'select') next.add(idx);
        else next.delete(idx);
      }
    }
    setSelectedWells(next.size > 0 ? [...next] : null);
  }, [selectedSet, geo.cols, setSelectedWells]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = wellAt(e.clientX, e.clientY, e.currentTarget);
    if (!pos) return;
    dragStart.current = pos;
    const idx = pos.row * geo.cols + pos.col;
    dragMode.current = selectedSet.has(idx) ? 'deselect' : 'select';
    setDragRect({ r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col });
    e.preventDefault();
  }, [wellAt, geo.cols, selectedSet]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const pos = wellAt(e.clientX, e.clientY, e.currentTarget);
    if (!pos) return;
    setDragRect({ r1: dragStart.current.row, c1: dragStart.current.col, r2: pos.row, c2: pos.col });
  }, [wellAt]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStart.current || !dragRect) return;
    applyRect(dragRect.r1, dragRect.c1, dragRect.r2, dragRect.c2, dragMode.current);
    dragStart.current = null;
    setDragRect(null);
  }, [dragRect, applyRect]);

  // Presets
  const selectAll = () => {
    const all = Array.from({ length: geo.totalWells }, (_, i) => i);
    setSelectedWells(all);
  };
  const selectOddRows = () => {
    const wells: number[] = [];
    for (let row = 0; row < geo.rows; row += 2)
      for (let col = 0; col < geo.cols; col++)
        wells.push(row * geo.cols + col);
    setSelectedWells(wells);
  };
  const selectEvenRows = () => {
    const wells: number[] = [];
    for (let row = 1; row < geo.rows; row += 2)
      for (let col = 0; col < geo.cols; col++)
        wells.push(row * geo.cols + col);
    setSelectedWells(wells);
  };
  const clearAll = () => setSelectedWells(null);

  // Drag rect overlay bounds in SVG coords
  const dragOverlay = dragRect ? {
    x: PAD + Math.min(dragRect.c1, dragRect.c2) * cellW,
    y: PAD + Math.min(dragRect.r1, dragRect.r2) * cellH,
    w: (Math.abs(dragRect.c2 - dragRect.c1) + 1) * cellW,
    h: (Math.abs(dragRect.r2 - dragRect.r1) + 1) * cellH,
  } : null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 9, color: '#445566', marginBottom: 4 }}>
        Click or drag wells to select · {selectedWells?.length ?? 0} selected
      </div>

      <svg
        width={PICKER_W}
        height={PICKER_H}
        viewBox={`0 0 ${PICKER_W} ${PICKER_H}`}
        style={{
          display: 'block',
          background: '#070e1a',
          borderRadius: 4,
          border: '1px solid #1a2a3a',
          cursor: 'crosshair',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {Array.from({ length: geo.totalWells }, (_, i) => {
          const row = Math.floor(i / geo.cols);
          const col = i % geo.cols;
          const cx = PAD + col * cellW + cellW / 2;
          const cy = PAD + row * cellH + cellH / 2;
          const isSelected = selectedSet.has(i);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={isSelected ? '#00ccff' : '#1a2a3a'}
              opacity={isSelected ? 0.9 : 0.5}
            />
          );
        })}

        {/* Drag selection overlay */}
        {dragOverlay && (
          <rect
            x={dragOverlay.x}
            y={dragOverlay.y}
            width={dragOverlay.w}
            height={dragOverlay.h}
            fill={dragMode.current === 'select' ? '#00ccff22' : '#ff443322'}
            stroke={dragMode.current === 'select' ? '#00ccff88' : '#ff443388'}
            strokeWidth={1}
            rx={2}
          />
        )}
      </svg>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
        <PresetBtn label="All" onClick={selectAll} />
        <PresetBtn label="Odd Rows" onClick={selectOddRows} />
        <PresetBtn label="Even Rows" onClick={selectEvenRows} />
        <PresetBtn label="Clear" onClick={clearAll} />
      </div>
    </div>
  );
}
