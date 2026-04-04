// Live FSC-A vs SSC-A scatter plot.
// Uses HTML Canvas + RAF loop for performance — avoids React re-renders entirely.
// Draws last 400 events as 2px dots, color-coded by population.
// Gate rectangle shown as a yellow outline.

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSorterStore } from '../store/sorterStore';
import { DEFAULT_GATE } from '../physics/types';

function startRenderLoop(canvas: HTMLCanvasElement, w: number, h: number): () => void {
  const ctx = canvas.getContext('2d')!;
  let rafId: number;
  const gate = DEFAULT_GATE;

  function render() {
    const { recentEvents } = useSorterStore.getState().runState;

    ctx.fillStyle = '#070e1a';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#445566';
    ctx.font = `${Math.round(w * 0.033)}px monospace`;
    ctx.fillText('FSC-A →', w - w * 0.19, h - h * 0.018);
    ctx.save();
    ctx.translate(h * 0.054, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SSC-A', -20, 0);
    ctx.restore();

    const gx1 = (gate.fscMin / 1000) * (w - 20) + 14;
    const gx2 = (gate.fscMax / 1000) * (w - 20) + 14;
    const gy1 = h - 12 - (gate.sscMax / 1000) * (h - 20);
    const gy2 = h - 12 - (gate.sscMin / 1000) * (h - 20);
    ctx.strokeStyle = '#ffdd0088';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffdd0066';
    ctx.font = `${Math.round(w * 0.029)}px monospace`;
    ctx.fillText('GATE', gx1 + 2, gy1 - 2);

    const dotR = w > 400 ? 2.5 : 1.5;
    for (const ev of recentEvents) {
      const x = (ev.fscA / 1000) * (w - 20) + 14;
      const y = h - 12 - (ev.sscA / 1000) * (h - 20);
      ctx.fillStyle = ev.isTarget
        ? '#00ccff99'
        : ev.population === 'DOUBLET'
          ? '#ff880066'
          : '#33445555';
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    const targetCount = recentEvents.filter(e => e.isTarget).length;
    const pct = recentEvents.length > 0
      ? ((targetCount / recentEvents.length) * 100).toFixed(1)
      : '—';
    ctx.fillStyle = '#00ccff';
    ctx.font = `bold ${Math.round(w * 0.037)}px monospace`;
    ctx.fillText(`Gate: ${pct}%`, 14, 14 + (w > 400 ? 4 : 0));

    const lx = w - w * 0.3;
    ctx.fillStyle = '#00ccff88'; ctx.fillRect(lx, 8, 6, 6);
    ctx.fillStyle = '#88aacc'; ctx.font = `${Math.round(w * 0.029)}px sans-serif`;
    ctx.fillText('Target', lx + 9, 14);

    ctx.fillStyle = '#ff880066'; ctx.fillRect(lx, 18, 6, 6);
    ctx.fillStyle = '#88aacc';
    ctx.fillText('Doublet', lx + 9, 24);

    ctx.fillStyle = '#33445588'; ctx.fillRect(lx, 28, 6, 6);
    ctx.fillStyle = '#88aacc';
    ctx.fillText('Debris', lx + 9, 34);

    rafId = requestAnimationFrame(render);
  }

  render();
  return () => cancelAnimationFrame(rafId);
}

function ScatterCanvas({ w, h }: { w: number; h: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startRenderLoop(canvas, w, h);
  }, [w, h]);
  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{ display: 'block', borderRadius: 4, border: '1px solid #1a2a3a', width: '100%', height: 'auto' }}
    />
  );
}

export function ScatterPlot() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ padding: '8px 12px 4px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          FSC-A vs SSC-A · Live Gate
        </span>
        <button
          onClick={() => setExpanded(true)}
          title="Expand chart"
          style={{
            background: 'none', border: '1px solid #1a2a3a', borderRadius: 4,
            color: '#445566', cursor: 'pointer', padding: '1px 5px', fontSize: 11,
            lineHeight: 1, transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00ccff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#00ccff44'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#445566'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2a3a'; }}
        >
          ⛶
        </button>
      </div>

      {/* Inline (small) canvas */}
      <ScatterCanvas w={270} h={168} />

      {/* Expanded modal */}
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
              background: '#070e1a',
              border: '1px solid #1a3a5a',
              borderRadius: 10,
              padding: '16px 20px 20px',
              boxShadow: '0 0 40px rgba(0,180,255,0.12)',
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                FSC-A vs SSC-A · Live Gate
              </span>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none', border: '1px solid #1a2a3a', borderRadius: 4,
                  color: '#445566', cursor: 'pointer', padding: '2px 8px', fontSize: 12,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <ScatterCanvas w={600} h={400} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
