import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { useEngineStore } from '../../store/engineStore';
import { buildPistonGeometry } from '../geometry/pistonGeometry';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';

interface PistonProps {
  bore: number;
  stroke: number;
  pistonBaseY: number;  // world Y at TDC (top position)
}

export function Piston({ bore, stroke, pistonBaseY }: PistonProps) {
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);
  const kinematics = useEngineStore((s) => s.engineState.kinematics);

  const partId = 'piston';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;
  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const pistonHeight = stroke * 0.8;
  const pistonGeometry = useMemo(
    () => buildPistonGeometry(bore / 2 * 0.97, pistonHeight),
    [bore, pistonHeight]
  );

  // Physics-driven Y position (pistonY is normalized: 0=TDC, ~2=BDC, scaled by crankRadius)
  const crankRadius = stroke / 2;
  const physicsY = pistonBaseY - kinematics.pistonY * crankRadius;

  const { position, opacity } = useSpring({
    position: [
      offset.x * explodedProgress,
      physicsY + offset.y * explodedProgress,
      offset.z * explodedProgress,
    ] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 200, friction: 30 },
  });

  return (
    <animated.group position={position}>
      <mesh
        geometry={pistonGeometry}
        castShadow
        onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <animated.meshStandardMaterial
          color={isSelected ? '#ffaa33' : '#aaaacc'}
          metalness={0.85}
          roughness={0.15}
          transparent
          opacity={opacity as unknown as number}
        />
      </mesh>
    </animated.group>
  );
}
