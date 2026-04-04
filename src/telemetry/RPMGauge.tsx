import { useRef, useEffect } from 'react';
import { useEngineStore } from '../store/engineStore';

// Custom SVG arc gauge — updates DOM directly to avoid React re-renders at 60fps
const MAX_RPM = 7500;
const REDLINE_RPM = 6500;
const ARC_R = 54;
const CX = 70;
const CY = 70;

function rpmToAngle(rpm: number): number {
  // -220° to 40° sweep (260° total)
  return -220 + (rpm / MAX_RPM) * 260;
}

function polarToXY(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function describeArc(startDeg: number, endDeg: number, r: number): string {
  const [sx, sy] = polarToXY(startDeg, r);
  const [ex, ey] = polarToXY(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
}

export function RPMGauge() {
  const needleRef = useRef<SVGLineElement>(null);
  const rpmTextRef = useRef<SVGTextElement>(null);
  const arcRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Direct DOM updates — bypass React reconciler entirely
    let rafId: number;
    function tick() {
      const rpm = useEngineStore.getState().engineState.rpm;
      const angle = rpmToAngle(rpm);
      const [nx, ny] = polarToXY(angle, ARC_R * 0.7);
      if (needleRef.current) {
        needleRef.current.setAttribute('x2', String(nx));
        needleRef.current.setAttribute('y2', String(ny));
      }
      if (rpmTextRef.current) {
        rpmTextRef.current.textContent = String(Math.round(rpm));
      }
      // Arc fill up to current RPM
      if (arcRef.current) {
        const color = rpm > REDLINE_RPM ? '#ff3333' : '#00e5aa';
        arcRef.current.setAttribute('stroke', color);
        arcRef.current.setAttribute('d', describeArc(-220, rpmToAngle(rpm), ARC_R));
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const tickMarks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 7500];

  return (
    <div className="rpm-gauge">
      <svg width="140" height="100" viewBox="0 0 140 100">
        {/* Track arc */}
        <path
          d={describeArc(-220, 40, ARC_R)}
          stroke="#1e2a3a"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Redline zone */}
        <path
          d={describeArc(rpmToAngle(REDLINE_RPM), 40, ARC_R)}
          stroke="#cc2222"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />
        {/* Live fill arc */}
        <path
          ref={arcRef}
          d={describeArc(-220, -220, ARC_R)}
          stroke="#00e5aa"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Tick marks */}
        {tickMarks.map((r) => {
          const a = rpmToAngle(r);
          const [ox, oy] = polarToXY(a, ARC_R + 6);
          const [ix, iy] = polarToXY(a, ARC_R - 6);
          return (
            <line key={r} x1={ox} y1={oy} x2={ix} y2={iy}
              stroke="#4455aa" strokeWidth={r % 2000 === 0 ? 2 : 1} />
          );
        })}
        {/* Needle */}
        <line
          ref={needleRef}
          x1={CX} y1={CY}
          x2={CX} y2={CY - ARC_R * 0.7}
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={CX} cy={CY} r={4} fill="#667" />
        {/* RPM readout */}
        <text ref={rpmTextRef} x={CX} y={CY + 18} textAnchor="middle"
          fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">
          2000
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle"
          fill="#667788" fontSize="8" fontFamily="sans-serif">
          RPM
        </text>
      </svg>
    </div>
  );
}
