// FSC-A vs FSC-H doublet discrimination plot.
// Shows the singlet diagonal line and lets the user adjust the singlet ratio threshold.
// Canvas + RAF for performance — same pattern as ScatterPlot.

import { useRef, useEffect } from 'react';
import { useSorterStore } from '../store/sorterStore';

function toX(val: number, w: number) { return (val / 1000) * (w - 20) + 14; }
function toY(val: number, h: number) { return h - 12 - (val / 1000) * (h - 20); }

function DoubletCanvas({ w, h }: { w: number; h: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;

    function render() {
      const store = useSorterStore.getState();
      const { recentEvents } = store.runState;
      const ratio = store.gate.singletRatio;

      // Background
      ctx.fillStyle = '#070e1a';
      ctx.fillRect(0, 0, w, h);

      // Axis labels
      const fs = Math.max(8, Math.round(w * 0.032));
      ctx.fillStyle = '#334455';
      ctx.font = `${fs}px monospace`;
      ctx.fillText('FSC-A →', w * 0.48 - 18, h - 2);
      ctx.save();
      ctx.translate(fs + 1, h / 2 + 10);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('FSC-H', 0, 0);
      ctx.restore();

      // Singlet diagonal: FSC-H = ratio * FSC-A
      ctx.strokeStyle = '#00ccff55';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(toX(0, w), toY(0, h));
      ctx.lineTo(toX(1000, w), toY(ratio * 1000, h));
      ctx.stroke();
      ctx.setLineDash([]);

      // Ratio label along the line
      const midX = toX(500, w);
      const midY = toY(ratio * 500, h) - 8;
      ctx.fillStyle = '#00ccff77';
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`ratio ≥ ${ratio.toFixed(2)}`, midX - 30, midY);

      // Events
      const dotR = w > 400 ? 2.5 : 1.5;
      for (const ev of recentEvents) {
        const x = toX(ev.fscA, w);
        const y = toY(ev.fscH, h);
        const passesSinglet = ev.fscA > 0 && (ev.fscH / ev.fscA) >= ratio;
        ctx.fillStyle = passesSinglet
          ? '#00ccff77'
          : ev.population === 'DOUBLET' ? '#ff880077' : '#33445566';
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Singlet / doublet pass counts
      const singlets = recentEvents.filter(ev => ev.fscA > 0 && (ev.fscH / ev.fscA) >= ratio).length;
      const doublets = recentEvents.length - singlets;
      ctx.fillStyle = '#00ccff88';
      ctx.font = `bold ${Math.max(9, Math.round(w * 0.033))}px monospace`;
      ctx.fillText(`Singles: ${singlets}`, 14, 14);
      ctx.fillStyle = '#ff880088';
      ctx.fillText(`Doublets: ${doublets}`, 14, 26);

      rafId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(rafId);
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

export function DoubletPlot() {
  const gate = useSorterStore((s) => s.gate);
  const setGate = useSorterStore((s) => s.setGate);

  return (
    <div style={{ padding: '8px 12px 4px' }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          FSC-A vs FSC-H · Doublet Gate
        </span>
      </div>

      <DoubletCanvas w={270} h={150} />

      {/* Singlet ratio slider */}
      <div style={{
        marginTop: 6,
        padding: '5px 7px',
        background: '#0a1420',
        borderRadius: 4,
        border: '1px solid #1a2a3a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#445566', minWidth: 76 }}>Singlet ratio:</span>
          <input
            type="range"
            min={0.50}
            max={0.98}
            step={0.01}
            value={gate.singletRatio}
            onChange={e => setGate({ ...gate, singletRatio: parseFloat(e.target.value) })}
            style={{ flex: 1, accentColor: '#00ccff', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 10, color: '#00ccff', fontFamily: 'monospace', minWidth: 34, textAlign: 'right' }}>
            {gate.singletRatio.toFixed(2)}
          </span>
        </div>
        <div style={{ fontSize: 9, color: '#2a3a4a', marginTop: 2 }}>
          higher ratio = tighter doublet exclusion
        </div>
      </div>
    </div>
  );
}
