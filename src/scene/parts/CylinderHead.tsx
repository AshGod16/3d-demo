import { useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEngineStore } from '../../store/engineStore';
import { PART_EXPLODE_OFFSETS, getLayerIndex, LAYER_STAGGER_MS } from '../ExplodedViewController';

interface CylinderHeadProps {
  bore: number;
  stroke: number;
  topY: number;  // world Y of the top of the bore
}

export function CylinderHead({ bore, stroke, topY }: CylinderHeadProps) {
  const explodedProgress = useEngineStore((s) => s.explodedProgress);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const explodedViewState = useEngineStore((s) => s.explodedViewState);
  const selectPart = useEngineStore((s) => s.selectPart);

  const partId = 'cylinder-head';
  const isSelected = selectedPartId === partId;
  const hasSelection = selectedPartId !== null;
  const offset = PART_EXPLODE_OFFSETS[partId];
  const layerDelay = getLayerIndex(partId) * LAYER_STAGGER_MS;
  const isExploding = explodedViewState === 'EXPLODING' || explodedViewState === 'ASSEMBLING';

  const headH = bore * 0.4;
  const headGeometry = useMemo(() => {
    // Main head block
    const head = new THREE.CylinderGeometry(bore / 2 * 1.35, bore / 2 * 1.35, headH, 32);

    // Two spark plug port bumps on top
    const plug1 = new THREE.CylinderGeometry(bore * 0.05, bore * 0.05, bore * 0.12, 8);
    plug1.translate(bore * 0.1, headH * 0.5 + bore * 0.04, 0);

    const plug2 = new THREE.CylinderGeometry(bore * 0.05, bore * 0.05, bore * 0.12, 8);
    plug2.translate(-bore * 0.1, headH * 0.5 + bore * 0.04, 0);

    const merged = mergeGeometries([head, plug1, plug2]);
    if (!merged) return head;
    merged.computeVertexNormals();
    return merged;
  }, [bore, headH]);

  const { position, opacity } = useSpring({
    position: [
      offset.x * explodedProgress,
      topY + headH / 2 + offset.y * explodedProgress,
      offset.z * explodedProgress,
    ] as [number, number, number],
    opacity: hasSelection && !isSelected ? 0.15 : 1.0,
    delay: isExploding ? layerDelay : 0,
    config: { tension: 100, friction: 22 },
  });

  return (
    <animated.group position={position}>
      <mesh
        geometry={headGeometry}
        castShadow
        onClick={(e) => { e.stopPropagation(); selectPart(isSelected ? null : partId); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <animated.meshStandardMaterial
          color={isSelected ? '#ffaa33' : '#667788'}
          metalness={0.75}
          roughness={0.25}
          transparent
          opacity={opacity as unknown as number}
        />
      </mesh>
    </animated.group>
  );
}
