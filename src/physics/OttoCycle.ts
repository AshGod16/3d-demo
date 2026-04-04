// Core Otto cycle thermodynamic state machine.
// Pure TypeScript — no React, Three.js, or browser APIs.
// The step function is deterministic and can be unit tested in Node.

import type { EngineConfig, CylinderState, PVPoint, PAPoint } from './types';
import { cylinderVolume, getStrokePhase, computeTorque } from './KinematicSolver';

const GAMMA = 1.35;           // heat capacity ratio for air-fuel mix
const R_AIR = 287;            // J/(kg·K) specific gas constant for air
const LHV_GASOLINE = 44e6;   // J/kg lower heating value of gasoline
const COMBUSTION_EFF = 0.85; // combustion efficiency
const CV_MOLAR = 20.8;       // J/(mol·K) molar heat capacity at constant volume
const R_MOLAR = 8.314;       // J/(mol·K) universal gas constant
const P_ATM = 101325;        // Pa atmospheric pressure
const T_AMBIENT = 293;       // K ambient temperature

// Wall heat transfer coefficient — drives wall temp accumulation
const WALL_HEAT_K = 0.0002;

/**
 * Returns true if the crank angle transition (prevAngle → newAngle) crosses targetDeg.
 * Handles the wrap-around at 720°.
 */
function crossesAngle(prev: number, next: number, target: number): boolean {
  if (next > prev) {
    return prev <= target && target < next;
  }
  // wrapped around
  return prev <= target || target < next;
}

/**
 * Step the Otto cycle simulation forward by deltaAngleDeg degrees of crank rotation.
 * Returns a new CylinderState (immutable update pattern).
 */
export function stepOttoCycle(
  state: CylinderState,
  config: EngineConfig,
  deltaAngleDeg: number
): CylinderState {
  const prevAngle = state.crankAngle;
  const newAngle = (prevAngle + deltaAngleDeg) % 720;

  const prevVolume = cylinderVolume(prevAngle, config);
  const newVolume = cylinderVolume(newAngle, config);

  const phase = getStrokePhase(newAngle);

  let { pressure, temperature, wallTemp } = state;
  let hasFired = state.hasFired;

  // ── Ignition angle in 4-stroke cycle (compression stroke ends at 360°)
  // ignitionAdvance degrees BTDC means fire at (360 - ignitionAdvance)°
  const ignitionAngle = 360 - config.ignitionAdvance;

  // ── Compression and power strokes: isentropic process PV^γ = const
  if (phase === 'COMPRESSION' || phase === 'POWER') {
    if (Math.abs(newVolume - prevVolume) > 1e-12 && prevVolume > 0) {
      pressure = state.pressure * Math.pow(prevVolume / newVolume, GAMMA);
      temperature = state.temperature * Math.pow(prevVolume / newVolume, GAMMA - 1);
    }
  }

  // ── Combustion event: instantaneous heat addition at constant volume
  if (
    !hasFired &&
    phase === 'COMPRESSION' &&
    crossesAngle(prevAngle, newAngle, ignitionAngle)
  ) {
    // Mass of air-fuel mixture at ignition point (ideal gas law)
    const m_air = (pressure * newVolume) / (R_AIR * temperature);
    const m_fuel = m_air * config.fuelAirRatio;
    const Q_in = m_fuel * LHV_GASOLINE * COMBUSTION_EFF;

    // Moles of gas at ignition
    const n_mol = (pressure * newVolume) / (R_MOLAR * temperature);
    const deltaT = n_mol > 0 ? Q_in / (n_mol * CV_MOLAR) : 0;

    temperature = temperature + deltaT;
    // Constant-volume pressure rise: P2/P1 = T2/T1
    pressure = pressure * (temperature / (temperature - deltaT));

    // Wall heat transfer accumulation
    wallTemp = wallTemp + deltaT * WALL_HEAT_K;

    hasFired = true;
  }

  // ── Intake and exhaust strokes: gas exchange
  // Reset to fresh charge conditions approaching BDC on intake
  if (phase === 'INTAKE') {
    // Smooth blend toward atmospheric as piston descends
    const intakeProgress = (newAngle % 180) / 180; // 0→1 over intake stroke
    const targetPressure = P_ATM;
    const targetTemp = T_AMBIENT + (wallTemp - T_AMBIENT) * 0.1; // slightly heated by walls
    pressure = pressure + (targetPressure - pressure) * intakeProgress * 0.3;
    temperature = temperature + (targetTemp - temperature) * intakeProgress * 0.3;
  }

  if (phase === 'EXHAUST') {
    // Blow-down: pressure releases toward atmospheric
    const exhaustProgress = ((newAngle - 540) % 180) / 180;
    pressure = pressure + (P_ATM - pressure) * exhaustProgress * 0.4;
    temperature = temperature + ((T_AMBIENT + 200) - temperature) * exhaustProgress * 0.1;
  }

  // ── Full cycle reset at wrap-around (720 → 0)
  if (newAngle < prevAngle) {
    hasFired = false;
    pressure = P_ATM;
    temperature = T_AMBIENT + (wallTemp - T_AMBIENT) * 0.15;
    // Slow wall cooldown over many cycles
    wallTemp = Math.max(T_AMBIENT, wallTemp - 2);
  }

  // Clamp to physically plausible ranges
  pressure = Math.max(P_ATM * 0.3, Math.min(pressure, 12_000_000));
  temperature = Math.max(200, Math.min(temperature, 3500));
  wallTemp = Math.min(1200, wallTemp);

  return {
    crankAngle: newAngle,
    phase,
    pistonDisp: 0, // filled by caller from KinematicSolver
    volume: newVolume,
    pressure,
    temperature,
    hasFired,
    wallTemp,
  };
}

/**
 * Compute ideal Otto cycle thermal efficiency.
 * η = 1 - 1/CR^(γ-1)
 */
export function ottoCycleEfficiency(compressionRatio: number): number {
  return 1 - 1 / Math.pow(compressionRatio, GAMMA - 1);
}

/**
 * Build P-V diagram point for the current state (unit conversions for display).
 */
export function toPVPoint(state: CylinderState): PVPoint {
  return {
    volume: state.volume * 1e6,         // m³ → cm³
    pressure: state.pressure / 1e5,     // Pa → bar
  };
}

/**
 * Build P-θ diagram point.
 */
export function toPAPoint(state: CylinderState): PAPoint {
  return {
    angle: state.crankAngle,
    pressure: state.pressure / 1e5,     // Pa → bar
  };
}

/**
 * Compute instantaneous torque and power.
 */
export function computePowerOutput(
  state: CylinderState,
  config: EngineConfig,
  rpm: number
): { torque: number; power: number } {
  const torque = computeTorque(state.pressure, state.crankAngle, config);
  const omega = (rpm * 2 * Math.PI) / 60;
  return { torque, power: torque * omega };
}
