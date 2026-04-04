import { ScatterPlot } from './ScatterPlot';
import { PlateMap } from './PlateMap';
import { SortCounters } from './SortCounters';

export function BigfootTelemetryPanel() {
  return (
    <div className="telemetry-panel">
      <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid #1a2030' }}>
        <span style={{ fontSize: 11, fontWeight: 'bold', color: '#00ccff', letterSpacing: '0.04em' }}>
          BIGFOOT SPECTRAL CELL SORTER
        </span>
        <span style={{ fontSize: 9, color: '#445566', marginLeft: 8 }}>
          High-throughput plate sorting
        </span>
      </div>

      {/* Sort counters + phase */}
      <SortCounters />

      {/* Plate map */}
      <PlateMap />

      {/* Live scatter plot */}
      <ScatterPlot />
    </div>
  );
}
