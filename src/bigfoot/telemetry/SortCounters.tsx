import { useSorterStore } from '../store/sorterStore';
import { PLATE_GEOMETRY } from '../physics/types';
import { estimatedSortTime } from '../physics/PlateKinematics';

function Counter({ label, value, unit, highlight }: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: highlight ? '#00e5aa' : '#e0eeff',
        lineHeight: 1.1,
      }}>
        {value}
        {unit && <span style={{ fontSize: 10, color: '#667788', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9, color: '#445566', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

export function SortCounters() {
  const runState = useSorterStore((s) => s.runState);
  const config = useSorterStore((s) => s.config);
  const geo = PLATE_GEOMETRY[config.plateType];

  const {
    phase,
    elapsed,
    totalCellsSorted,
    totalEventsProcessed,
    eventsPerSec,
    currentWellIndex,
    infinisortPlateCount,
    infinisortTotalCells,
  } = runState;

  const phasePretty: Record<string, string> = {
    IDLE: 'READY',
    MOVING_TO_WELL: 'STAGE MOVING',
    SORTING: 'SORTING',
    WELL_DONE: 'ADVANCING',
    PLATE_COMPLETE: 'COMPLETE',
  };

  const phaseColor: Record<string, string> = {
    IDLE: '#445566',
    MOVING_TO_WELL: '#ff9933',
    SORTING: '#00e5ff',
    WELL_DONE: '#44cc66',
    PLATE_COMPLETE: '#00e5aa',
  };

  const efficiency = totalEventsProcessed > 0
    ? ((totalCellsSorted / totalEventsProcessed) * 100).toFixed(1)
    : '—';

  const estTotal = estimatedSortTime(config);
  const totalTarget = (config.advancedSortMode && config.selectedWells)
    ? config.selectedWells.length
    : geo.totalWells;
  // In advanced mode, count how many selected wells have been completed
  const wellsDone = phase === 'PLATE_COMPLETE'
    ? totalTarget
    : (config.advancedSortMode && config.selectedWells)
      ? config.selectedWells.filter(w => w < currentWellIndex).length
      : currentWellIndex;
  const estRemaining = phase === 'PLATE_COMPLETE'
    ? 0
    : Math.max(0, estTotal - elapsed);

  const fmt = (s: number) => s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}:${(s % 60).toFixed(0).padStart(2, '0')}`;

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid #1a2030' }}>
      {/* Phase indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        padding: '4px 8px',
        background: '#0d1525',
        borderRadius: 4,
        border: `1px solid ${phaseColor[phase] ?? '#334'}44`,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: phaseColor[phase] ?? '#445',
          boxShadow: phase === 'SORTING' ? `0 0 6px ${phaseColor.SORTING}` : 'none',
        }} />
        <span style={{ fontSize: 11, color: phaseColor[phase] ?? '#445', fontWeight: 'bold' }}>
          {phasePretty[phase] ?? phase}
        </span>
        <span style={{ fontSize: 10, color: '#334455', marginLeft: 'auto' }}>
          Well {wellsDone + (phase === 'PLATE_COMPLETE' ? 0 : 1)} / {totalTarget}
        </span>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <Counter label="Events/s" value={eventsPerSec || '—'} />
        <Counter label="Sorted" value={totalCellsSorted} highlight />
        <Counter label="Efficiency" value={efficiency} unit="%" />
        <Counter label="Elapsed" value={fmt(elapsed)} />
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#445566', marginBottom: 2 }}>
          <span>{config.advancedSortMode ? 'SORT PROGRESS' : 'PLATE PROGRESS'}</span>
          <span>{Math.round((wellsDone / totalTarget) * 100)}%</span>
        </div>
        <div style={{ background: '#1a2030', borderRadius: 3, height: 5, overflow: 'hidden' }}>
          <div style={{
            width: `${(wellsDone / totalTarget) * 100}%`,
            height: '100%',
            background: phase === 'PLATE_COMPLETE' ? '#00e5aa' : '#0066ff',
            borderRadius: 3,
            transition: 'width 0.15s linear',
          }} />
        </div>
        {phase !== 'IDLE' && phase !== 'PLATE_COMPLETE' && (
          <div style={{ fontSize: 9, color: '#334455', marginTop: 2, textAlign: 'right' }}>
            Est. remaining: {fmt(estRemaining)}
          </div>
        )}
      </div>

      {/* Benchmark comparison */}
      {phase === 'PLATE_COMPLETE' && (() => {
        const benchmarks: Record<string, Record<string, number>> = {
          '96':   { STRAIGHT_DOWN: 19.87, FOUR_WAY: 7.65   },
          '384':  { STRAIGHT_DOWN: 61.13, FOUR_WAY: 17.38  },
          '1536': { STRAIGHT_DOWN: 194.43, FOUR_WAY: 194.43 },
        };
        const bench      = benchmarks[config.plateType];
        const modeLabel  = config.sortMode === 'FOUR_WAY' ? '4-way' : 'straight-down';
        const altMode    = config.sortMode === 'FOUR_WAY' ? 'STRAIGHT_DOWN' : 'FOUR_WAY';
        const altLabel   = config.sortMode === 'FOUR_WAY' ? 'straight-down' : '4-way';
        const thisBench  = bench?.[config.sortMode] ?? 20;
        const altBench   = bench?.[altMode] ?? 20;
        const faster     = config.sortMode === 'FOUR_WAY';
        const is1536     = config.plateType === '1536';
        const isAdvanced = config.advancedSortMode && config.selectedWells;
        const totalPlates = infinisortPlateCount + 1;
        const cumulativeCells = infinisortTotalCells + totalCellsSorted;
        return (
          <div style={{
            marginTop: 8,
            padding: '6px 8px',
            background: faster ? '#00e5aa11' : '#0055ff11',
            border: `1px solid ${faster ? '#00e5aa33' : '#0055ff33'}`,
            borderRadius: 4,
            fontSize: 10,
            color: faster ? '#00e5aa' : '#4488ff',
          }}>
            ✓ Sort complete in {fmt(elapsed)}
            <div style={{ marginTop: 3, color: '#445566', fontSize: 9 }}>
              {isAdvanced
                ? `${config.selectedWells!.length} wells sorted (advanced mode)`
                : `${modeLabel} benchmark: ~${thisBench.toFixed(1)}s`
              }
              {!is1536 && !isAdvanced && (
                <>
                  <span style={{ marginLeft: 6 }}>·</span>
                  <span style={{ marginLeft: 6 }}>{altLabel}: ~{altBench.toFixed(1)}s</span>
                  {faster && (
                    <span style={{ marginLeft: 6, color: '#00e5aa' }}>
                      ({(altBench / thisBench).toFixed(1)}× faster)
                    </span>
                  )}
                </>
              )}
            </div>
            {/* InfiniSort cumulative line */}
            {infinisortPlateCount > 0 && (
              <div style={{ marginTop: 5, paddingTop: 5, borderTop: `1px solid ${faster ? '#00e5aa22' : '#0055ff22'}`, color: '#445566', fontSize: 9 }}>
                InfiniSort: plate {totalPlates} · {cumulativeCells.toLocaleString()} cells total
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
