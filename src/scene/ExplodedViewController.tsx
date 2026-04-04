import * as THREE from 'three';

// Per-part explosion offsets (world units).
// These define where each part animates to in the fully exploded state.
export const PART_EXPLODE_OFFSETS: Record<string, THREE.Vector3> = {
  'cylinder-head': new THREE.Vector3(0, 0.32, 0),
  'valve-intake': new THREE.Vector3(0.06, 0.40, 0),
  'valve-exhaust': new THREE.Vector3(-0.06, 0.40, 0),
  'piston': new THREE.Vector3(0, 0.20, 0),
  'connecting-rod': new THREE.Vector3(0.15, 0, 0),
  'crankshaft': new THREE.Vector3(0, -0.25, 0),
  'cylinder': new THREE.Vector3(-0.18, 0, 0),
};

// Layered disassembly order — each inner array is a layer that animates together
// with a staggered delay.
export const DISASSEMBLY_LAYERS: string[][] = [
  ['cylinder-head', 'valve-intake', 'valve-exhaust'],
  ['piston'],
  ['connecting-rod'],
  ['crankshaft', 'cylinder'],
];

// Delay in ms between each layer during explode/assemble animation
export const LAYER_STAGGER_MS = 250;

/**
 * Get the disassembly layer index for a given part ID.
 * Used to compute spring animation delay.
 */
export function getLayerIndex(partId: string): number {
  for (let i = 0; i < DISASSEMBLY_LAYERS.length; i++) {
    if (DISASSEMBLY_LAYERS[i].includes(partId)) return i;
  }
  return 0;
}
