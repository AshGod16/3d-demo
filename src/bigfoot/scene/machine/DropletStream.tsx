// Animated droplet stream particle system.
// Uses InstancedMesh with a circular buffer for high-performance rendering.
// The visual stream is independent of the sort simulation — it always shows
// a continuous flow. Special "cell event" particles are spawned by the sim loop.

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DropletStreamProps {
  nozzleY: number;     // Y position of the nozzle tip
  plateY: number;      // Y position of the plate surface
  numDroplets?: number;
}

const TRAVEL_TIME = 0.28;     // seconds for a droplet to travel nozzle → plate
const SPAWN_INTERVAL = 0.018; // seconds between new background droplets (~55/sec)

interface StreamParticle {
  progress: number; // 0=nozzle, 1=plate
  type: 'SHEATH' | 'TARGET' | 'WASTE';
}

export function DropletStream({ nozzleY, plateY, numDroplets = 50 }: DropletStreamProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const particles = useRef<StreamParticle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spawnTimer = useRef(0);
  const colorRef = useRef(new THREE.Color());

  // Define geometry and material — reused across instances
  const geometry = useMemo(() => new THREE.SphereGeometry(0.004, 6, 6), []);

  // Initialize instance colors to sheath color
  useEffect(() => {
    if (!meshRef.current) return;
    const sheath = new THREE.Color('#1a4a6a');
    for (let i = 0; i < numDroplets; i++) {
      meshRef.current.setColorAt(i, sheath);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    // Hide all instances initially
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < numDroplets; i++) {
      meshRef.current.setMatrixAt(i, hidden);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [numDroplets]);

  // Expose a trigger for the simulation loop to inject cell-event particles
  useEffect(() => {
    (window as Window & {
      __bigfootInjectDrop?: (type: 'TARGET' | 'WASTE') => void
    }).__bigfootInjectDrop = (type) => {
      // Find a free slot or recycle the oldest
      const slot = particles.current.find(p => p.progress >= 1);
      if (slot) {
        slot.progress = 0;
        slot.type = type;
      } else if (particles.current.length < numDroplets) {
        particles.current.push({ progress: 0, type });
      }
    };
    return () => {
      delete (window as Window & { __bigfootInjectDrop?: () => void }).__bigfootInjectDrop;
    };
  }, [numDroplets]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.04);

    // Advance existing particles
    for (const p of particles.current) {
      p.progress += dt / TRAVEL_TIME;
    }

    // Remove dead particles
    const alive = particles.current.filter(p => p.progress < 1.05);
    particles.current = alive;

    // Spawn new background sheath droplets
    spawnTimer.current += dt;
    if (spawnTimer.current >= SPAWN_INTERVAL && particles.current.length < numDroplets) {
      particles.current.push({ progress: 0, type: 'SHEATH' });
      spawnTimer.current = 0;
    }

    // Update instanced mesh
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    const range = plateY - nozzleY; // negative (plate is below nozzle)

    for (let i = 0; i < numDroplets; i++) {
      const p = particles.current[i];
      if (!p || p.progress > 1) {
        meshRef.current.setMatrixAt(i, hidden);
        continue;
      }

      const y = nozzleY + range * p.progress;
      // Tiny random scatter to simulate jet wobble
      const jitter = (Math.sin(p.progress * 47.3 + i) * 0.001);
      dummy.position.set(jitter, y, jitter * 0.5);
      dummy.scale.setScalar(p.type === 'SHEATH' ? 0.85 : 1.3);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Color by type
      if (p.type === 'TARGET') {
        colorRef.current.set('#00e5ff');
      } else if (p.type === 'WASTE') {
        colorRef.current.set('#ff4422');
      } else {
        // Sheath: translucent mid-blue — visible as fluid, not a dark blob
        colorRef.current.setRGB(0.25, 0.55, 1.0);
      }
      meshRef.current.setColorAt(i, colorRef.current);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, numDroplets]}>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.55}
        depthWrite={false}
        metalness={0}
        roughness={0.1}
      />
    </instancedMesh>
  );
}
