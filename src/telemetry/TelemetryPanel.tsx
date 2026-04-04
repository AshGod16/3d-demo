import { useEngineStore } from '../store/engineStore';
import { RPMGauge } from './RPMGauge';
import { PVDiagram } from './PVDiagram';
import { CrankAngleChart } from './CrankAngleChart';
import { TemperatureReadout } from './TemperatureReadout';
import { FailureAlerts } from './FailureAlerts';

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace', color: '#e0eeff' }}>
        {value}{unit && <span style={{ fontSize: 11, color: '#8899aa', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, color: '#667788', marginTop: 1 }}>{label}</div>
    </div>
  );
}

export function TelemetryPanel() {
  const { torque, power, thermalEfficiency } = useEngineStore((s) => s.engineState);
  const crankAngle = useEngineStore((s) => s.engineState.crankAngle);
  const phase = useEngineStore((s) => s.engineState.cylinder.phase);
  const cycleCount = useEngineStore((s) => s.engineState.cycleCount);

  const phaseColors: Record<string, string> = {
    INTAKE: '#4488bb',
    COMPRESSION: '#bb44aa',
    POWER: '#ff6633',
    EXHAUST: '#44aa55',
  };

  return (
    <div className="telemetry-panel">
      {/* Top row: RPM gauge + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
        <RPMGauge />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', flex: 1 }}>
          <Stat label="Torque" value={torque.toFixed(1)} unit="N·m" />
          <Stat label="Power" value={(power / 1000).toFixed(1)} unit="kW" />
          <Stat label="η Thermal" value={(thermalEfficiency * 100).toFixed(1)} unit="%" />
          <Stat label="Cycles" value={cycleCount} />
        </div>
      </div>

      {/* Phase indicator */}
      <div style={{ padding: '4px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: phaseColors[phase] ?? '#888',
          }} />
          <span style={{ fontSize: 11, color: phaseColors[phase] ?? '#888', fontWeight: 'bold' }}>
            {phase}
          </span>
          <span style={{ fontSize: 11, color: '#556', marginLeft: 4 }}>
            {crankAngle.toFixed(0)}°
          </span>
        </div>
      </div>

      {/* Failure alerts */}
      <div style={{ padding: '0 12px' }}>
        <FailureAlerts />
      </div>

      {/* Charts */}
      <PVDiagram />
      <CrankAngleChart />

      {/* Temperatures */}
      <div style={{ padding: '8px 12px' }}>
        <TemperatureReadout />
      </div>
    </div>
  );
}
