// Laser beam visualization: 488nm (blue) and 349nm UV (violet).
// Uses Line geometry for the beams and a flash PointLight when a cell is detected.

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface LaserBeamsProps {
  interrogationY: number;  // world Y of the laser interrogation point
}

export function LaserBeams({ interrogationY }: LaserBeamsProps) {
  const flashLightRef = useRef<THREE.PointLight>(null!);
  const flashIntensityRef = useRef(0);
  const lastSortedRef = useRef(0);

  // Trigger a flash from outside via a global ref (set by simulation loop)
  useFrame(() => {
    // Decay flash
    flashIntensityRef.current = Math.max(0, flashIntensityRef.current - 0.25);
    if (flashLightRef.current) {
      flashLightRef.current.intensity = flashIntensityRef.current;
    }
  });

  // Expose flash trigger on window for simulation loop to call
  useEffect(() => {
    (window as Window & { __bigfootFlash?: () => void }).__bigfootFlash = () => {
      flashIntensityRef.current = 6;
    };
    return () => {
      delete (window as Window & { __bigfootFlash?: () => void }).__bigfootFlash;
    };
  }, []);

  const beamLength = 0.18;

  return (
    <group>
      {/* 488nm laser — blue, horizontal X axis */}
      <LaserLine
        start={[-beamLength, interrogationY, 0]}
        end={[beamLength, interrogationY, 0]}
        color="#3399ff"
        opacity={0.7}
      />

      {/* 349nm UV laser — violet, horizontal Z axis */}
      <LaserLine
        start={[0, interrogationY + 0.005, -beamLength]}
        end={[0, interrogationY + 0.005, beamLength]}
        color="#9933ff"
        opacity={0.5}
      />

      {/* Interrogation flash light */}
      <pointLight
        ref={flashLightRef}
        position={[0, interrogationY, 0]}
        color="#88ccff"
        intensity={0}
        distance={0.2}
        decay={2}
      />

      {/* Laser source indicator dots */}
      <mesh position={[-beamLength, interrogationY, 0]}>
        <sphereGeometry args={[0.004, 8, 8]} />
        <meshBasicMaterial color="#3399ff" />
      </mesh>
      <mesh position={[0, interrogationY + 0.005, -beamLength]}>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshBasicMaterial color="#9933ff" />
      </mesh>
    </group>
  );
}

interface LaserLineProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity: number;
}

function LaserLine({ start, end, color, opacity }: LaserLineProps) {
  const ref = useRef<THREE.LineSegments>(null!);

  useEffect(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]);
    ref.current.geometry = geometry;
  }, []);

  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}
