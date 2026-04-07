// All types for the Bigfoot Spectral Cell Sorter simulation.
// Pure TypeScript — no React, Three.js, or browser APIs.

// ── Configuration ────────────────────────────────────────────────────────────

export type PlateType = '96' | '384' | '1536';
export type SortMode = 'STRAIGHT_DOWN' | 'FOUR_WAY';

export interface SorterConfig {
  plateType: PlateType;
  sortMode: SortMode;
  eventsPerWell: number;       // cells to deposit per well (1 = single-cell sort)
  targetSortRate: number;      // events/sec the instrument achieves (150 from paper)
  dropSpacing: number;         // abort threshold for adjacent drops (32 = default)
  speedMultiplier: number;     // simulation speed (1 = real time, 5 = 5× faster)
  advancedSortMode: boolean;   // when true, only sort into selectedWells
  selectedWells: number[] | null; // null = all wells; sorted ascending array = sparse
}

export const DEFAULT_SORTER_CONFIG: SorterConfig = {
  plateType: '96',
  sortMode: 'STRAIGHT_DOWN',
  eventsPerWell: 1,
  targetSortRate: 150,
  dropSpacing: 32,
  speedMultiplier: 1,
  advancedSortMode: false,
  selectedWells: null,
};

// ── Cell events and population ───────────────────────────────────────────────

export type CellPopulation = 'LIVE_SINGLE' | 'DEBRIS' | 'DOUBLET';

export interface CellEvent {
  id: number;
  fscA: number;      // Forward Scatter Area — correlates with cell size (0–1000 AU)
  fscH: number;      // Forward Scatter Height — for doublet discrimination
  sscA: number;      // Side Scatter Area — correlates with granularity (0–1000 AU)
  uv349: number;     // 349nm channel — Hoechst 33342 viability stain (0–1000 AU)
  ch488_530: number; // 488nm laser / 530nm band — FITC / GFP channel (0–1000 AU)
  ch561_590: number; // 561nm laser / 590nm band — PE channel (0–1000 AU)
  ch638_660: number; // 638nm laser / 660nm band — APC channel (0–1000 AU)
  population: CellPopulation;
  isTarget: boolean; // passes all gates
}

// Sort gate thresholds (simplified rectangle gate matching Figure 1)
export interface SortGate {
  fscMin: number;
  fscMax: number;
  sscMin: number;
  sscMax: number;
  uvMin: number;      // live cell threshold
  singletRatio: number; // fscH/fscA must be > this to exclude doublets
}

export const DEFAULT_GATE: SortGate = {
  fscMin: 350,
  fscMax: 880,
  sscMin: 100,
  sscMax: 600,
  uvMin: 300,
  singletRatio: 0.82,
};

// ── Plate geometry ────────────────────────────────────────────────────────────

export interface WellPosition {
  row: number;       // 0 = row A, 7 = row H
  col: number;       // 0 = column 1, 11 = column 12
  localX: number;    // world units from plate center
  localZ: number;    // world units from plate center
}

export interface PlateGeometry {
  rows: number;
  cols: number;
  totalWells: number;
  pitchX: number;    // world units between well centers (X axis)
  pitchZ: number;    // world units between well centers (Z axis)
  wellRadius: number;
  wellDepth: number;
  plateWidth: number;
  plateDepth: number;
  plateHeight: number;
}

// Scale: 1 world unit = 200mm
// 96-well: 127.76 × 85.48mm → 0.639 × 0.427 world units
// Well pitch: 9mm → 0.045 world units
export const PLATE_GEOMETRY: Record<PlateType, PlateGeometry> = {
  '96': {
    rows: 8, cols: 12, totalWells: 96,
    pitchX: 0.045, pitchZ: 0.045,
    wellRadius: 0.016, wellDepth: 0.022,
    plateWidth: 0.639, plateDepth: 0.427, plateHeight: 0.016,
  },
  '384': {
    rows: 16, cols: 24, totalWells: 384,
    pitchX: 0.0225, pitchZ: 0.0225,
    wellRadius: 0.008, wellDepth: 0.018,
    plateWidth: 0.639, plateDepth: 0.427, plateHeight: 0.014,
  },
  '1536': {
    rows: 32, cols: 48, totalWells: 1536,
    pitchX: 0.01125, pitchZ: 0.01125,
    wellRadius: 0.00425, wellDepth: 0.016,
    plateWidth: 0.639, plateDepth: 0.427, plateHeight: 0.012,
  },
};

// ── Sort state machine ────────────────────────────────────────────────────────

export type SortPhase =
  | 'IDLE'
  | 'MOVING_TO_WELL'
  | 'SORTING'
  | 'WELL_DONE'
  | 'PLATE_COMPLETE';

export interface SortRunState {
  phase: SortPhase;
  currentWellIndex: number;    // 0-based, sequential
  wellCounts: number[];        // cells deposited per well
  wellFills: number[];         // 0-1 visual fill fraction per well
  stageX: number;              // current stage X world position
  stageZ: number;              // current stage Z world position
  targetStageX: number;
  targetStageZ: number;
  sortStartTime: number;       // performance.now() at sort start
  elapsed: number;             // seconds since sort started
  totalEventsProcessed: number;
  totalCellsSorted: number;
  abortCount: number;
  eventsPerSec: number;
  recentEvents: CellEvent[];   // rolling window for scatter plot
  // InfiniSort cumulative tracking (across sequential plates)
  infinisortPlateCount: number; // plates completed before this one (0 = first plate)
  infinisortTotalCells: number; // cells sorted across all previous plates
}

export function initialRunState(config: SorterConfig): SortRunState {
  const geo = PLATE_GEOMETRY[config.plateType];
  return {
    phase: 'IDLE',
    currentWellIndex: 0,
    wellCounts: new Array(geo.totalWells).fill(0),
    wellFills: new Array(geo.totalWells).fill(0),
    stageX: 0,
    stageZ: 0,
    targetStageX: 0,
    targetStageZ: 0,
    sortStartTime: 0,
    elapsed: 0,
    totalEventsProcessed: 0,
    totalCellsSorted: 0,
    abortCount: 0,
    eventsPerSec: 0,
    recentEvents: [],
    infinisortPlateCount: 0,
    infinisortTotalCells: 0,
  };
}

// ── Droplet particles (for 3D visualization only) ────────────────────────────

export type DropletType = 'SHEATH' | 'CELL_TARGET' | 'CELL_WASTE';

export interface DropletParticle {
  id: number;
  progress: number;    // 0 = nozzle, 1 = plate/waste
  type: DropletType;
  alive: boolean;
}
