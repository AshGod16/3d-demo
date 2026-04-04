// All shared interfaces for the engine simulation.
// Nothing outside physics/ imports from physics files except through this file and the store.

export interface EngineConfig {
  bore: number;                 // meters, e.g. 0.086
  stroke: number;               // meters, e.g. 0.086
  compressionRatio: number;     // e.g. 10.5
  connectingRodLength: number;  // meters, e.g. 0.145
  fuelAirRatio: number;         // stoichiometric = 0.0664 for gasoline
  ignitionAdvance: number;      // degrees BTDC (before top dead center), e.g. 10
}

export type StrokePhase = 'INTAKE' | 'COMPRESSION' | 'POWER' | 'EXHAUST';

export type FailureMode = 'KNOCK' | 'DETONATION' | 'PRE_IGNITION' | 'OVERREV';

export interface KinematicResult {
  pistonY: number;       // normalized displacement from TDC (0 = TDC, 1 = BDC)
  rodAngle: number;      // radians, connecting rod angle from vertical
  crankpinX: number;     // crankpin X offset from crank center (normalized to stroke/2)
  crankpinY: number;     // crankpin Y offset from crank center (normalized to stroke/2)
}

export interface PVPoint {
  volume: number;    // cm³
  pressure: number;  // bar
}

export interface PAPoint {
  angle: number;     // crank degrees 0–720
  pressure: number;  // bar
}

export interface CylinderState {
  crankAngle: number;    // degrees 0–720 for 4-stroke
  phase: StrokePhase;
  pistonDisp: number;    // meters from TDC
  volume: number;        // m³
  pressure: number;      // Pa
  temperature: number;   // K
  hasFired: boolean;
  wallTemp: number;      // K, accumulated cylinder wall temperature
}

export interface EngineState {
  rpm: number;
  crankAngle: number;   // master crank angle, degrees
  cylinder: CylinderState;
  torque: number;       // N·m
  power: number;        // W
  thermalEfficiency: number;
  failureMode: FailureMode | null;
  failureMessage: string;
  cycleCount: number;
  pvHistory: PVPoint[];  // last full cycle
  paHistory: PAPoint[];  // pressure vs angle, rolling window
  kinematics: KinematicResult;
}

export const DEFAULT_CONFIG: EngineConfig = {
  bore: 0.086,
  stroke: 0.086,
  compressionRatio: 10.5,
  connectingRodLength: 0.145,
  fuelAirRatio: 0.0664,
  ignitionAdvance: 10,
};

export const DEFAULT_ENGINE_STATE: EngineState = {
  rpm: 2000,
  crankAngle: 0,
  cylinder: {
    crankAngle: 0,
    phase: 'INTAKE',
    pistonDisp: 0,
    volume: 0,
    pressure: 101325,
    temperature: 320,
    hasFired: false,
    wallTemp: 350,
  },
  torque: 0,
  power: 0,
  thermalEfficiency: 0,
  failureMode: null,
  failureMessage: '',
  cycleCount: 0,
  pvHistory: [],
  paHistory: [],
  kinematics: {
    pistonY: 0,
    rodAngle: 0,
    crankpinX: 0,
    crankpinY: -1,
  },
};
