// Pure geometry solver for the crank-slider mechanism.
// No React, Three.js, or browser API imports.
// All positions are returned as normalized values (divided by stroke/2)
// so the caller can scale to world units.

import type { EngineConfig, KinematicResult, StrokePhase } from './types';

/**
 * Computes piston displacement from TDC using the exact crank-slider equation.
 * @param crankAngleDeg  0 = TDC, 180 = BDC for compression stroke
 * @param crankRadius    r = stroke / 2
 * @param rodLength      l = connecting rod length
 * @returns displacement in meters (0 at TDC, ~stroke at BDC)
 */
export function solvePistonDisplacement(
  crankAngleDeg: number,
  crankRadius: number,
  rodLength: number
): number {
  const theta = (crankAngleDeg * Math.PI) / 180;
  const r = crankRadius;
  const l = rodLength;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  // x = r·cos(θ) + √(l² - r²·sin²(θ))
  const x = r * cosTheta + Math.sqrt(l * l - r * r * sinTheta * sinTheta);
  // displacement from TDC = (r + l) - x
  return (r + l) - x;
}

/**
 * Computes the connecting rod angle from vertical.
 * φ = arcsin((r/l)·sin(θ))
 */
export function solveRodAngle(
  crankAngleDeg: number,
  crankRadius: number,
  rodLength: number
): number {
  const theta = (crankAngleDeg * Math.PI) / 180;
  const sinVal = Math.min(1, Math.max(-1, (crankRadius / rodLength) * Math.sin(theta)));
  return Math.asin(sinVal);
}

/**
 * Full kinematic solve: returns all derived positions for one frame.
 * crankAngleDeg is the 4-stroke cycle angle (0–720), mapped to mechanical angle (0–360) for kinematics.
 */
export function solveKinematics(crankAngleDeg: number, config: EngineConfig): KinematicResult {
  // Mechanical crank angle (0–360 repeating regardless of stroke)
  const mechAngle = crankAngleDeg % 360;
  const theta = (mechAngle * Math.PI) / 180;
  const r = config.stroke / 2;
  const l = config.connectingRodLength;

  const pistonDisp = solvePistonDisplacement(mechAngle, r, l);
  const rodAngle = solveRodAngle(mechAngle, r, l);

  // Crankpin world position (relative to crank center)
  // At mechAngle=0: TDC, crankpin is straight up
  const crankpinX = r * Math.sin(theta);   // horizontal offset
  const crankpinY = r * Math.cos(theta);   // vertical: positive = up (toward piston)

  return {
    pistonY: pistonDisp / r,  // normalized to crankRadius (0=TDC, ~2=BDC)
    rodAngle,
    crankpinX: crankpinX / r, // normalized
    crankpinY: crankpinY / r, // normalized
  };
}

/**
 * Compute cylinder volume at a given crank angle.
 */
export function cylinderVolume(crankAngleDeg: number, config: EngineConfig): number {
  const mechAngle = crankAngleDeg % 360;
  const r = config.stroke / 2;
  const l = config.connectingRodLength;
  const pistonDisp = solvePistonDisplacement(mechAngle, r, l);

  const Vd = (Math.PI * config.bore ** 2 * config.stroke) / 4; // displacement volume
  const Vc = Vd / (config.compressionRatio - 1);               // clearance volume
  const A = (Math.PI * config.bore ** 2) / 4;                  // bore area

  return Vc + A * pistonDisp;
}

/**
 * Determine the stroke phase from the 4-stroke cycle angle (0–720).
 * 0–180:   Intake     (piston down, intake valve open)
 * 180–360: Compression (piston up, all valves closed)
 * 360–540: Power      (piston down, combustion drives it)
 * 540–720: Exhaust    (piston up, exhaust valve open)
 */
export function getStrokePhase(crankAngle: number): StrokePhase {
  const a = ((crankAngle % 720) + 720) % 720;
  if (a < 180) return 'INTAKE';
  if (a < 360) return 'COMPRESSION';
  if (a < 540) return 'POWER';
  return 'EXHAUST';
}

/**
 * Compute instantaneous torque from gas pressure force.
 * T = F_piston · r · sin(θ + φ) / cos(φ)
 */
export function computeTorque(
  pressure: number,
  crankAngleDeg: number,
  config: EngineConfig
): number {
  const mechAngle = crankAngleDeg % 360;
  const theta = (mechAngle * Math.PI) / 180;
  const r = config.stroke / 2;
  const A = (Math.PI * config.bore ** 2) / 4;
  const phi = solveRodAngle(mechAngle, r, config.connectingRodLength);
  const F_net = (pressure - 101325) * A;
  const cosPhi = Math.cos(phi);
  if (Math.abs(cosPhi) < 1e-10) return 0;
  return F_net * r * Math.sin(theta + phi) / cosPhi;
}
