import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useEngineStore } from '../../store/engineStore';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';

export function Cylinder({ bore, stroke }: { bore: number; stroke: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);

  const partId = 'cylinder';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;

  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const { position, opacity } = useSpring({
    position: [offset.x * explodedProgress, offset.y * explodedProgress, offset.z * explodedProgress] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 100, friction: 22 },
  });

  // Bore + flange geometry
  const cylinderH = stroke * 2.2;
  const boreGeometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(bore / 2 + 0.001, bore / 2 + 0.001, cylinderH, 32, 1, true);
    return g;
  }, [bore, cylinderH]);

  const flangeGeometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(bore / 2 * 1.35, bore / 2 * 1.35, cylinderH, 32, 1, false);
    return g;
  }, [bore, cylinderH]);

  const wallTemp = useEngineStore((s) => s.engineState.cylinder.wallTemp);
  // Map wall temperature to emissive color: 350K (cool) → 900K (hot orange)
  const heatIntensity = Math.max(0, Math.min(1, (wallTemp - 350) / 550));
  const emissiveColor = new THREE.Color(heatIntensity * 0.8, heatIntensity * 0.2, 0);

  return (
    <animated.group position={position}>
      {/* Outer cylinder wall (thin shell, slightly transparent) */}
      <mesh
        ref={meshRef}
        geometry={flangeGeometry}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <animated.meshStandardMaterial
          color={isSelected ? '#ffaa33' : '#555566'}
          metalness={0.7}
          roughness={0.3}
          emissive={emissiveColor}
          transparent
          opacity={opacity as unknown as number}
          side={THREE.DoubleSide}
        />
      </mesh>
    </animated.group>
  );
}
