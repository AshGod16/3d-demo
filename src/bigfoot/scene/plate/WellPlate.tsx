// Well plate procedural geometry using InstancedMesh.
// Handles 96-well, 384-well, and 1536-well plates with per-instance color updates.
// Color interpolates clear → blue (simulating TMB colorimetric reaction).
// In advanced sort mode, unselected wells are dimmed to dark gray.

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSorterStore } from '../../store/sorterStore';
import { PLATE_GEOMETRY } from '../../physics/types';
import type { PlateType } from '../../physics/types';
import { wellLocalPosition } from '../../physics/PlateKinematics';

// TMB reaction colors (match real experiment from white paper)
const COLOR_EMPTY    = new THREE.Color(0.08, 0.10, 0.14);  // dark, clear TMB
const COLOR_FILL     = new THREE.Color(0.00, 0.25, 0.88);  // vivid blue, reacted TMB
const COLOR_INACTIVE = new THREE.Color(0.05, 0.05, 0.06);  // dimmed — not in selection

interface WellPlateProps {
  plateType: PlateType;
}

export function WellPlate({ plateType }: WellPlateProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorRef = useMemo(() => new THREE.Color(), []);
  const geo = PLATE_GEOMETRY[plateType];

  const wellGeometry = useMemo(() => {
    // Conical well (PCR plate style): wider at top, narrower at bottom
    // Fewer segments for denser plates to keep geometry count reasonable
    const segments = plateType === '96' ? 16 : plateType === '384' ? 10 : 6;
    return new THREE.CylinderGeometry(
      geo.wellRadius,
      geo.wellRadius * 0.55,
      geo.wellDepth,
      segments,
      1,
      false
    );
  }, [plateType, geo]);

  const plateBodyGeometry = useMemo(() => {
    return new THREE.BoxGeometry(geo.plateWidth, geo.plateHeight, geo.plateDepth);
  }, [plateType, geo]);

  // Set up initial well positions (static — wells don't move relative to stage)
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < geo.totalWells; i++) {
      const { localX, localZ } = wellLocalPosition(i, plateType);
      dummy.position.set(localX, geo.plateHeight * 0.5, localZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, COLOR_EMPTY);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [plateType, geo]);

  // Update well colors every frame from store
  useFrame(() => {
    if (!meshRef.current || !meshRef.current.instanceColor) return;

    const { runState, config } = useSorterStore.getState();
    const { wellFills } = runState;
    const selectedSet = (config.advancedSortMode && config.selectedWells)
      ? new Set(config.selectedWells)
      : null;

    for (let i = 0; i < geo.totalWells; i++) {
      if (selectedSet && !selectedSet.has(i)) {
        meshRef.current.setColorAt(i, COLOR_INACTIVE);
      } else {
        colorRef.copy(COLOR_EMPTY).lerp(COLOR_FILL, wellFills[i] ?? 0);
        meshRef.current.setColorAt(i, colorRef);
      }
    }

    meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Plate body (white/light gray plastic) */}
      <mesh geometry={plateBodyGeometry} receiveShadow position={[0, 0, 0]}>
        <meshStandardMaterial color="#dde0e8" metalness={0.05} roughness={0.8} />
      </mesh>

      {/* Well instances */}
      <instancedMesh
        ref={meshRef}
        args={[wellGeometry, undefined, geo.totalWells]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial metalness={0.1} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}
