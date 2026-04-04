// Animated 4-way deflection stream arcs.
// Shows 4 parabolic arcs from the charge plate region to the well plate
// only when sort mode is FOUR_WAY and a sort is in progress.

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSorterStore } from '../../store/sorterStore';
import { BREAKOFF_Y, PLATE_SURFACE_Y } from './SortChamber';
import { PLATE_GEOMETRY } from '../../physics/types';
import type { PlateType } from '../../physics/types';
import { STREAM_OFFSET_MULTS } from '../../physics/DeflectionPhysics';

const STREAM_COLORS = [0xff3355, 0xff8800, 0x22aaff, 0x00ddff] as const;
const TUBE_RADIUS   = 0.0008;
const ARC_SEGMENTS  = 28;
const PARTICLES_PER_STREAM = 5;
const PARTICLE_RADIUS = 0.0018;
const PARTICLE_SPEED  = 0.38; // fraction of arc per second

function buildArcCurve(deflectionX: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    pts.push(new THREE.Vector3(
      deflectionX * t * t,
      BREAKOFF_Y + (PLATE_SURFACE_Y - BREAKOFF_Y) * t,
      0,
    ));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// Shared geometries (created once)
const particleGeo = new THREE.SphereGeometry(PARTICLE_RADIUS, 6, 4);

interface SingleStreamProps {
  deflectionX: number;
  color: number;
  streamIndex: number;
}

function SingleStream({ deflectionX, color, streamIndex }: SingleStreamProps) {
  const particleRef = useRef<THREE.InstancedMesh>(null!);
  const dummy        = useMemo(() => new THREE.Object3D(), []);

  const curve = useMemo(() => buildArcCurve(deflectionX), [deflectionX]);

  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, ARC_SEGMENTS, TUBE_RADIUS, 5, false),
    [curve],
  );

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < PARTICLES_PER_STREAM; i++) {
      // Stagger particles along the arc; add per-stream offset to desync streams
      const progress = (t * PARTICLE_SPEED + i / PARTICLES_PER_STREAM + streamIndex * 0.17) % 1;
      const pos = curve.getPoint(progress);
      dummy.position.copy(pos);
      dummy.updateMatrix();
      particleRef.current.setMatrixAt(i, dummy.matrix);
    }
    particleRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Arc tube */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Animated particles */}
      <instancedMesh ref={particleRef} args={[particleGeo, undefined, PARTICLES_PER_STREAM]}>
        <meshBasicMaterial color={color} />
      </instancedMesh>
    </group>
  );
}

export function SortStreams() {
  const sortMode  = useSorterStore((s) => s.config.sortMode);
  const phase     = useSorterStore((s) => s.runState.phase);
  const plateType = useSorterStore((s) => s.config.plateType) as PlateType;

  // Only show during an active 4-way sort
  const active = sortMode === 'FOUR_WAY'
    && phase !== 'IDLE'
    && phase !== 'PLATE_COMPLETE';

  if (!active) return null;

  const pitch      = PLATE_GEOMETRY[plateType].pitchX;
  const deflections = STREAM_OFFSET_MULTS.map(m => m * pitch);

  return (
    <group>
      {deflections.map((dx, i) => (
        <SingleStream
          key={i}
          deflectionX={dx}
          color={STREAM_COLORS[i]}
          streamIndex={i}
        />
      ))}
    </group>
  );
}
