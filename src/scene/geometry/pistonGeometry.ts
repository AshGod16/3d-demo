import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Build a merged piston BufferGeometry.
 * Consists of: crown (top face), skirt (open cylinder), and three ring grooves.
 * All merged into a single draw call geometry.
 *
 * @param radius  Piston radius in world units (e.g. 0.043 for 86mm bore)
 * @param height  Total piston height in world units
 */
export function buildPistonGeometry(radius: number, height: number): THREE.BufferGeometry {
  const crownH = height * 0.25;
  const skirtH = height * 0.7;
  const skirtOffset = -crownH * 0.5 - skirtH * 0.5 + height * 0.05;

  // Crown — solid cylinder forming the combustion face
  const crown = new THREE.CylinderGeometry(radius, radius, crownH, 32);
  crown.translate(0, height * 0.35, 0);

  // Skirt — open cylinder (slightly narrower to show land)
  const skirt = new THREE.CylinderGeometry(
    radius * 0.995,
    radius * 0.995,
    skirtH,
    32,
    1,
    true  // openEnded
  );
  skirt.translate(0, skirtOffset, 0);

  // Bottom cap of skirt
  const bottomCap = new THREE.CircleGeometry(radius * 0.995, 32);
  bottomCap.rotateX(Math.PI / 2);
  bottomCap.translate(0, skirtOffset - skirtH * 0.5, 0);

  // Three compression/oil ring grooves (thin tori)
  const ringOffsets = [height * 0.22, height * 0.12, height * 0.02];
  const ringGeometries = ringOffsets.map((y) => {
    const ring = new THREE.TorusGeometry(radius + 0.001, 0.0015, 6, 32);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    return ring;
  });

  const merged = mergeGeometries([crown, skirt, bottomCap, ...ringGeometries]);
  if (!merged) throw new Error('Failed to merge piston geometries');
  merged.computeVertexNormals();
  return merged;
}
