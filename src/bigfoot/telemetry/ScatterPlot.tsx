// Live FSC-A vs SSC-A scatter plot.
// Uses HTML Canvas + RAF loop for performance — avoids React re-renders entirely.
// Draws last 400 events as 2px dots, color-coded by population.
// Gate rectangle shown as a yellow outline.

import { useRef, useEffect } from 'react';
import { useSorterStore } from '../store/sorterStore';
import { DEFAULT_GATE } from '../physics/types';

const W = 270;
const H = 200;

export function ScatterPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;

    function render() {
      const { recentEvents } = useSorterStore.getState().runState;
      const gate = DEFAULT_GATE;

      // Background
      ctx.fillStyle = '#070e1a';
      ctx.fillRect(0, 0, W, H);

      // Axis labels
      ctx.fillStyle = '#445566';
      ctx.font = '9px monospace';
      ctx.fillText('FSC-A →', W - 52, H - 3);
      ctx.save();
      ctx.translate(9, H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SSC-A', -20, 0);
      ctx.restore();

      // Gate rectangle
      const gx1 = (gate.fscMin / 1000) * (W - 20) + 14;
      const gx2 = (gate.fscMax / 1000) * (W - 20) + 14;
      const gy1 = H - 12 - (gate.sscMax / 1000) * (H - 20);
      const gy2 = H - 12 - (gate.sscMin / 1000) * (H - 20);
      ctx.strokeStyle = '#ffdd0088';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
      ctx.setLineDash([]);

      // Gate label
      ctx.fillStyle = '#ffdd0066';
      ctx.font = '8px monospace';
      ctx.fillText('GATE', gx1 + 2, gy1 - 2);

      // Draw events
      for (const ev of recentEvents) {
        const x = (ev.fscA / 1000) * (W - 20) + 14;
        const y = H - 12 - (ev.sscA / 1000) * (H - 20);

        if (ev.isTarget) {
          ctx.fillStyle = '#00ccff99';
        } else if (ev.population === 'DOUBLET') {
          ctx.fillStyle = '#ff880066';
        } else {
          ctx.fillStyle = '#33445555';
        }

        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Target % counter
      const targetCount = recentEvents.filter(e => e.isTarget).length;
      const pct = recentEvents.length > 0
        ? ((targetCount / recentEvents.length) * 100).toFixed(1)
        : '—';
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Gate: ${pct}%`, 14, 14);

      // Population legend
      ctx.fillStyle = '#00ccff88';
      ctx.fillRect(W - 80, 8, 6, 6);
      ctx.fillStyle = '#88aacc';
      ctx.font = '8px sans-serif';
      ctx.fillText('Target', W - 70, 14);

      ctx.fillStyle = '#ff880066';
      ctx.fillRect(W - 80, 18, 6, 6);
      ctx.fillStyle = '#88aacc';
      ctx.fillText('Doublet', W - 70, 24);

      ctx.fillStyle = '#33445588';
      ctx.fillRect(W - 80, 28, 6, 6);
      ctx.fillStyle = '#88aacc';
      ctx.fillText('Debris', W - 70, 34);

      rafId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div style={{ padding: '8px 12px 4px' }}>
      <div style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        FSC-A vs SSC-A · Live Gate
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', borderRadius: 4, border: '1px solid #1a2a3a' }}
      />
    </div>
  );
}
