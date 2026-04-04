import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useEngineStore } from '../../store/engineStore';

interface CombustionFlashProps {
  position: [number, number, number];
}

export function CombustionFlash({ position }: CombustionFlashProps) {
  const lightRef = useRef<THREE.PointLight>(null!);
  const intensityRef = useRef(0);
  const prevFired = useRef(false);

  useFrame(() => {
    const cylinder = useEngineStore.getState().engineState.cylinder;

    // Trigger flash when combustion event fires
    if (cylinder.hasFired && !prevFired.current) {
      intensityRef.current = 12;
    }
    prevFired.current = cylinder.hasFired;

    // Decay flash intensity
    intensityRef.current = Math.max(0, intensityRef.current - 0.8);

    if (lightRef.current) {
      lightRef.current.intensity = intensityRef.current;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color="#ff8833"
      intensity={0}
      distance={0.3}
      decay={2}
    />
  );
}
