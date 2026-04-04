// Sort chamber 3D assembly: nozzle, droplet stream, laser beams, charge plates.
// This is the hero component of the Bigfoot 3D scene.

import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DropletStream } from './DropletStream';
import { LaserBeams } from './LaserBeams';

// World-space coordinate constants (1 unit = 200mm)
export const NOZZLE_Y      =  0.38;   // nozzle tip Y
export const LASER_Y       =  0.28;   // laser interrogation point
export const BREAKOFF_Y    =  0.20;   // droplet break-off zone
export const CHARGE_TOP_Y  =  0.14;   // top of charge plates
export const CHARGE_BOT_Y  =  0.04;   // bottom of charge plates
export const STAGE_Y       = -0.12;   // stage platform Y
export const PLATE_SURFACE_Y = -0.08; // plate top surface (wells sit on this)

export function SortChamber() {
  const nozzleGeometry = useMemo(() => buildNozzleGeometry(), []);
  const chamberGeometry = useMemo(() => buildChamberGeometry(), []);

  return (
    <group>
      {/* Chamber housing */}
      <mesh geometry={chamberGeometry} castShadow>
        <meshStandardMaterial color="#2a3a4a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Nozzle assembly */}
      <NozzleAssembly geometry={nozzleGeometry} />

      {/* Laser interrogation beams */}
      <LaserBeams interrogationY={LASER_Y} />

      {/* Charge plates flanking the stream */}
      <ChargePlates />

      {/* Droplet stream particles */}
      <DropletStream
        nozzleY={NOZZLE_Y - 0.02}
        plateY={PLATE_SURFACE_Y}
      />

      {/* Break-off zone indicator (subtle glow ring) */}
      <BreakoffIndicator y={BREAKOFF_Y} />
    </group>
  );
}

function NozzleAssembly({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Nozzle tip highlight — stainless steel look */}
      <mesh position={[0, NOZZLE_Y - 0.01, 0]}>
        <cylinderGeometry args={[0.006, 0.003, 0.015, 12]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.95} roughness={0.05} />
      </mesh>
    </group>
  );
}

function ChargePlates() {
  const plateH = CHARGE_TOP_Y - CHARGE_BOT_Y;
  const plateMidY = (CHARGE_TOP_Y + CHARGE_BOT_Y) / 2;
  const plateW = 0.012;
  const plateD = 0.04;
  const plateOffset = 0.022;

  return (
    <group>
      {/* Left charge plate */}
      <mesh position={[-plateOffset, plateMidY, 0]} castShadow>
        <boxGeometry args={[plateW, plateH, plateD]} />
        <meshStandardMaterial color="#667799" metalness={0.9} roughness={0.1} emissive="#001133" emissiveIntensity={0.3} />
      </mesh>
      {/* Right charge plate */}
      <mesh position={[plateOffset, plateMidY, 0]} castShadow>
        <boxGeometry args={[plateW, plateH, plateD]} />
        <meshStandardMaterial color="#667799" metalness={0.9} roughness={0.1} emissive="#001133" emissiveIntensity={0.3} />
      </mesh>
      {/* Voltage glow between plates */}
      <pointLight
        position={[0, plateMidY, 0]}
        color="#224488"
        intensity={0.4}
        distance={0.12}
        decay={2}
      />
    </group>
  );
}

function BreakoffIndicator({ y }: { y: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.008, 0.001, 6, 24]} />
      <meshBasicMaterial color="#3388aa" transparent opacity={0.4} />
    </mesh>
  );
}

function buildNozzleGeometry(): THREE.BufferGeometry {
  // Main body: vertical cylinder
  const body = new THREE.CylinderGeometry(0.024, 0.018, 0.12, 16);
  body.translate(0, NOZZLE_Y + 0.06, 0);

  // Flange at top
  const flange = new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16);
  flange.translate(0, NOZZLE_Y + 0.116, 0);

  // Taper toward tip
  const taper = new THREE.CylinderGeometry(0.018, 0.006, 0.04, 12);
  taper.translate(0, NOZZLE_Y + 0.02, 0);

  const merged = mergeGeometries([body, flange, taper]);
  if (!merged) return body;
  merged.computeVertexNormals();
  return merged;
}

function buildChamberGeometry(): THREE.BufferGeometry {
  // Simplified sort chamber enclosure — open front face for visibility
  const backWall = new THREE.BoxGeometry(0.14, 0.52, 0.006);
  backWall.translate(0, 0.14, -0.055);

  const leftWall = new THREE.BoxGeometry(0.006, 0.52, 0.11);
  leftWall.translate(-0.068, 0.14, 0);

  const rightWall = new THREE.BoxGeometry(0.006, 0.52, 0.11);
  rightWall.translate(0.068, 0.14, 0);

  const topCap = new THREE.BoxGeometry(0.14, 0.01, 0.11);
  topCap.translate(0, 0.40, 0);

  const merged = mergeGeometries([backWall, leftWall, rightWall, topCap]);
  if (!merged) return backWall;
  merged.computeVertexNormals();
  return merged;
}
