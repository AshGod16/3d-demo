import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Build a connecting rod geometry.
 * Big end (crankpin) is at y = -rodLength/2, small end (wrist pin) at y = +rodLength/2.
 *
 * @param rodLength  center-to-center distance between big end and small end
 * @param bigEndR    big end bore radius
 * @param smallEndR  small end bore radius
 */
export function buildRodGeometry(
  rodLength: number,
  bigEndR: number = rodLength * 0.12,
  smallEndR: number = rodLength * 0.07
): THREE.BufferGeometry {
  const shankW = bigEndR * 0.35;
  const shankH = rodLength * 0.7;

  // Big end ring
  const bigEnd = new THREE.TorusGeometry(bigEndR, bigEndR * 0.4, 8, 24);
  bigEnd.rotateX(Math.PI / 2);
  bigEnd.translate(0, -rodLength * 0.5, 0);

  // Small end ring
  const smallEnd = new THREE.TorusGeometry(smallEndR, smallEndR * 0.5, 8, 20);
  smallEnd.rotateX(Math.PI / 2);
  smallEnd.translate(0, rodLength * 0.5, 0);

  // I-beam shank (two flanges + web)
  const shank = new THREE.BoxGeometry(shankW, shankH, bigEndR * 0.2);

  const merged = mergeGeometries([bigEnd, smallEnd, shank]);
  if (!merged) throw new Error('Failed to merge rod geometries');
  merged.computeVertexNormals();
  return merged;
}
