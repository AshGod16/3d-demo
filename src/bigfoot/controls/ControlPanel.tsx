import { useSorterStore } from '../store/sorterStore';
import type { PlateType, SortMode } from '../physics/types';
import { PLATE_GEOMETRY } from '../physics/types';
import { estimatedSortTime } from '../physics/PlateKinematics';
import { WellPicker } from './WellPicker';

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

  const isRunning = phase !== 'IDLE' && phase !== 'PLATE_COMPLETE';
  const is1536 = config.plateType === '1536';

  const estTimeFull = estimatedSortTime(config);
  const estTimeSelected = (config.advancedSortMode && config.selectedWells)
    ? estTimeFull * (config.selectedWells.length / PLATE_GEOMETRY[config.plateType].totalWells)
    : null;

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
          {(['96', '384', '1536'] as PlateType[]).map((pt) => (
            <ToggleButton
              key={pt}
              label={`${pt}-well`}
              active={config.plateType === pt}
              onClick={() => setConfig({ plateType: pt })}
            />
          ))}
        </div>
        {is1536 && (
          <div style={{ fontSize: 9, color: '#334455', marginTop: 3 }}>
            1536-well · straight-down only · ~3m14s full plate
          </div>
        )}
      </div>

      {/* Sort mode (hidden for 1536) */}
      {!is1536 && (
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
      )}

      {/* Advanced Sort Mode toggle */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#445566' }}>Advanced Sort Mode</div>
          <button
            onClick={() => setConfig({ advancedSortMode: !config.advancedSortMode })}
            disabled={isRunning}
            style={{
              marginLeft: 'auto',
              padding: '3px 10px',
              borderRadius: 3,
              border: `1px solid ${config.advancedSortMode ? '#ff9933' : '#1e2a3a'}`,
              background: config.advancedSortMode ? '#ff993318' : 'transparent',
              color: config.advancedSortMode ? '#ff9933' : '#445566',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: 10,
              fontWeight: config.advancedSortMode ? 'bold' : 'normal',
            }}
          >
            {config.advancedSortMode ? 'ON' : 'OFF'}
          </button>
        </div>
        {config.advancedSortMode && !isRunning && (
          <WellPicker plateType={config.plateType} />
        )}
        {config.advancedSortMode && config.selectedWells && (
          <div style={{ fontSize: 9, color: '#445566', marginTop: 4 }}>
            {config.selectedWells.length} wells selected
            {estTimeSelected !== null && (
              <> · Est. {fmt(estTimeSelected)} <span style={{ color: '#334455' }}>(vs {fmt(estTimeFull)} full plate)</span></>
            )}
          </div>
        )}
        {config.advancedSortMode && !config.selectedWells && (
          <div style={{ fontSize: 9, color: '#664422', marginTop: 4 }}>
            Select wells above to enable sort
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
          Est. sort time:{' '}
          <span style={{ color: '#667788' }}>
            {config.advancedSortMode && estTimeSelected !== null
              ? fmt(estTimeSelected)
              : fmt(estTimeFull)}
          </span>
          {!is1536 && !config.advancedSortMode && (
            <> · Paper benchmark: {config.sortMode === 'FOUR_WAY' ? '~8s' : '~20s'}</>
          )}
          {is1536 && <> · Paper benchmark: ~3m14s</>}
        </div>
      </div>

    </div>
  );
}
