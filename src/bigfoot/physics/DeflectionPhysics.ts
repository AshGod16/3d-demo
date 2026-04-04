// Deflection physics for 4-way electrostatic sorting.
// Computes parabolic arc trajectories for the 4 deflected streams.
// Pure TypeScript — no Three.js or browser dependencies.

import type { PlateType } from './types';
import { PLATE_GEOMETRY } from './types';

// Deflection multipliers relative to well pitch.
// M2=-1.5 pitch (far left), M1=-0.5, P1=+0.5, P2=+1.5 (far right).
export const STREAM_OFFSET_MULTS = [-1.5, -0.5, 0.5, 1.5] as const;

/**
 * Get world-space X deflection for a given stream index (0=M2 … 3=P2).
 */
export function getStreamDeflectionX(streamIndex: number, plateType: PlateType): number {
  return STREAM_OFFSET_MULTS[streamIndex] * PLATE_GEOMETRY[plateType].pitchX;
}

/**
 * Get all 4 stream deflections for the current plate type.
 */
export function getAllDeflections(plateType: PlateType): [number, number, number, number] {
  const pitch = PLATE_GEOMETRY[plateType].pitchX;
  return STREAM_OFFSET_MULTS.map(m => m * pitch) as [number, number, number, number];
}

/**
 * Compute parabolic arc points for a single stream.
 * Physics: electrostatic force is constant horizontally → x ∝ t²
 *          gravity dominates vertically → y is linear in t
 * Result: parabola opening left or right as drop falls.
 */
export function computeArcPoints(
  deflectionX: number,
  startY: number,
  endY: number,
  numPoints: number,
): Array<{ x: number; y: number; z: number }> {
  return Array.from({ length: numPoints }, (_, i) => {
    const t = i / (numPoints - 1);
    return {
      x: deflectionX * t * t,
      y: startY + (endY - startY) * t,
      z: 0,
    };
  });
}
