// Live scatter plot with axis dropdowns and interactive draggable gate.
// Canvas + RAF for performance. Gate handles allow resize/move of the FSC-A/SSC-A rectangle gate.

import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSorterStore } from '../store/sorterStore';
import type { CellEvent, SortGate } from '../physics/types';

// ── Axis definitions ─────────────────────────────────────────────────────────

export type AxisKey = 'fscA' | 'sscA' | 'fscH' | 'uv349' | 'ch488_530' | 'ch561_590' | 'ch638_660';

const AXIS_LABELS: Record<AxisKey, string> = {
  fscA:      'FSC-A',
  sscA:      'SSC-A',
  fscH:      'FSC-H',
  uv349:     'UV-349',
  ch488_530: 'FITC',
  ch561_590: 'PE',
  ch638_660: 'APC',
};

function getAxisVal(ev: CellEvent, axis: AxisKey): number {
  return (ev as unknown as Record<string, number>)[axis] ?? 0;
}

// ── Coordinate helpers (match original offsets) ──────────────────────────────

function toCanvasX(val: number, w: number) { return (val / 1000) * (w - 20) + 14; }
function toCanvasY(val: number, h: number) { return h - 12 - (val / 1000) * (h - 20); }
function fromCanvasX(px: number, w: number) { return Math.max(0, Math.min(1000, (px - 14) / (w - 20) * 1000)); }
function fromCanvasY(py: number, h: number) { return Math.max(0, Math.min(1000, (h - 12 - py) / (h - 20) * 1000)); }

// ── Gate drag state ──────────────────────────────────────────────────────────

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'move';

interface DragState {
  mode: HandleType;
  startGate: SortGate;
  startCx: number;
  startCy: number;
}

// ── Axis selector ─────────────────────────────────────────────────────────────

