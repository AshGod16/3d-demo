import { BigfootScene } from './scene/BigfootScene';
import { BigfootTelemetryPanel } from './telemetry/TelemetryPanel';
import { BigfootControlPanel } from './controls/ControlPanel';
import { SortActionBar } from './controls/SortActionBar';

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Pan' },
  { keys: ['Q', 'E'],           label: 'Up / Down' },
  { keys: ['Scroll'],           label: 'Zoom' },
  { keys: ['Left drag'],        label: 'Rotate' },
  { keys: ['Right drag'],       label: 'Pan' },
];

function CameraLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12,
      background: 'rgba(5, 10, 20, 0.72)',
      border: '1px solid rgba(0, 180, 255, 0.18)',
      borderRadius: 8,
      padding: '8px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
      pointerEvents: 'none',
      backdropFilter: 'blur(4px)',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#4488aa', textTransform: 'uppercase', marginBottom: 2 }}>
        Camera Controls
      </span>
      {CONTROLS.map(({ keys, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {keys.map(k => (
              <kbd key={k} style={{
                display: 'inline-block',
                padding: '1px 5px',
                fontSize: 10,
                fontFamily: 'monospace',
                color: '#a0d8ef',
                background: 'rgba(0, 140, 200, 0.15)',
                border: '1px solid rgba(0, 180, 255, 0.3)',
                borderRadius: 4,
                lineHeight: '16px',
              }}>{k}</kbd>
            ))}
          </div>
          <span style={{ fontSize: 10, color: '#6a8fa8' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function BigfootApp() {
  return (
    <div className="app-layout" style={{ height: '100%' }}>
      {/* Header */}
      <div className="app-header">
        <span className="app-title" style={{ color: '#00ccff' }}>Bigfoot Spectral Cell Sorter</span>
        <span className="app-subtitle">
          Invitrogen · High-throughput plate sorting · Single-cell deposition · 100% targeting accuracy
        </span>
      </div>

      {/* Main content */}
      <div className="app-content">
        {/* 3D Canvas */}
        <div className="canvas-pane" style={{ position: 'relative' }}>
          <BigfootScene />
          <CameraLegend />
        </div>

        {/* Sidebar: scrollable body + pinned action bar */}
        <div className="sidebar-pane">
          <div className="sidebar-scroll">
            <BigfootTelemetryPanel />
            <BigfootControlPanel />
          </div>
          <SortActionBar />
        </div>
      </div>
    </div>
  );
}
