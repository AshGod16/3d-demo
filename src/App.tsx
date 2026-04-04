import { useState } from 'react';
import { EngineScene } from './scene/EngineScene';
import { TelemetryPanel } from './telemetry/TelemetryPanel';
import { ControlPanel } from './controls/ControlPanel';
import { ExperimentPanel } from './controls/ExperimentPanel';
import { BigfootApp } from './bigfoot/BigfootApp';

type Demo = 'engine' | 'bigfoot';

export default function App() {
  const [activeDemo, setActiveDemo] = useState<Demo>('bigfoot');

  if (activeDemo === 'bigfoot') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Demo switcher tab bar */}
        <DemoNav active={activeDemo} onChange={setActiveDemo} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <BigfootApp />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <DemoNav active={activeDemo} onChange={setActiveDemo} />
      <div className="app-layout" style={{ flex: 1, paddingTop: 0 }}>
        <div className="app-header">
          <span className="app-title">Engine Simulation</span>
          <span className="app-subtitle">Single-cylinder 4-stroke Otto cycle · Real thermodynamics</span>
        </div>
        <div className="app-content">
          <div className="canvas-pane">
            <EngineScene />
          </div>
          <div className="sidebar-pane">
            <TelemetryPanel />
            <ControlPanel />
            <ExperimentPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoNav({ active, onChange }: { active: Demo; onChange: (d: Demo) => void }) {
  const tabs: Array<{ id: Demo; label: string; color: string }> = [
    { id: 'bigfoot', label: 'Bigfoot Cell Sorter', color: '#00ccff' },
    { id: 'engine', label: 'Engine Simulation', color: '#00e5aa' },
  ];

  return (
    <div style={{
      display: 'flex',
      background: '#08101e',
      borderBottom: '1px solid #1a2030',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '7px 20px',
            background: 'none',
            border: 'none',
            borderBottom: active === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            color: active === t.id ? t.color : '#445566',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: active === t.id ? 'bold' : 'normal',
            letterSpacing: '0.03em',
          }}
        >
          {t.label}
        </button>
      ))}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12 }}>
        <span style={{ fontSize: 9, color: '#2a3a4a', fontFamily: 'monospace' }}>
          Thermo Fisher Lab Simulation Suite
        </span>
      </div>
    </div>
  );
}