function AxisSelect({ value, onChange, label }: {
  value: AxisKey;
  onChange: (v: AxisKey) => void;
  label: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#445566' }}>
      {label}:
      <select
        value={value}
        onChange={e => onChange(e.target.value as AxisKey)}
        style={{
          fontSize: 9, background: '#0d1525', color: '#88aacc',
          border: '1px solid #1a2a3a', borderRadius: 3, padding: '1px 3px',
          cursor: 'pointer', outline: 'none',
        }}
      >
        {(Object.entries(AXIS_LABELS) as [AxisKey, string][]).map(([key, lbl]) => (
          <option key={key} value={key}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}

// ── Canvas component ──────────────────────────────────────────────────────────

function ScatterCanvas({ w, h, xAxis, yAxis, gate, onGateChange }: {
  w: number;
  h: number;
  xAxis: AxisKey;
  yAxis: AxisKey;
  gate: SortGate;
  onGateChange: (g: SortGate) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localGateRef = useRef<SortGate>(gate);
  const dragRef = useRef<DragState | null>(null);
  const hoverHandleRef = useRef<HandleType | null>(null);
  const [cursor, setCursor] = useState('crosshair');

  // Keep local gate in sync with prop when not dragging
  useEffect(() => {
    if (!dragRef.current) {
      localGateRef.current = gate;
    }
  }, [gate]);

  // RAF render loop — restarts when dimensions or axes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;
    const showGate = xAxis === 'fscA' && yAxis === 'sscA';
    const HANDLE_PX = Math.max(5, w * 0.02);

    function render() {
      const store = useSorterStore.getState();
      const { recentEvents } = store.runState;
      const g = localGateRef.current;

      // Background
      ctx.fillStyle = '#070e1a';
      ctx.fillRect(0, 0, w, h);

      // Axis labels
      const fs = Math.max(8, Math.round(w * 0.032));
      ctx.fillStyle = '#334455';
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`${AXIS_LABELS[xAxis]} →`, w * 0.48 - 18, h - 2);
      ctx.save();
      ctx.translate(fs + 1, h / 2 + 10);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(AXIS_LABELS[yAxis], 0, 0);
      ctx.restore();

      // Gate rectangle + handles (only when FSC-A vs SSC-A)
      if (showGate) {
        const gx1 = toCanvasX(g.fscMin, w);
        const gx2 = toCanvasX(g.fscMax, w);
        const gy1 = toCanvasY(g.sscMax, h);
        const gy2 = toCanvasY(g.sscMin, h);

        ctx.strokeStyle = '#ffdd0088';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffdd0055';
        ctx.font = `${Math.max(8, Math.round(w * 0.027))}px monospace`;
        ctx.fillText('GATE', gx1 + 3, gy1 - 3);

        // Corner handles
        const corners: { key: HandleType; cx: number; cy: number }[] = [
          { key: 'tl', cx: gx1, cy: gy1 },
          { key: 'tr', cx: gx2, cy: gy1 },
          { key: 'bl', cx: gx1, cy: gy2 },
          { key: 'br', cx: gx2, cy: gy2 },
        ];
        for (const c of corners) {
          const lit = hoverHandleRef.current === c.key || dragRef.current?.mode === c.key;
          ctx.fillStyle = lit ? '#ffdd00cc' : '#ffdd0077';
          ctx.fillRect(c.cx - HANDLE_PX / 2, c.cy - HANDLE_PX / 2, HANDLE_PX, HANDLE_PX);
        }
      }

      // Events — color by live gate state (enables instant visual feedback during drag)
      const dotR = w > 400 ? 2.5 : 1.5;
      let visualTargets = 0;
      for (const ev of recentEvents) {
        const xv = getAxisVal(ev, xAxis);
        const yv = getAxisVal(ev, yAxis);
        const px = toCanvasX(xv, w);
        const py = toCanvasY(yv, h);

        // Compute visual target from current local gate (instant drag feedback)
        const isVisual = showGate
          ? (xv >= g.fscMin && xv <= g.fscMax &&
             yv >= g.sscMin && yv <= g.sscMax &&
             ev.uv349 >= g.uvMin && (ev.fscH / ev.fscA) >= g.singletRatio)
          : ev.isTarget;

        if (isVisual) visualTargets++;
        ctx.fillStyle = isVisual
          ? '#00ccff99'
          : ev.population === 'DOUBLET' ? '#ff880066' : '#33445555';
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gate efficiency + hits/s overlay
      const eventsPerSec = store.runState.eventsPerSec;
      const total = recentEvents.length;
      const pct = total > 0 ? ((visualTargets / total) * 100).toFixed(1) : '—';
      const hitsPerSec = total > 0 && eventsPerSec > 0
        ? Math.round(eventsPerSec * (visualTargets / total))
        : null;
      ctx.fillStyle = '#00ccff';
      ctx.font = `bold ${Math.max(9, Math.round(w * 0.037))}px monospace`;
      ctx.fillText(`Gate: ${pct}%`, 14, 14);
      if (hitsPerSec !== null) {
        ctx.fillStyle = '#00ccff88';
        ctx.font = `${Math.max(8, Math.round(w * 0.029))}px monospace`;
        ctx.fillText(`~${hitsPerSec}/s`, 14, 26);
      }

      // Legend
      const lx = w - w * 0.3;
      ctx.fillStyle = '#00ccff88'; ctx.fillRect(lx, 8, 6, 6);
      ctx.fillStyle = '#7799aa'; ctx.font = `${Math.max(8, Math.round(w * 0.029))}px sans-serif`;
      ctx.fillText('Target', lx + 9, 14);
      ctx.fillStyle = '#ff880066'; ctx.fillRect(lx, 18, 6, 6);
      ctx.fillStyle = '#7799aa'; ctx.fillText('Doublet', lx + 9, 24);
      ctx.fillStyle = '#33445588'; ctx.fillRect(lx, 28, 6, 6);
      ctx.fillStyle = '#7799aa'; ctx.fillText('Debris', lx + 9, 34);

      rafId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(rafId);
  }, [w, h, xAxis, yAxis]);

  // Convert mouse event to canvas pixel coordinates (accounts for CSS scaling)
  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) * (w / rect.width),
      cy: (e.clientY - rect.top) * (h / rect.height),
    };
  }, [w, h]);

  const hitHandle = useCallback((cx: number, cy: number, g: SortGate): HandleType | null => {
    const R = Math.max(8, w * 0.03);
    const gx1 = toCanvasX(g.fscMin, w), gx2 = toCanvasX(g.fscMax, w);
    const gy1 = toCanvasY(g.sscMax, h), gy2 = toCanvasY(g.sscMin, h);
    if (Math.hypot(cx - gx1, cy - gy1) <= R) return 'tl';
    if (Math.hypot(cx - gx2, cy - gy1) <= R) return 'tr';
    if (Math.hypot(cx - gx1, cy - gy2) <= R) return 'bl';
    if (Math.hypot(cx - gx2, cy - gy2) <= R) return 'br';
    if (cx >= gx1 && cx <= gx2 && cy >= gy1 && cy <= gy2) return 'move';
    return null;
  }, [w, h]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (xAxis !== 'fscA' || yAxis !== 'sscA') return;
    const { cx, cy } = toCanvasCoords(e);
    const mode = hitHandle(cx, cy, localGateRef.current);
    if (mode) {
      dragRef.current = { mode, startGate: { ...localGateRef.current }, startCx: cx, startCy: cy };
      e.preventDefault();
    }
  }, [xAxis, yAxis, toCanvasCoords, hitHandle]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { cx, cy } = toCanvasCoords(e);

    if (!dragRef.current) {
      // Update hover state and cursor
      if (xAxis === 'fscA' && yAxis === 'sscA') {
        const h2 = hitHandle(cx, cy, localGateRef.current);
        hoverHandleRef.current = h2;
        const cur: Record<HandleType, string> = { tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize', move: 'move' };
        setCursor(h2 ? cur[h2] : 'crosshair');
      }
      return;
    }

    const { mode, startGate, startCx, startCy } = dragRef.current;
    const dx = fromCanvasX(cx, w) - fromCanvasX(startCx, w);
    const dy = fromCanvasY(cy, h) - fromCanvasY(startCy, h);
    const MIN = 50;
    const ng = { ...startGate };

    switch (mode) {
      case 'move': {
        const rw = startGate.fscMax - startGate.fscMin;
        const rh = startGate.sscMax - startGate.sscMin;
        ng.fscMin = Math.max(0, Math.min(1000 - rw, startGate.fscMin + dx));
        ng.fscMax = ng.fscMin + rw;
        ng.sscMin = Math.max(0, Math.min(1000 - rh, startGate.sscMin + dy));
        ng.sscMax = ng.sscMin + rh;
        break;
      }
      case 'tl':
        ng.fscMin = Math.max(0, Math.min(startGate.fscMax - MIN, startGate.fscMin + dx));
        ng.sscMax = Math.max(startGate.sscMin + MIN, Math.min(1000, startGate.sscMax + dy));
        break;
      case 'tr':
        ng.fscMax = Math.max(startGate.fscMin + MIN, Math.min(1000, startGate.fscMax + dx));
        ng.sscMax = Math.max(startGate.sscMin + MIN, Math.min(1000, startGate.sscMax + dy));
        break;
      case 'bl':
        ng.fscMin = Math.max(0, Math.min(startGate.fscMax - MIN, startGate.fscMin + dx));
        ng.sscMin = Math.max(0, Math.min(startGate.sscMax - MIN, startGate.sscMin + dy));
        break;
      case 'br':
        ng.fscMax = Math.max(startGate.fscMin + MIN, Math.min(1000, startGate.fscMax + dx));
        ng.sscMin = Math.max(0, Math.min(startGate.sscMax - MIN, startGate.sscMin + dy));
        break;
    }
    localGateRef.current = ng;
  }, [toCanvasCoords, xAxis, yAxis, hitHandle, w, h]);

  const commitGate = useCallback(() => {
    if (dragRef.current) {
      const ng = localGateRef.current;
      dragRef.current = null;
      hoverHandleRef.current = null;
      setCursor('crosshair');
      onGateChange(ng);
    }
  }, [onGateChange]);

  const handleMouseLeave = useCallback(() => {
    commitGate();
    hoverHandleRef.current = null;
    if (!dragRef.current) setCursor('crosshair');
  }, [commitGate]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{
        display: 'block', borderRadius: 4, border: '1px solid #1a2a3a',
        width: '100%', height: 'auto', cursor,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={commitGate}
      onMouseLeave={handleMouseLeave}
    />
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ScatterPlot() {
  const gate = useSorterStore((s) => s.gate);
  const setGate = useSorterStore((s) => s.setGate);
  const [xAxis, setXAxis] = useState<AxisKey>('fscA');
  const [yAxis, setYAxis] = useState<AxisKey>('sscA');
  const [expanded, setExpanded] = useState(false);

  const isGateAxes = xAxis === 'fscA' && yAxis === 'sscA';

  return (
    <div style={{ padding: '8px 12px 4px' }}>
      {/* Header row: axis selectors + expand button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <AxisSelect value={xAxis} onChange={setXAxis} label="X" />
          <AxisSelect value={yAxis} onChange={setYAxis} label="Y" />
        </div>
        <button
          onClick={() => setExpanded(true)}
          title="Expand chart"
          style={{
            background: 'none', border: '1px solid #1a2a3a', borderRadius: 4,
            color: '#445566', cursor: 'pointer', padding: '1px 5px', fontSize: 11,
            lineHeight: 1, transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget).style.color = '#00ccff'; (e.currentTarget).style.borderColor = '#00ccff44'; }}
          onMouseLeave={e => { (e.currentTarget).style.color = '#445566'; (e.currentTarget).style.borderColor = '#1a2a3a'; }}
        >⛶</button>
      </div>

      {isGateAxes && (
        <div style={{ fontSize: 9, color: '#2a3a4a', marginBottom: 3 }}>
          drag corners or inside gate to reshape
        </div>
      )}

      <ScatterCanvas w={270} h={168} xAxis={xAxis} yAxis={yAxis} gate={gate} onGateChange={setGate} />

      {expanded && createPortal(
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(2, 6, 14, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#070e1a', border: '1px solid #1a3a5a', borderRadius: 10,
              padding: '16px 20px 20px', boxShadow: '0 0 40px rgba(0,180,255,0.12)',
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AxisSelect value={xAxis} onChange={setXAxis} label="X" />
              <AxisSelect value={yAxis} onChange={setYAxis} label="Y" />
              {isGateAxes && (
                <span style={{ fontSize: 10, color: '#334455' }}>drag corners to resize gate</span>
              )}
              <button
                onClick={() => setExpanded(false)}
                style={{
                  marginLeft: 'auto', background: 'none', border: '1px solid #1a2a3a',
                  borderRadius: 4, color: '#445566', cursor: 'pointer',
                  padding: '2px 8px', fontSize: 12, lineHeight: 1,
                }}
              >✕</button>
            </div>
            <ScatterCanvas w={620} h={420} xAxis={xAxis} yAxis={yAxis} gate={gate} onGateChange={setGate} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
