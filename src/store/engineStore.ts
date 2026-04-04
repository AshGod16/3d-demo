// Zustand store — single source of truth for all simulation state.
// Works across the R3F Canvas boundary (R3F components inside Canvas
// and React components outside Canvas both read from here).

import { create } from 'zustand';
import type {
  EngineConfig,
  EngineState,
  FailureMode,
  PVPoint,
  PAPoint,
} from '../physics/types';
import { DEFAULT_CONFIG, DEFAULT_ENGINE_STATE } from '../physics/types';

export type ExplodedViewState = 'ASSEMBLED' | 'EXPLODING' | 'EXPLODED' | 'ASSEMBLING';

interface EngineStore {
  // ── Physics state (written by simulation loop, read by scene + UI)
  engineState: EngineState;

  // ── Engine configuration (written by UI controls, read by physics loop)
  engineConfig: EngineConfig;

  // ── Simulation control
  isRunning: boolean;

  // ── Exploded view
  explodedViewState: ExplodedViewState;
  explodedProgress: number;
  selectedPartId: string | null;

  // ── Forced failure mode (manual trigger from Failure Lab)
  forcedFailureMode: FailureMode | null;

  // ── Telemetry history
  pvHistory: PVPoint[];
  paHistory: PAPoint[];

  // ── Actions
  setRpm: (rpm: number) => void;
  setIgnitionAdvance: (deg: number) => void;
  setCompressionRatio: (cr: number) => void;
  setBore: (m: number) => void;
  setStroke: (m: number) => void;
  setRunning: (running: boolean) => void;
  setExplodedViewState: (s: ExplodedViewState) => void;
  setExplodedProgress: (p: number) => void;
  selectPart: (id: string | null) => void;
  triggerFailureMode: (mode: FailureMode) => void;
  clearFailureMode: () => void;
  updateEngineState: (patch: Partial<EngineState>) => void;
  resetTelemetry: () => void;
}

export const useEngineStore = create<EngineStore>()((set, get) => ({
  engineState: { ...DEFAULT_ENGINE_STATE },
  engineConfig: { ...DEFAULT_CONFIG },
  isRunning: true,
  explodedViewState: 'ASSEMBLED' as ExplodedViewState,
  explodedProgress: 0,
  selectedPartId: null,
  forcedFailureMode: null,
  pvHistory: [],
  paHistory: [],

  setRpm: (rpm) =>
    set((s) => ({
      engineState: { ...s.engineState, rpm: Math.max(500, Math.min(7500, rpm)) },
    })),

  setIgnitionAdvance: (deg) =>
    set((s) => ({
      engineConfig: { ...s.engineConfig, ignitionAdvance: Math.max(-10, Math.min(45, deg)) },
    })),

  setCompressionRatio: (cr) =>
    set((s) => ({
      engineConfig: { ...s.engineConfig, compressionRatio: Math.max(6, Math.min(14, cr)) },
    })),

  setBore: (m) =>
    set((s) => ({ engineConfig: { ...s.engineConfig, bore: m } })),

  setStroke: (m) =>
    set((s) => ({ engineConfig: { ...s.engineConfig, stroke: m } })),

  setRunning: (running) => set({ isRunning: running }),

  setExplodedViewState: (state) => {
    if (state === 'EXPLODING') {
      set({ explodedViewState: state, explodedProgress: 1 });
    } else if (state === 'ASSEMBLING') {
      set({ explodedViewState: state, explodedProgress: 0 });
    } else {
      set({ explodedViewState: state });
    }
  },

  setExplodedProgress: (p) => set({ explodedProgress: Math.max(0, Math.min(1, p)) }),

  selectPart: (id) => set({ selectedPartId: id }),

  triggerFailureMode: (mode) => set({ forcedFailureMode: mode }),

  clearFailureMode: () => {
    const current = get().engineState;
    set({
      forcedFailureMode: null,
      engineState: {
        ...current,
        failureMode: null,
        failureMessage: '',
        cylinder: {
          ...current.cylinder,
          wallTemp: 350,
        },
      },
    });
  },

  updateEngineState: (patch: Partial<EngineState>) =>
    set((s) => ({ engineState: { ...s.engineState, ...patch } })),

  resetTelemetry: () => set({ pvHistory: [], paHistory: [] }),
}));
