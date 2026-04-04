// Simulated CHO cell population generator.
// Produces a realistic-looking FSC/SSC scatter dataset matching Figure 1 from the white paper.
// Pure TypeScript — no browser APIs.

import type { CellEvent, SortGate, CellPopulation } from './types';
import { DEFAULT_GATE } from './types';

let eventIdCounter = 0;

/** Box-Muller transform for Gaussian random numbers */
function gaussian(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Generate one cell event by sampling from the population mixture.
 * Population proportions match typical CHO culture (Figure 1):
 *   70% live singles, 20% debris, 10% doublets
 */
export function generateCellEvent(gate: SortGate = DEFAULT_GATE): CellEvent {
  const r = Math.random();
  let population: CellPopulation;
  let fscA: number, sscA: number, fscH: number, uv349: number;

  if (r < 0.70) {
    // Live single CHO cells — main population cluster
    population = 'LIVE_SINGLE';
    fscA  = clamp(gaussian(620, 90),  50, 1000);
    sscA  = clamp(gaussian(280, 70),  20, 700);
    fscH  = clamp(fscA * clamp(gaussian(0.93, 0.025), 0.7, 1.1), 50, 1000);
    uv349 = clamp(gaussian(650, 100), 50, 1000);
  } else if (r < 0.90) {
    // Cellular debris — low FSC, low SSC
    population = 'DEBRIS';
    fscA  = clamp(gaussian(160, 110), 10, 500);
    sscA  = clamp(gaussian(90,  70),  10, 400);
    fscH  = clamp(fscA * clamp(gaussian(0.90, 0.06), 0.6, 1.1), 10, 500);
    uv349 = clamp(gaussian(120, 100),  5, 400);
  } else {
    // Doublets — high FSC-A, low FSC-H/FSC-A ratio
    population = 'DOUBLET';
    fscA  = clamp(gaussian(890, 55),  600, 1000);
    sscA  = clamp(gaussian(450, 80),  200, 800);
    fscH  = clamp(fscA * clamp(gaussian(0.58, 0.06), 0.4, 0.78), 100, 1000);
    uv349 = clamp(gaussian(700, 120), 200, 1000);
  }

  const isTarget =
    fscA >= gate.fscMin &&
    fscA <= gate.fscMax &&
    sscA >= gate.sscMin &&
    sscA <= gate.sscMax &&
    uv349 >= gate.uvMin &&
    (fscH / fscA) >= gate.singletRatio;

  return {
    id: eventIdCounter++,
    fscA, fscH, sscA, uv349,
    population,
    isTarget,
  };
}

/**
 * Pre-generate a large pool of cell events.
 * The simulation draws from this pool sequentially, cycling when exhausted.
 */
export function generateCellPool(size: number = 3000, gate: SortGate = DEFAULT_GATE): CellEvent[] {
  return Array.from({ length: size }, () => generateCellEvent(gate));
}

/** Returns gate efficiency: fraction of events that are target cells */
export function computeGateEfficiency(pool: CellEvent[]): number {
  const targets = pool.filter(e => e.isTarget).length;
  return targets / pool.length;
}
