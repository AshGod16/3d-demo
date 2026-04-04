// Sort decision engine and simulation step.
// Manages the sort state machine: IDLE → MOVING_TO_WELL → SORTING → WELL_DONE → PLATE_COMPLETE.
// Supports both STRAIGHT_DOWN and FOUR_WAY sort modes.
// Pure TypeScript — no browser APIs.

import type {
  SortRunState,
  SorterConfig,
  CellEvent,
  DropletParticle,
  SortPhase,
} from './types';
import { PLATE_GEOMETRY } from './types';
import {
  stepStagePosition,
  getStageTarget,
  getStageTargetFourWay,
  nextWellIndex,
  nextWellIndexFiltered,
  nextGroupStart,
} from './PlateKinematics';

const MAX_RECENT_EVENTS = 400;
const WELL_DONE_PAUSE = 0.04; // seconds between wells / groups

// Module-level accumulators (reset on each new sort).
let phaseTimer = 0;
let rateAccum = 0;
let rateTimer = 0;

export function resetSortAccumulators(): void {
  phaseTimer = 0;
  rateAccum = 0;
  rateTimer = 0;
}

/**
 * Step the sort simulation by dt seconds.
 * Returns next SortRunState, any new visual droplets, and whether a target cell was sorted.
 */
export function stepSort(
  state: SortRunState,
  config: SorterConfig,
  dt: number,
  cellPool: CellEvent[],
  cellPoolIndex: { current: number },
): { nextState: SortRunState; newDroplets: DropletParticle[]; sortEvent: boolean } {
  if (state.phase === 'IDLE' || state.phase === 'PLATE_COMPLETE') {
    return { nextState: state, newDroplets: [], sortEvent: false };
  }

  const scaledDt = dt * config.speedMultiplier;
  const geo = PLATE_GEOMETRY[config.plateType];
  const isFourWay = config.sortMode === 'FOUR_WAY';

  let next = { ...state };
  let sortEvent = false;
  const newDroplets: DropletParticle[] = [];

  rateTimer += scaledDt;
  phaseTimer += scaledDt;
  next.elapsed += scaledDt;

  // ── MOVING_TO_WELL ────────────────────────────────────────────────────────
  if (state.phase === 'MOVING_TO_WELL') {
    const { x, z, arrived } = stepStagePosition(
      state.stageX, state.stageZ,
      state.targetStageX, state.targetStageZ,
      scaledDt,
    );
    next.stageX = x;
    next.stageZ = z;

    if (arrived) {
      next.phase = 'SORTING';
      phaseTimer = 0;
    }
  }

  // ── SORTING ───────────────────────────────────────────────────────────────
  else if (state.phase === 'SORTING') {
    const eventInterval = 1 / config.targetSortRate;
    const eventsThisStep = Math.floor(phaseTimer / eventInterval);

    if (eventsThisStep > 0) {
      phaseTimer = phaseTimer % eventInterval;

      const newCounts = [...next.wellCounts];
      const newFills  = [...next.wellFills];
      let recentBuf   = next.recentEvents;

      if (isFourWay) {
        // ── 4-way: one event per stream (4 total) per step ──────────────────
        const groupBase = state.currentWellIndex;

        for (let e = 0; e < eventsThisStep; e++) {
          for (let stream = 0; stream < 4; stream++) {
            const wellIdx = groupBase + stream;
            if (wellIdx >= geo.totalWells) continue;
            if (newCounts[wellIdx] >= config.eventsPerWell) continue;

            const event = cellPool[cellPoolIndex.current % cellPool.length];
            cellPoolIndex.current++;
            next.totalEventsProcessed++;
            rateAccum++;

            // Rolling event buffer for scatter plot
            recentBuf = recentBuf.length < MAX_RECENT_EVENTS
              ? [...recentBuf, event]
              : [...recentBuf.slice(1), event];

            if (event.isTarget) {
              newCounts[wellIdx]++;
              next.totalCellsSorted++;
              sortEvent = true;
              newDroplets.push({ id: event.id, progress: 0, type: 'CELL_TARGET', alive: true });
            } else {
              newDroplets.push({ id: event.id, progress: 0, type: 'CELL_WASTE', alive: true });
            }
            newFills[wellIdx] = Math.min(1, newCounts[wellIdx] / config.eventsPerWell);
          }
        }

        // Transition when all 4 wells in group are full
        const groupFull = [0, 1, 2, 3].every(s => {
          const w = groupBase + s;
          return w >= geo.totalWells || newCounts[w] >= config.eventsPerWell;
        });
        if (groupFull) {
          next.phase = 'WELL_DONE';
          phaseTimer = 0;
        }
      } else {
        // ── Straight-down: one event at a time for the current well ─────────
        let deposited = newCounts[state.currentWellIndex];

        for (let i = 0; i < eventsThisStep && deposited < config.eventsPerWell; i++) {
          const event = cellPool[cellPoolIndex.current % cellPool.length];
          cellPoolIndex.current++;
          next.totalEventsProcessed++;
          rateAccum++;

          recentBuf = recentBuf.length < MAX_RECENT_EVENTS
            ? [...recentBuf, event]
            : [...recentBuf.slice(1), event];

          if (event.isTarget) {
            deposited++;
            next.totalCellsSorted++;
            sortEvent = true;
            newDroplets.push({ id: event.id, progress: 0, type: 'CELL_TARGET', alive: true });
          } else {
            newDroplets.push({ id: event.id, progress: 0, type: 'CELL_WASTE', alive: true });
          }
        }

        newCounts[state.currentWellIndex] = deposited;
        newFills[state.currentWellIndex] = Math.min(1, deposited / config.eventsPerWell);

        if (deposited >= config.eventsPerWell) {
          next.phase = 'WELL_DONE';
          phaseTimer = 0;
        }
      }

      next.wellCounts   = newCounts;
      next.wellFills    = newFills;
      next.recentEvents = recentBuf;
    }
  }

  // ── WELL_DONE ─────────────────────────────────────────────────────────────
  else if (state.phase === 'WELL_DONE') {
    if (phaseTimer >= WELL_DONE_PAUSE) {
      if (isFourWay) {
        const nextGroup = nextGroupStart(state.currentWellIndex, geo.totalWells);
        if (nextGroup === -1) {
          next.phase = 'PLATE_COMPLETE';
        } else {
          const target = getStageTargetFourWay(nextGroup, config.plateType);
          next.currentWellIndex = nextGroup;
          next.targetStageX = target.x;
          next.targetStageZ = target.z;
          next.phase = 'MOVING_TO_WELL';
          phaseTimer = 0;
        }
      } else {
        const nextWell = (config.advancedSortMode && config.selectedWells)
          ? nextWellIndexFiltered(state.currentWellIndex, config.selectedWells)
          : nextWellIndex(state.currentWellIndex, geo.totalWells);
        if (nextWell === -1) {
          next.phase = 'PLATE_COMPLETE';
        } else {
          const target = getStageTarget(nextWell, config.plateType);
          next.currentWellIndex = nextWell;
          next.targetStageX = target.x;
          next.targetStageZ = target.z;
          next.phase = 'MOVING_TO_WELL';
          phaseTimer = 0;
        }
      }
    }
  }

  // ── Rolling events/sec ────────────────────────────────────────────────────
  if (rateTimer >= 0.5) {
    next.eventsPerSec = Math.round(rateAccum / rateTimer);
    rateAccum = 0;
    rateTimer = 0;
  }

  return { nextState: next, newDroplets, sortEvent };
}

/**
 * Begin a new sort: position stage at the first well (or group) and transition to MOVING_TO_WELL.
 */
export function beginSort(state: SortRunState, config: SorterConfig): SortRunState {
  const firstWell = (config.advancedSortMode && config.selectedWells?.length)
    ? config.selectedWells[0]
    : 0;

  const target = config.sortMode === 'FOUR_WAY'
    ? getStageTargetFourWay(firstWell, config.plateType)
    : getStageTarget(firstWell, config.plateType);

  resetSortAccumulators();
  return {
    ...state,
    phase: 'MOVING_TO_WELL' as SortPhase,
    currentWellIndex: firstWell,
    targetStageX: target.x,
    targetStageZ: target.z,
    sortStartTime: performance.now(),
    elapsed: 0,
    totalEventsProcessed: 0,
    totalCellsSorted: 0,
    abortCount: 0,
    eventsPerSec: 0,
    recentEvents: [],
  };
}
