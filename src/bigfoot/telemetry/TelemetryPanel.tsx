import { useEffect, useState } from 'react';
import { ScatterPlot } from './ScatterPlot';
import { PlateMap } from './PlateMap';
import { SortCounters } from './SortCounters';
import { VerificationView } from './VerificationView';
import { useSorterStore } from '../store/sorterStore';

type Tab = 'live' | 'verify';

function TabBtn({ active, disabled, onClick, children }: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 10px',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: '0.04em',
        border: 'none',
        borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#0d2040' : 'transparent',
        color: disabled ? '#334455' : active ? '#00ccff' : '#556677',
        borderBottom: active ? '2px solid #00ccff' : '2px solid transparent',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export function BigfootTelemetryPanel() {
  const phase = useSorterStore((s) => s.runState.phase);
  const isDone = phase === 'PLATE_COMPLETE';
  const [activeTab, setActiveTab] = useState<Tab>('live');

  // Auto-switch to verify tab when sort completes
  useEffect(() => {
    if (isDone) setActiveTab('verify');
  }, [isDone]);

  // Auto-switch back to live tab when a new sort starts
  useEffect(() => {
    if (phase === 'MOVING_TO_WELL' || phase === 'SORTING') {
      setActiveTab('live');
    }
  }, [phase]);

  return (
    <div className="telemetry-panel">
      {/* Header with tabs */}
      <div style={{
        padding: '8px 12px 0',
        borderBottom: '1px solid #1a2030',
      }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: '#00ccff', letterSpacing: '0.04em' }}>
            BIGFOOT SPECTRAL CELL SORTER
          </span>
          <span style={{ fontSize: 9, color: '#445566', marginLeft: 8 }}>
            High-throughput plate sorting
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <TabBtn active={activeTab === 'live'} disabled={false} onClick={() => setActiveTab('live')}>
            LIVE
          </TabBtn>
          <TabBtn active={activeTab === 'verify'} disabled={!isDone} onClick={() => isDone && setActiveTab('verify')}>
            VERIFY {isDone && activeTab !== 'verify' ? '●' : ''}
          </TabBtn>
        </div>
      </div>

      {activeTab === 'live' ? (
        <>
          <SortCounters />
          <PlateMap />
          <ScatterPlot />
        </>
      ) : (
        <VerificationView />
      )}
    </div>
  );
}
