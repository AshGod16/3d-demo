import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { useEngineStore } from '../../store/engineStore';
import { buildCrankshaftGeometry } from '../geometry/crankGeometry';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';

interface CrankshaftProps {
  stroke: number;
  crankCenterY: number; // world Y of crank center
}

export function CrankshaftAssembly({ stroke, crankCenterY }: CrankshaftProps) {
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);
  const crankAngle = useEngineStore((s) => s.engineState.crankAngle);

  const partId = 'crankshaft';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;
  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const crankRadius = stroke / 2;
  const crankGeometry = useMemo(
    () => buildCrankshaftGeometry(crankRadius),
    [crankRadius]
  );

  const { position, opacity } = useSpring({
    position: [
      offset.x * explodedProgress,
      crankCenterY + offset.y * explodedProgress,
      offset.z * explodedProgress,
    ] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 100, friction: 22 },
  });

  // Mechanical crank rotation — 4-stroke angle (0–720) maps to mechanical (0–360 repeating)
  const mechAngleRad = ((crankAngle % 360) * Math.PI) / 180;

  return (
    <animated.group position={position}>
      {/* Rotation is applied on a child group so spring position is independent */}
      <group rotation={[0, 0, mechAngleRad]}>
        <mesh
          geometry={crankGeometry}
          castShadow
          onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <animated.meshStandardMaterial
            color={isSelected ? '#ffaa33' : '#445566'}
            metalness={0.9}
            roughness={0.2}
            transparent
            opacity={opacity as unknown as number}
          />
        </mesh>
      </group>
    </animated.group>
  );
}
