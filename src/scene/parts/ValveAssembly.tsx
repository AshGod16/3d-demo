import { useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEngineStore } from '../../store/engineStore';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';
import { getStrokePhase } from '../../physics/KinematicSolver';

interface ValveProps {
  type: 'intake' | 'exhaust';
  bore: number;
  headTopY: number;   // world Y of cylinder head top surface
  xOffset: number;    // lateral offset from bore center
}

export function Valve({ type, bore, headTopY, xOffset }: ValveProps) {
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);
  const crankAngle = useEngineStore((s) => s.engineState.crankAngle);

  const partId = type === 'intake' ? 'valve-intake' : 'valve-exhaust';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;
  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const stemR = bore * 0.025;
  const stemL = bore * 0.6;
  const headR = bore * 0.18;

  const valveGeometry = useMemo(() => {
    const stem = new THREE.CylinderGeometry(stemR, stemR, stemL, 8);
    stem.translate(0, stemL / 2, 0);

    const head = new THREE.ConeGeometry(headR, headR * 0.6, 16);
    head.rotateX(Math.PI);
    head.translate(0, -headR * 0.1, 0);

    const merged = mergeGeometries([stem, head]);
    if (!merged) return stem;
    merged.computeVertexNormals();
    return merged;
  }, [stemR, stemL, headR]);

  // Valve lift: sinusoidal based on stroke phase
  // Intake valve opens during intake stroke (0–180°)
  // Exhaust valve opens during exhaust stroke (540–720°)
  const phase = getStrokePhase(crankAngle);
  let liftFraction = 0;
  if (type === 'intake' && phase === 'INTAKE') {
    const t = (crankAngle % 180) / 180;
    liftFraction = Math.sin(t * Math.PI);
  } else if (type === 'exhaust' && phase === 'EXHAUST') {
    const t = ((crankAngle - 540) % 180) / 180;
    liftFraction = Math.sin(t * Math.PI);
  }
  const maxLift = bore * 0.08;
  const liftY = liftFraction * maxLift;

  const { position, opacity } = useSpring({
    position: [
      xOffset + offset.x * explodedProgress,
      headTopY + stemL * 0.3 + liftY + offset.y * explodedProgress,
      offset.z * explodedProgress,
    ] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 200, friction: 30 },
  });

  const color = type === 'intake'
    ? (isSelected ? '#ffaa33' : '#44aa66')
    : (isSelected ? '#ffaa33' : '#cc4444');

  return (
    <animated.group position={position}>
      <mesh
        geometry={valveGeometry}
        castShadow
        onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <animated.meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={opacity as unknown as number}
        />
      </mesh>
    </animated.group>
  );
}
