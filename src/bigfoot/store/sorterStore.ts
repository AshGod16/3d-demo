// Zustand store for the Bigfoot sorter simulation.
// Same architectural pattern as engineStore: bridges useFrame loop ↔ React UI.

import { create } from 'zustand';
import type { SorterConfig, SortRunState, CellEvent } from '../physics/types';
import { DEFAULT_SORTER_CONFIG, initialRunState, DEFAULT_GATE } from '../physics/types';
import { generateCellPool } from '../physics/FlowCytometryData';
import { beginSort } from '../physics/SortLogic';

// Pre-generate cell pool once at startup
const CELL_POOL = generateCellPool(4000, DEFAULT_GATE);

interface SorterStore {
  config: SorterConfig;
  runState: SortRunState;

  // Cell pool ref (shared between store and simulation loop)
  cellPool: typeof CELL_POOL;

  // Derived for UI (throttled from useFrame)
  gateEfficiency: number;

  // Actions
  startSort: () => void;
  resetSort: () => void;
  pauseSort: () => void;
  setConfig: (patch: Partial<SorterConfig>) => void;
  setSelectedWells: (wells: number[] | null) => void;

  // Called by simulation loop (not React)
  updateRunState: (s: SortRunState) => void;
}

export const useSorterStore = create<SorterStore>()((set, get) => ({
  config: { ...DEFAULT_SORTER_CONFIG },
  runState: initialRunState(DEFAULT_SORTER_CONFIG),
  cellPool: CELL_POOL,
  gateEfficiency: CELL_POOL.filter(e => e.isTarget).length / CELL_POOL.length,

  startSort: () => {
    const { config, runState } = get();
    const freshState = initialRunState(config);
    set({ runState: beginSort(freshState, config) });
  },

  resetSort: () => {
    const { config } = get();
    set({ runState: initialRunState(config) });
  },

  pauseSort: () => {
    const { runState } = get();
    if (runState.phase === 'IDLE') return;
    // Toggle: pause by setting IDLE, resume not supported in Phase 1
    set({ runState: { ...runState, phase: 'IDLE' } });
  },

  setConfig: (patch) => {
    set((s) => {
      let config = { ...s.config, ...patch };
      // 1536-well: force straight-down and disable advanced mode
      if (patch.plateType === '1536') {
        config = { ...config, sortMode: 'STRAIGHT_DOWN', advancedSortMode: false, selectedWells: null };
      }
      // Switching away from advanced mode: clear selection
      if (patch.advancedSortMode === false) {
        config = { ...config, selectedWells: null };
      }
      return { config, runState: initialRunState(config) };
    });
  },

  setSelectedWells: (wells) => {
    set((s) => {
      const sorted = wells ? [...wells].sort((a, b) => a - b) : null;
      const config = { ...s.config, selectedWells: sorted };
      return { config, runState: initialRunState(config) };
    });
  },

  updateRunState: (s) => set({ runState: s }),
}));
