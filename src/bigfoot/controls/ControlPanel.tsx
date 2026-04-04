import { useSorterStore } from '../store/sorterStore';
import type { PlateType, SortMode } from '../physics/types';
import { PLATE_GEOMETRY } from '../physics/types';
import { estimatedSortTime } from '../physics/PlateKinematics';

function ToggleButton({
  label,
  active,
  onClick,
  color = '#00ccff',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 0',
        borderRadius: 4,
        border: `1px solid ${active ? color : '#1e2a3a'}`,
        background: active ? `${color}18` : 'transparent',
        color: active ? color : '#445566',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: active ? 'bold' : 'normal',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function SpeedButton({ mult, active, onClick }: { mult: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '4px 0',
        borderRadius: 3,
        border: `1px solid ${active ? '#ff9933' : '#1e2a3a'}`,
        background: active ? '#ff993318' : 'transparent',
        color: active ? '#ff9933' : '#445566',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {mult}×
    </button>
  );
}

export function BigfootControlPanel() {
  const config = useSorterStore((s) => s.config);
  const phase = useSorterStore((s) => s.runState.phase);
  const setConfig = useSorterStore((s) => s.setConfig);
  const startSort = useSorterStore((s) => s.startSort);
  const resetSort = useSorterStore((s) => s.resetSort);

  const isRunning = phase !== 'IDLE' && phase !== 'PLATE_COMPLETE';
  const isDone = phase === 'PLATE_COMPLETE';

  const estTime = estimatedSortTime(config);
  const fmt = (s: number) => s < 60 ? `~${s.toFixed(0)}s` : `~${(s / 60).toFixed(1)}min`;

  return (
    <div className="control-panel">
      <div style={{ fontSize: 11, color: '#667788', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Sort Configuration
      </div>

      {/* Plate type */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#445566', marginBottom: 4 }}>Plate Format</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['96', '384'] as PlateType[]).map((pt) => (
            <ToggleButton
              key={pt}
              label={`${pt}-well`}
              active={config.plateType === pt}
              onClick={() => setConfig({ plateType: pt })}
            />
          ))}
        </div>
      </div>

      {/* Sort mode */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#445566', marginBottom: 4 }}>Sort Mode</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['STRAIGHT_DOWN', 'Straight-Down'], ['FOUR_WAY', '4-Way']] as [SortMode, string][]).map(([mode, label]) => (
            <ToggleButton
              key={mode}
              label={label}
              active={config.sortMode === mode}
              onClick={() => setConfig({ sortMode: mode })}
              color={mode === 'FOUR_WAY' ? '#00e5aa' : '#00ccff'}
            />
          ))}
        </div>
        {config.sortMode === 'FOUR_WAY' && (
          <div style={{ fontSize: 9, color: '#2a5a4a', marginTop: 3 }}>
            4 streams · {config.plateType === '96' ? '24' : '96'} positions · ~2.6× faster
          </div>
        )}
      </div>

      {/* Events per well */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#445566', marginBottom: 4 }}>
          <span>Events per Well</span>
          <span style={{ fontFamily: 'monospace', color: '#00ccff' }}>{config.eventsPerWell}</span>
        </div>
        <input
          type="range"
          min={1} max={4} step={1}
          value={config.eventsPerWell}
          onChange={(e) => setConfig({ eventsPerWell: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#00ccff', cursor: 'pointer' }}
          disabled={isRunning}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#334455', marginTop: 1 }}>
          <span>Single-cell</span>
          <span>Bulk</span>
        </div>
      </div>

      {/* Simulation speed */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#445566', marginBottom: 4 }}>Simulation Speed</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 5, 10].map((m) => (
            <SpeedButton
              key={m}
              mult={m}
              active={config.speedMultiplier === m}
              onClick={() => setConfig({ speedMultiplier: m })}
            />
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#334455', marginTop: 4 }}>
          Est. sort time: <span style={{ color: '#667788' }}>{fmt(estTime)}</span>
          {' '}· Paper benchmark: ~20s
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={isDone ? resetSort : startSort}
          disabled={isRunning}
          style={{
            flex: 2,
            padding: '9px 0',
            borderRadius: 5,
            border: 'none',
            background: isRunning ? '#334' : isDone ? '#44aa55' : '#0055cc',
            color: isRunning ? '#556' : '#fff',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: '0.04em',
          }}
        >
          {isRunning ? '⏳ SORTING...' : isDone ? '↺ NEW SORT' : '▶ START SORT'}
        </button>
        <button
          onClick={resetSort}
          style={{
            flex: 1,
            padding: '9px 0',
            borderRadius: 5,
            border: '1px solid #1e2a3a',
            background: 'transparent',
            color: '#445566',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
