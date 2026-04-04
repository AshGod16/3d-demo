import { useEngineStore } from '../store/engineStore';

const SEVERITY: Record<string, string> = {
  KNOCK: '#ff9900',
  DETONATION: '#ff2200',
  PRE_IGNITION: '#ff6600',
  OVERREV: '#ff0066',
};

export function FailureAlerts() {
  const failureMode = useEngineStore((s) => s.engineState.failureMode);
  const failureMessage = useEngineStore((s) => s.engineState.failureMessage);
  const clearFailureMode = useEngineStore((s) => s.clearFailureMode);

  if (!failureMode) return null;

  const color = SEVERITY[failureMode] ?? '#ff2200';

  return (
    <div
      style={{
        margin: '8px 0',
        padding: '10px 12px',
        borderRadius: 6,
        border: `1px solid ${color}`,
        background: `${color}18`,
        animation: 'pulse 1s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color, fontSize: 12 }}>
          ⚠ {failureMode.replace('_', ' ')}
        </span>
        <button
          onClick={clearFailureMode}
          style={{
            background: 'none',
            border: `1px solid ${color}`,
            color,
            borderRadius: 3,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Clear
        </button>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ccc', lineHeight: 1.4 }}>
        {failureMessage}
      </p>
    </div>
  );
}
