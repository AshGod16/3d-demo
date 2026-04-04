// Failure mode detection and application logic.
// Each failure mode has a detection condition and an effect on physics state.

import type { CylinderState, EngineConfig, FailureMode } from './types';

const P_ATM = 101325;

/**
 * Detect any active failure mode from current physics state.
 * Returns null if no failure is present.
 */
export function detectFailure(
  state: CylinderState,
  config: EngineConfig,
  rpm: number,
  forcedMode: FailureMode | null
): FailureMode | null {
  if (forcedMode) return forcedMode;

  // OVERREV: RPM exceeds safe limit
  if (rpm > 7000) return 'OVERREV';

  // PRE_IGNITION: wall temperature exceeds safe threshold
  if (state.wallTemp > 800) return 'PRE_IGNITION';

  // KNOCK: abnormal end-gas autoignition
  // Occurs when compression ratio is high and timing is very advanced
  if (config.compressionRatio > 11.5 && config.ignitionAdvance > 30) return 'KNOCK';

  // DETONATION: extreme knock, instantaneous pressure event
  if (config.compressionRatio > 13) return 'DETONATION';

  return null;
}

/**
 * Apply failure mode effects to pressure/temperature.
 * Returns modified state values.
 */
export function applyFailureEffect(
  state: CylinderState,
  mode: FailureMode,
  frameT: number  // time within frame for oscillation
): Partial<CylinderState> {
  switch (mode) {
    case 'KNOCK': {
      // Oscillating pressure spike superimposed on normal curve (every power stroke)
      if (state.phase === 'POWER' || state.phase === 'COMPRESSION') {
        const spike = state.pressure * 0.15 * Math.sin(frameT * 8000);
        return { pressure: Math.max(P_ATM, state.pressure + spike) };
      }
      return {};
    }

    case 'DETONATION': {
      // Instantaneous 3× pressure spike at combustion
      if (state.hasFired && state.phase === 'POWER') {
        return {
          pressure: state.pressure * 2.5,
          temperature: state.temperature + 400,
          wallTemp: state.wallTemp + 50,
        };
      }
      return {};
    }

    case 'PRE_IGNITION': {
      // Early combustion before normal ignition — occurs in compression stroke
      if (state.phase === 'COMPRESSION' && state.crankAngle > 270 && state.crankAngle < 340) {
        // Simulate early pressure rise (compresses against expanding gases)
        return {
          pressure: state.pressure * 1.3,
          temperature: state.temperature + 80,
        };
      }
      return {};
    }

    case 'OVERREV': {
      // No direct pressure effect but temperature rises faster
      return {
        wallTemp: state.wallTemp + 0.5,
      };
    }

    default:
      return {};
  }
}

export function getFailureMessage(mode: FailureMode): string {
  switch (mode) {
    case 'KNOCK':
      return 'KNOCK — Abnormal end-gas autoignition. Retard timing or reduce load.';
    case 'DETONATION':
      return 'DETONATION — Instantaneous pressure spike. Reduce compression ratio or use higher-octane fuel.';
    case 'PRE_IGNITION':
      return 'PRE-IGNITION — Combustion before spark. Cylinder wall temperature critical. Reduce load.';
    case 'OVERREV':
      return 'OVER-REV — RPM exceeds safe limit. Connecting rod stress approaching material limit.';
  }
}
