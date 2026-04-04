import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { useEngineStore } from '../../store/engineStore';
import { buildRodGeometry } from '../geometry/rodGeometry';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';

interface ConnectingRodProps {
  rodLength: number;
  stroke: number;
  crankCenterY: number; // world Y of crank center
}

export function ConnectingRod({ rodLength, stroke, crankCenterY }: ConnectingRodProps) {
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);
  const kinematics = useEngineStore((s) => s.engineState.kinematics);

  const partId = 'connecting-rod';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;
  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const rodGeometry = useMemo(
    () => buildRodGeometry(rodLength),
    [rodLength]
  );

  const crankRadius = stroke / 2;

  // Big end position = crankpin world position
  const bigEndX = kinematics.crankpinX * crankRadius;
  const bigEndY = crankCenterY + kinematics.crankpinY * crankRadius;

  // Small end position = bottom of piston pin
  const smallEndX = 0;
  const smallEndY = bigEndY + rodLength; // approximate

  // Rod center = midpoint
  const rodCenterX = (bigEndX + smallEndX) / 2;
  const rodCenterY = (bigEndY + smallEndY) / 2;

  const { position, opacity } = useSpring({
    position: [
      rodCenterX + offset.x * explodedProgress,
      rodCenterY + offset.y * explodedProgress,
      offset.z * explodedProgress,
    ] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 200, friction: 30 },
  });

  return (
    <animated.group
      position={position}
      rotation={[0, 0, kinematics.rodAngle]}
    >
      <mesh
        geometry={rodGeometry}
        castShadow
        onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <animated.meshStandardMaterial
          color={isSelected ? '#ffaa33' : '#886644'}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={opacity as unknown as number}
        />
      </mesh>
    </animated.group>
  );
}
