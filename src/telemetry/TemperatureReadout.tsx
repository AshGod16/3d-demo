import { useEngineStore } from '../store/engineStore';

function TempBar({ value, max, label, color }: {
  value: number; max: number; label: string; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8899aa', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace', color: '#ccd' }}>{Math.round(value)} K</span>
      </div>
      <div style={{ background: '#1a2030', borderRadius: 3, height: 6 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

export function TemperatureReadout() {
  const cyl = useEngineStore((s) => s.engineState.cylinder);

  return (
    <div className="temp-panel">
      <h3 className="chart-title">Temperatures</h3>
      <TempBar value={cyl.temperature} max={3000} label="Combustion Gas" color="#ff6633" />
      <TempBar value={cyl.wallTemp} max={1000} label="Cylinder Wall" color="#ff9922" />
      <TempBar value={Math.min(cyl.wallTemp * 0.85, 900)} max={900} label="Piston Crown" color="#ffcc33" />
    </div>
  );
}
