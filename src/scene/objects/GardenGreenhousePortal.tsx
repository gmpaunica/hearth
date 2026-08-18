import type { ThreeEvent } from '@react-three/fiber';
import { router } from 'expo-router';

import { GARDEN_OFFSET } from '../shell';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildGardenGreenhousePortal(v: Vox) {
  const frame = '#a75a3d';
  const glass = '#c9e2cf';
  const glassShade = '#a9cdbd';

  v.box(0, 0, 0, 8, 1, 6, '#a75d42');
  v.box(1, 1, 1, 6, 1, 4, '#6f8244');
  v.box(0, 1, 0, 1, 6, 1, frame);
  v.box(7, 1, 0, 1, 6, 1, frame);
  v.box(0, 1, 5, 1, 6, 1, frame);
  v.box(7, 1, 5, 1, 6, 1, frame);
  v.box(0, 5, 0, 8, 1, 1, frame);
  v.box(0, 5, 5, 8, 1, 1, frame);
  for (let x = 1; x < 7; x += 1) {
    v.set(x, 5 + Math.min(x, 7 - x), 0, x % 2 === 0 ? glass : glassShade);
    v.set(x, 5 + Math.min(x, 7 - x), 5, x % 2 === 0 ? glass : glassShade);
  }
  v.box(1, 2, 5, 2, 3, 1, glass);
  v.box(5, 2, 5, 2, 3, 1, glassShade);
  v.box(3, 1, 5, 2, 4, 1, '#7e4634');
  v.set(4, 3, 6, '#e4b96f');
}

export function GardenGreenhousePortal() {
  const openGreenhouse = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    router.push('/greenhouse' as never);
  };

  return (
    <group
      position={[
        GARDEN_OFFSET[0] - 6.25,
        GARDEN_OFFSET[1],
        GARDEN_OFFSET[2] - 2.25,
      ]}
      rotation={[0, Math.PI / 7, 0]}
      onClick={openGreenhouse}
    >
      <mesh position={[0.55, 0.58, 0.38]} onClick={openGreenhouse}>
        <boxGeometry args={[1.45, 1.35, 1.25]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <VoxMesh build={buildGardenGreenhousePortal} scale={0.14} />
      <mesh position={[0.55, 0.72, 0.38]}>
        <boxGeometry args={[0.82, 0.66, 0.68]} />
        <meshBasicMaterial color="#fff0bf" transparent opacity={0.09} depthWrite={false} />
      </mesh>
    </group>
  );
}
