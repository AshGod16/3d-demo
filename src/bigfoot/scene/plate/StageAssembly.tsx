// XY plate stage assembly.
// The stage group moves in the XZ plane, driven by PlateKinematics.
// Its position is updated directly in useFrame (not through React state).

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSorterStore } from '../../store/sorterStore';
import { WellPlate } from './WellPlate';
import { STAGE_Y } from '../machine/SortChamber';

export function StageAssembly() {
  const stageGroupRef = useRef<THREE.Group>(null!);
  const config = useSorterStore((s) => s.config);

  // Update stage position directly in useFrame — no React state involved
  useFrame(() => {
    if (!stageGroupRef.current) return;
    const { stageX, stageZ } = useSorterStore.getState().runState;
    stageGroupRef.current.position.x = stageX;
    stageGroupRef.current.position.z = stageZ;
  });

  return (
    <group>
      {/* Stage platform */}
      <StagePlatform />

      {/* Moving stage group — plate + carriers move together */}
      <group ref={stageGroupRef} position={[0, STAGE_Y, 0]}>
        <WellPlate plateType={config.plateType} />
        {/* Well plate sits on top of stage platform */}
      </group>
    </group>
  );
}

function StagePlatform() {
  return (
    <group>
      {/* X-axis rail (left) */}
      <mesh position={[-0.38, STAGE_Y - 0.02, 0]} castShadow>
        <boxGeometry args={[0.012, 0.008, 0.5]} />
        <meshStandardMaterial color="#334455" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* X-axis rail (right) */}
      <mesh position={[0.38, STAGE_Y - 0.02, 0]} castShadow>
        <boxGeometry args={[0.012, 0.008, 0.5]} />
        <meshStandardMaterial color="#334455" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Z-axis carrier beam */}
      <mesh position={[0, STAGE_Y - 0.015, 0]} castShadow>
        <boxGeometry args={[0.78, 0.005, 0.012]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Lead screw indicator (thin rod along X) */}
      <mesh position={[0, STAGE_Y - 0.025, -0.22]} castShadow>
        <cylinderGeometry args={[0.003, 0.003, 0.78, 8]} />
        <meshStandardMaterial color="#667788" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, STAGE_Y - 0.025, 0.22]}>
        <cylinderGeometry args={[0.003, 0.003, 0.78, 8]} />
        <meshStandardMaterial color="#667788" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}
