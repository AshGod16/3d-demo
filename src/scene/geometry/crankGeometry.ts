import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Build a crankshaft geometry.
 * Consists of: main journal, two crank webs (counterweights), and crankpin journal.
 * The crank center is at origin; crankpin is offset by crankRadius in +X when at 0°.
 *
 * @param crankRadius  half the stroke length
 * @param journalR     main journal radius
 * @param crankWidth   total width of the crank assembly (Z axis)
 */
export function buildCrankshaftGeometry(
  crankRadius: number,
  journalR: number = crankRadius * 0.45,
  crankWidth: number = crankRadius * 1.4
): THREE.BufferGeometry {
  const pinR = journalR * 0.85;
  const webThick = crankWidth * 0.3;

  // Main journal — runs along Z axis
  const mainJournal = new THREE.CylinderGeometry(journalR, journalR, crankWidth, 20);
  mainJournal.rotateX(Math.PI / 2);

  // Crankpin journal — offset by crankRadius in +Y (will rotate with crank group)
  const crankpin = new THREE.CylinderGeometry(pinR, pinR, crankWidth * 0.6, 16);
  crankpin.rotateX(Math.PI / 2);
  crankpin.translate(0, crankRadius, 0);

  // Two crank webs connecting main journal to crankpin
  const webLeft = buildCrankWeb(crankRadius, journalR, webThick);
  webLeft.translate(0, 0, -crankWidth * 0.3);

  const webRight = buildCrankWeb(crankRadius, journalR, webThick);
  webRight.translate(0, 0, crankWidth * 0.3);

  const merged = mergeGeometries([mainJournal, crankpin, webLeft, webRight]);
  if (!merged) throw new Error('Failed to merge crankshaft geometries');
  merged.computeVertexNormals();
  return merged;
}

function buildCrankWeb(crankRadius: number, journalR: number, thickness: number): THREE.BufferGeometry {
  // Simplified web: a box bridging main journal to crankpin
  const webH = crankRadius * 1.2;
  const webW = journalR * 1.8;

  const web = new THREE.BoxGeometry(webW, webH, thickness);
  web.translate(0, crankRadius * 0.5, 0);

  // Counterweight: wider box on the opposite side
  const counterW = journalR * 2.4;
  const counterH = crankRadius * 0.7;
  const counter = new THREE.BoxGeometry(counterW, counterH, thickness * 0.8);
  counter.translate(0, -crankRadius * 0.35, 0);

  return mergeGeometries([web, counter]) ?? web;
}
