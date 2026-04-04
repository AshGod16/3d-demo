// R3F Canvas + simulation heartbeat for the Bigfoot Spectral Cell Sorter.
// useFrame is the ONLY place the sort simulation is stepped.

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSorterStore } from '../store/sorterStore';
import { SortChamber } from './machine/SortChamber';
import { SortStreams } from './machine/SortStreams';
import { StageAssembly } from './plate/StageAssembly';
import { stepSort } from '../physics/SortLogic';

// Cell pool index ref — lives outside React to persist across frames
const cellPoolIndexRef = { current: 0 };

function SimulationLoop() {
  const frameCount = useRef(0);

  useFrame((_, delta) => {
    const store = useSorterStore.getState();
    const { runState, config, cellPool } = store;
    if (runState.phase === 'IDLE' || runState.phase === 'PLATE_COMPLETE') return;

    const dt = Math.min(delta, 0.05);
    frameCount.current++;

    const { nextState, newDroplets, sortEvent } = stepSort(
      runState,
      config,
      dt,
      cellPool,
      cellPoolIndexRef
    );

    // Trigger visual effects for cell events
    if (sortEvent) {
      (window as Window & { __bigfootFlash?: () => void }).__bigfootFlash?.();
    }

    // Inject cell-event droplets into the visual stream
    const injectDrop = (window as Window & {
      __bigfootInjectDrop?: (type: 'TARGET' | 'WASTE') => void
    }).__bigfootInjectDrop;

    if (injectDrop) {
      for (const d of newDroplets) {
        injectDrop(d.type === 'CELL_TARGET' ? 'TARGET' : 'WASTE');
      }
    }

    // Throttle full store update to ~20Hz for React telemetry components.
    // recentEvents is always flushed so the scatter plot stays populated every frame.
    if (frameCount.current % 3 === 0) {
      store.updateRunState(nextState);
    } else {
      useSorterStore.setState((s) => ({
        runState: {
          ...s.runState,
          stageX: nextState.stageX,
          stageZ: nextState.stageZ,
          wellFills: nextState.wellFills,
          wellCounts: nextState.wellCounts,
          totalCellsSorted: nextState.totalCellsSorted,
          totalEventsProcessed: nextState.totalEventsProcessed,
          recentEvents: nextState.recentEvents,
        },
      }));
    }
  });

  return null;
}

const PAN_SPEED = 0.4; // world units per second

function KeyboardPan({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keys.current.add(e.key);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || keys.current.size === 0) return;

    const speed = PAN_SPEED * delta;

    // Camera right vector (world space, projected to XZ)
    const right = new THREE.Vector3();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    right.normalize();

    // Camera forward vector (projected to XZ)
    const forward = new THREE.Vector3();
    forward.setFromMatrixColumn(camera.matrixWorld, 2);
    forward.y = 0;
    forward.normalize().negate();

    const delta3 = new THREE.Vector3();
    const k = keys.current;
    if (k.has('w') || k.has('ArrowUp'))    delta3.addScaledVector(forward, speed);
    if (k.has('s') || k.has('ArrowDown'))  delta3.addScaledVector(forward, -speed);
    if (k.has('a') || k.has('ArrowLeft'))  delta3.addScaledVector(right, -speed);
    if (k.has('d') || k.has('ArrowRight')) delta3.addScaledVector(right, speed);
    if (k.has('q')) delta3.y -= speed;
    if (k.has('e')) delta3.y += speed;

    camera.position.add(delta3);
    controls.target.add(delta3);
    controls.update();
  });

  return null;
}

export function BigfootScene() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas
      camera={{ position: [0.55, 0.45, 0.75], fov: 45, near: 0.001, far: 10 }}
      dpr={[1, 2]}
      frameloop="always"
      shadows
      style={{ background: 'linear-gradient(160deg, #050810 0%, #0d1525 100%)' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[0.5, 1.5, 1]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-0.5, 0.5, -0.5]} intensity={0.25} color="#8899bb" />

      {/* Environment for metallic reflections */}
      <Environment preset="studio" />

      {/* Floor grid */}
      <Grid
        position={[0, -0.22, 0]}
        args={[2, 2]}
        cellSize={0.045}
        cellThickness={0.3}
        cellColor="#1a2a3a"
        sectionSize={0.225}
        sectionThickness={0.8}
        sectionColor="#2a3a4a"
        fadeDistance={1.5}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Sort chamber (fixed — nozzle/lasers/charge plates) */}
      <SortChamber />

      {/* 4-way deflection stream arcs (only visible in FOUR_WAY mode) */}
      <SortStreams />

      {/* Stage + plate assembly (moves in XZ plane) */}
      <StageAssembly />

      {/* Simulation heartbeat */}
      <SimulationLoop />

      {/* Camera orbit controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan
        panSpeed={0.8}
        minDistance={0.3}
        maxDistance={2.0}
        target={[0, 0.1, 0]}
        enableDamping
        dampingFactor={0.07}
        maxPolarAngle={Math.PI * 0.75}
      />

      {/* Keyboard pan (WASD / arrow keys) */}
      <KeyboardPan controlsRef={controlsRef} />
    </Canvas>
  );
}
