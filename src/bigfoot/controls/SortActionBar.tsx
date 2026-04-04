// Persistent action bar pinned to the bottom of the sidebar.
// Lives outside the scrollable region so START SORT / Reset are always visible.

import { useSorterStore } from '../store/sorterStore';

export function SortActionBar() {
  const phase = useSorterStore((s) => s.runState.phase);
  const config = useSorterStore((s) => s.config);
  const startSort = useSorterStore((s) => s.startSort);
  const resetSort = useSorterStore((s) => s.resetSort);

  const isRunning = phase !== 'IDLE' && phase !== 'PLATE_COMPLETE';
  const isDone = phase === 'PLATE_COMPLETE';
  const disabledStart = isRunning || (config.advancedSortMode && !config.selectedWells);

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      gap: 8,
      padding: '10px 12px',
      borderTop: '1px solid #1a2030',
      background: '#0d1120',
    }}>
      <button
        onClick={isDone ? resetSort : startSort}
        disabled={disabledStart}
        style={{
          flex: 2,
          padding: '10px 0',
          borderRadius: 5,
          border: 'none',
          background: isRunning
            ? '#334'
            : isDone
              ? '#44aa55'
              : disabledStart
                ? '#223'
                : '#0055cc',
          color: disabledStart ? '#556' : '#fff',
          cursor: disabledStart ? 'not-allowed' : 'pointer',
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
          padding: '10px 0',
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
  );
}
