import { BigfootScene } from './scene/BigfootScene';
import { BigfootTelemetryPanel } from './telemetry/TelemetryPanel';
import { BigfootControlPanel } from './controls/ControlPanel';

export function BigfootApp() {
  return (
    <div className="app-layout">
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
        <div className="canvas-pane">
          <BigfootScene />
        </div>

        {/* Sidebar */}
        <div className="sidebar-pane">
          <BigfootTelemetryPanel />
          <BigfootControlPanel />
        </div>
      </div>
    </div>
  );
}
