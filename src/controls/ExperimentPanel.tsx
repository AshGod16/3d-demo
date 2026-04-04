import { useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import type { FailureMode } from '../physics/types';

type Tab = 'view' | 'failures' | 'parts';

const FAILURE_MODES: Array<{ mode: FailureMode; label: string; desc: string; color: string }> = [
  { mode: 'KNOCK', label: 'Trigger Knock', desc: 'Abnormal end-gas autoignition', color: '#ff9900' },
  { mode: 'DETONATION', label: 'Trigger Detonation', desc: 'Instantaneous pressure spike', color: '#ff3300' },
  { mode: 'PRE_IGNITION', label: 'Pre-Ignition', desc: 'Early combustion before spark', color: '#ff6600' },
  { mode: 'OVERREV', label: 'Over-Rev', desc: 'Exceed safe RPM limit', color: '#ff0066' },
];

const PART_IDS = [
  { id: 'cylinder-head', label: 'Cylinder Head' },
  { id: 'valve-intake', label: 'Intake Valve' },
  { id: 'valve-exhaust', label: 'Exhaust Valve' },
  { id: 'piston', label: 'Piston' },
  { id: 'connecting-rod', label: 'Connecting Rod' },
  { id: 'crankshaft', label: 'Crankshaft' },
  { id: 'cylinder', label: 'Cylinder Block' },
];

export function ExperimentPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('view');
  const triggerFailureMode = useEngineStore((s) => s.triggerFailureMode);
  const clearFailureMode = useEngineStore((s) => s.clearFailureMode);
  const setExplodedViewState = useEngineStore((s) => s.setExplodedViewState);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'view', label: 'View' },
    { id: 'failures', label: 'Failure Lab' },
    { id: 'parts', label: 'Parts' },
  ];

  return (
    <div className="experiment-panel">
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #00e5aa' : '2px solid transparent',
              color: activeTab === t.id ? '#00e5aa' : '#667788',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: activeTab === t.id ? 'bold' : 'normal',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* View tab */}
      {activeTab === 'view' && (
        <div>
          <p style={{ fontSize: 11, color: '#667788', marginBottom: 10 }}>
            Animate the engine apart to inspect individual components.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setExplodedViewState('EXPLODING')}
              disabled={explodedViewState === 'EXPLODED' || explodedViewState === 'EXPLODING'}
              className="action-btn"
            >
              Explode View
            </button>
            <button
              onClick={() => setExplodedViewState('ASSEMBLING')}
              disabled={explodedViewState === 'ASSEMBLED' || explodedViewState === 'ASSEMBLING'}
              className="action-btn"
            >
              Assemble
            </button>
          </div>
          <p style={{ fontSize: 10, color: '#445566', marginTop: 10 }}>
            Tip: Click any part to highlight and isolate it. Click again to deselect.
          </p>
        </div>
      )}

      {/* Failure Lab tab */}
      {activeTab === 'failures' && (
        <div>
          <p style={{ fontSize: 11, color: '#667788', marginBottom: 10 }}>
            Simulate abnormal operating conditions. Watch the P-θ chart for telltale signatures.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FAILURE_MODES.map((f) => (
              <button
                key={f.mode}
                onClick={() => triggerFailureMode(f.mode)}
                style={{
                  background: `${f.color}18`,
                  border: `1px solid ${f.color}66`,
                  borderRadius: 4,
                  color: f.color,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{f.label}</div>
                <div style={{ color: '#889', fontSize: 10, marginTop: 2 }}>{f.desc}</div>
              </button>
            ))}
            <button
              onClick={clearFailureMode}
              style={{
                background: '#1a2a1a',
                border: '1px solid #336633',
                borderRadius: 4,
                color: '#44aa55',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 11,
                marginTop: 4,
              }}
            >
              ✓ Clear All Failures
            </button>
          </div>
        </div>
      )}

      {/* Parts tab */}
      {activeTab === 'parts' && (
        <div>
          <p style={{ fontSize: 11, color: '#667788', marginBottom: 10 }}>
            Click a part to isolate it in the 3D view.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PART_IDS.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPart(selectedPartId === p.id ? null : p.id)}
                style={{
                  background: selectedPartId === p.id ? '#ffaa3322' : '#12182a',
                  border: `1px solid ${selectedPartId === p.id ? '#ffaa33' : '#1e2a3a'}`,
                  borderRadius: 4,
                  color: selectedPartId === p.id ? '#ffaa33' : '#8899aa',
                  padding: '6px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {p.label}
              </button>
            ))}
            {selectedPartId && (
              <button
                onClick={() => selectPart(null)}
                style={{
                  background: 'none',
                  border: '1px solid #334',
                  borderRadius: 4,
                  color: '#556',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Deselect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
