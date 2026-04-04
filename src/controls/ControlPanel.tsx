import { useEngineStore } from '../store/engineStore';

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  danger,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  danger?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = danger && pct > 75 ? '#ff4444' : danger && pct > 55 ? '#ff9900' : '#00e5aa';

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: '#8899aa' }}>{label}</span>
        <span style={{ fontFamily: 'monospace', color }}>
          {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}
          {unit && <span style={{ color: '#556677', marginLeft: 2 }}>{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
    </div>
  );
}

export function ControlPanel() {
  const rpm = useEngineStore((s) => s.engineState.rpm);
  const config = useEngineStore((s) => s.engineConfig);
  const isRunning = useEngineStore((s) => s.isRunning);
  const setRpm = useEngineStore((s) => s.setRpm);
  const setIgnitionAdvance = useEngineStore((s) => s.setIgnitionAdvance);
  const setCompressionRatio = useEngineStore((s) => s.setCompressionRatio);
  const setRunning = useEngineStore((s) => s.setRunning);

  return (
    <div className="control-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 12, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Engine Controls
        </h3>
        <button
          onClick={() => setRunning(!isRunning)}
          style={{
            padding: '4px 14px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 'bold',
            background: isRunning ? '#cc3333' : '#33aa55',
            color: '#fff',
          }}
        >
          {isRunning ? '■ Stop' : '▶ Start'}
        </button>
      </div>

      <Slider
        label="Engine Speed"
        value={rpm}
        min={500}
        max={7500}
        step={100}
        unit="RPM"
        onChange={setRpm}
        danger
      />

      <Slider
        label="Ignition Advance"
        value={config.ignitionAdvance}
        min={-10}
        max={45}
        step={1}
        unit="° BTDC"
        onChange={setIgnitionAdvance}
        danger
      />

      <Slider
        label="Compression Ratio"
        value={config.compressionRatio}
        min={6}
        max={14}
        step={0.5}
        unit=":1"
        onChange={setCompressionRatio}
        danger
      />
    </div>
  );
}
