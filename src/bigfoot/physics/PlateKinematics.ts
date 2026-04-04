// Plate stage kinematics for the Bigfoot Spectral Cell Sorter.
// Computes well positions and stage target coordinates.
// The nozzle is fixed at (0, nozzleY, 0) in world space.
// The stage moves in XZ plane so the target well (or group center) is under the nozzle.

import type { PlateType, WellPosition, SorterConfig } from './types';
import { PLATE_GEOMETRY } from './types';

// Paper benchmark sort times (1 event/well, real-time 1×).
const BENCHMARK_SECONDS: Record<string, Record<string, number>> = {
  '96':   { STRAIGHT_DOWN: 19.87, FOUR_WAY:   7.65 },
  '384':  { STRAIGHT_DOWN: 61.13, FOUR_WAY:  17.38 },
  '1536': { STRAIGHT_DOWN: 194.43, FOUR_WAY: 194.43 }, // paper: straight-down only
};

/**
 * Compute the world-space local position of a well within the plate.
 * Returns offset from plate center.
 */
export function wellLocalPosition(wellIndex: number, plateType: PlateType): WellPosition {
  const geo = PLATE_GEOMETRY[plateType];
  const row = Math.floor(wellIndex / geo.cols);
  const col = wellIndex % geo.cols;

  // Center of plate at (0,0); wells spread symmetrically
  const localX = (col - (geo.cols - 1) / 2) * geo.pitchX;
  const localZ = (row - (geo.rows - 1) / 2) * geo.pitchZ;

  return { row, col, localX, localZ };
}

/**
 * Compute stage target position so that wellIndex is under the nozzle at (0,*,0).
 * Stage target = negated well local position.
 */
export function getStageTarget(wellIndex: number, plateType: PlateType): { x: number; z: number } {
  const { localX, localZ } = wellLocalPosition(wellIndex, plateType);
  return { x: -localX, z: -localZ };
}

/**
 * Compute stage target for 4-way mode.
 * Centers the nozzle on the midpoint of the 4-well group starting at groupStart.
 * The 4 wells span cols c, c+1, c+2, c+3 — their X center is at col c+1.5.
 */
export function getStageTargetFourWay(
  groupStart: number,
  plateType: PlateType,
): { x: number; z: number } {
  const geo = PLATE_GEOMETRY[plateType];
  const row = Math.floor(groupStart / geo.cols);
  const col = groupStart % geo.cols;

  // Center between wells at col+1 and col+2 (midpoint of cols c..c+3)
  const centerLocalX = (col + 1.5 - (geo.cols - 1) / 2) * geo.pitchX;
  const localZ = (row - (geo.rows - 1) / 2) * geo.pitchZ;

  return { x: -centerLocalX, z: -localZ };
}

/**
 * Step the stage position toward its target using constant-speed linear movement.
 * Returns new { x, z } stage position.
 *
 * The Bigfoot traverses the full plate in ~0.5 seconds (from paper).
 * Plate width: 0.639 world units → STAGE_SPEED ≈ 1.3 world units/sec.
 */
export function stepStagePosition(
  currentX: number,
  currentZ: number,
  targetX: number,
  targetZ: number,
  dt: number,
): { x: number; z: number; arrived: boolean } {
  const STAGE_SPEED = 1.3; // world units/sec
  const ARRIVAL_THRESHOLD = 0.001;

  const dx = targetX - currentX;
  const dz = targetZ - currentZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < ARRIVAL_THRESHOLD) {
    return { x: targetX, z: targetZ, arrived: true };
  }

  const step = Math.min(dist, STAGE_SPEED * dt);
  const ratio = step / dist;

  return {
    x: currentX + dx * ratio,
    z: currentZ + dz * ratio,
    arrived: false,
  };
}

/**
 * Sequential well visit order for straight-down mode.
 * Row-by-row, left to right. Returns -1 when plate is complete.
 */
export function nextWellIndex(current: number, total: number): number {
  return current + 1 < total ? current + 1 : -1;
}

/**
 * Advanced sort mode: advance to the next well in the user-selected set.
 * `selected` must be sorted ascending. Returns -1 when all selected wells are done.
 */
export function nextWellIndexFiltered(
  current: number,
  selected: number[],
): number {
  const idx = selected.indexOf(current);
  return idx !== -1 && idx + 1 < selected.length ? selected[idx + 1] : -1;
}

/**
 * Advance to the next 4-well group in 4-way mode.
 * Returns the start index of the next group, or -1 when plate is complete.
 */
export function nextGroupStart(current: number, total: number): number {
  return current + 4 < total ? current + 4 : -1;
}

/**
 * Compute expected sort time (seconds) calibrated to paper benchmarks.
 * Scales linearly with eventsPerWell and inversely with speedMultiplier.
 */
export function estimatedSortTime(config: SorterConfig): number {
  const base = BENCHMARK_SECONDS[config.plateType]?.[config.sortMode] ?? 20;
  return (base * config.eventsPerWell) / config.speedMultiplier;
}
