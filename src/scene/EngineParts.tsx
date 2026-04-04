// Assembles all engine parts into the scene with correct world positions.
// All measurements are derived from EngineConfig so the scene updates
// automatically when config changes.

import { useEngineStore } from '../store/engineStore';
import { Cylinder } from './parts/Cylinder';
import { Piston } from './parts/Piston';
import { ConnectingRod } from './parts/ConnectingRod';
import { CrankshaftAssembly } from './parts/CrankshaftAssembly';
import { CylinderHead } from './parts/CylinderHead';
import { Valve } from './parts/ValveAssembly';
import { CombustionFlash } from './effects/CombustionFlash';

export function EngineParts() {
  const config = useEngineStore((s) => s.engineConfig);

  const { bore, stroke, connectingRodLength } = config;
  const crankRadius = stroke / 2;

  // World coordinate layout (Y axis = up):
  // Crank center sits at world origin Y=0
  // TDC piston crown is at Y = crankRadius + connectingRodLength + stroke*0.1
  // BDC is at Y = crankRadius + connectingRodLength - stroke + stroke*0.1
  const crankCenterY = 0;
  const tdcY = crankCenterY + crankRadius + connectingRodLength;
  const pistonBaseY = tdcY - stroke * 0.4; // crown at TDC approximately

  // Top of bore = TDC piston crown position
  const boreTopY = tdcY;

  // Cylinder extends from crankCenterY to boreTopY
  // Cylinder head sits at boreTopY

  return (
    <group>
      {/* Cylinder block — static */}
      <Cylinder bore={bore} stroke={stroke} />

      {/* Cylinder head — static (moves in exploded view) */}
      <CylinderHead bore={bore} stroke={stroke} topY={boreTopY} />

      {/* Intake valve (green) */}
      <Valve
        type="intake"
        bore={bore}
        headTopY={boreTopY + bore * 0.4}
        xOffset={bore * 0.22}
      />

      {/* Exhaust valve (red) */}
      <Valve
        type="exhaust"
        bore={bore}
        headTopY={boreTopY + bore * 0.4}
        xOffset={-bore * 0.22}
      />

      {/* Piston — moves with kinematics */}
      <Piston bore={bore} stroke={stroke} pistonBaseY={pistonBaseY} />

      {/* Connecting rod — pivots between crankpin and wrist pin */}
      <ConnectingRod
        rodLength={connectingRodLength}
        stroke={stroke}
        crankCenterY={crankCenterY}
      />

      {/* Crankshaft — rotates continuously */}
      <CrankshaftAssembly stroke={stroke} crankCenterY={crankCenterY} />

      {/* Combustion flash at TDC */}
      <CombustionFlash position={[0, boreTopY - bore * 0.05, 0]} />
    </group>
  );
}
