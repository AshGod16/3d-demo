// R3F Canvas wrapper + simulation heartbeat.
// The useFrame loop is the ONLY place stepOttoCycle is called.
// All physics state flows out through Zustand.

import { useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../store/engineStore';
import { EngineParts } from './EngineParts';
import { stepOttoCycle, toPVPoint, toPAPoint, computePowerOutput, ottoCycleEfficiency } from '../physics/OttoCycle';
import { solveKinematics } from '../physics/KinematicSolver';
import { detectFailure, applyFailureEffect, getFailureMessage } from '../physics/FailureModes';
import type { CylinderState } from '../physics/types';

// Ring buffer for telemetry (avoids pushing to React state every frame)
const PV_RING_SIZE = 800;
const pvRing: Array<{ volume: number; pressure: number }> = [];
const paRing: Array<{ angle: number; pressure: number }> = [];
let frameCount = 0;
let cycleCount = 0;
let prevCrankAngle = 0;

function SimulationLoop() {
  const cylinderStateRef = useRef<CylinderState>(
    useEngineStore.getState().engineState.cylinder
  );
  const elapsedRef = useRef(0);

  useFrame((_state, delta) => {
    const store = useEngineStore.getState();
    if (!store.isRunning) return;

    const { engineConfig: config, engineState, forcedFailureMode } = store;
    const rpm = engineState.rpm;

    // Clamp delta to avoid spiral of death on tab re-focus
    const dt = Math.min(delta, 0.04);
    elapsedRef.current += dt;

    // Degrees per second at this RPM
    // 4-stroke: one full cycle (720°) = 2 crankshaft revolutions = 120/RPM seconds
    const degPerSec = rpm * 6; // RPM * 360° / 60s
    const totalDeltaDeg = degPerSec * dt;

    // Sub-step for accuracy — max 2° per step
    const numSteps = Math.max(1, Math.ceil(totalDeltaDeg / 2));
    const stepSize = totalDeltaDeg / numSteps;

    let cyl = cylinderStateRef.current;

    for (let i = 0; i < numSteps; i++) {
      cyl = stepOttoCycle(cyl, config, stepSize);

      // Apply failure mode effects if active
      const failure = detectFailure(cyl, config, rpm, forcedFailureMode);
      if (failure) {
        const effects = applyFailureEffect(cyl, failure, elapsedRef.current);
        cyl = { ...cyl, ...effects };
      }
    }

    cylinderStateRef.current = cyl;

    // Track cycle completions (wrap-around of crankAngle)
    if (cyl.crankAngle < prevCrankAngle) {
      cycleCount++;
    }
    prevCrankAngle = cyl.crankAngle;

    // Solve kinematics from crank angle
    const kinematics = solveKinematics(cyl.crankAngle, config);

    // Detect failure mode
    const failureMode = detectFailure(cyl, config, rpm, forcedFailureMode);
    const failureMessage = failureMode ? getFailureMessage(failureMode) : '';

    // Compute power output
    const { torque, power } = computePowerOutput(cyl, config, rpm);
    const thermalEfficiency = ottoCycleEfficiency(config.compressionRatio);

    // Push to telemetry ring buffers (every frame)
    const pvPoint = toPVPoint(cyl);
    const paPoint = toPAPoint(cyl);
    pvRing.push(pvPoint);
    if (pvRing.length > PV_RING_SIZE) pvRing.shift();
    paRing.push(paPoint);
    if (paRing.length > 720) paRing.shift();

    // Throttled store update — every 4 frames (~15Hz for telemetry)
    frameCount++;
    if (frameCount % 4 === 0) {
      useEngineStore.setState((s) => ({
        engineState: {
          ...s.engineState,
          crankAngle: cyl.crankAngle,
          cylinder: { ...cyl, pistonDisp: kinematics.pistonY * config.stroke / 2 },
          kinematics,
          torque: Math.round(torque * 10) / 10,
          power: Math.round(power),
          thermalEfficiency,
          failureMode,
          failureMessage,
          cycleCount,
          pvHistory: [...pvRing],
          paHistory: [...paRing],
        },
      }));
    }
  });

  return null;
}

export function EngineScene() {
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Deselect part when clicking empty space
    if ((e.target as HTMLElement).tagName === 'CANVAS') {
      // Do nothing — let R3F handle it via mesh onClick + stopPropagation
    }
  }, []);

  return (
    <Canvas
      camera={{ position: [0.3, 0.15, 0.5], fov: 50, near: 0.001, far: 10 }}
      dpr={[1, 2]}
      frameloop="always"
      shadows
      onClick={handleCanvasClick}
      style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%)' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[1, 2, 1.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.3} color="#8899bb" />

      {/* Environment for metallic reflections */}
      <Environment preset="city" />

      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[2, 2]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      {/* Engine assembly */}
      <EngineParts />

      {/* Simulation heartbeat */}
      <SimulationLoop />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={0.15}
        maxDistance={1.2}
        target={[0, 0.05, 0]}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Dev performance stats (remove in production) */}
      <Stats className="stats-panel" />
    </Canvas>
  );
}
