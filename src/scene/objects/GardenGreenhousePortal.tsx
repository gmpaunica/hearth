import type { ThreeEvent } from '@react-three/fiber';
import { router } from 'expo-router';

import { paletteColor } from '@/home/palettes';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildGardenGreenhousePortal(v: Vox, style: Readonly<Record<string, unknown>>) {
  const variant = style.variant;
  const frame = paletteColor(style, 'wood', variant === 'brass' ? '#8b7046' : variant === 'forest' ? '#52705a' : '#a75a3d');
  const metal = paletteColor(style, 'metal', variant === 'brass' ? '#d0aa5b' : '#e4b96f');
  const foliage = paletteColor(style, 'foliage', variant === 'forest' ? '#3f674d' : '#6f8244');
  const glass = variant === 'brass' ? '#c8d9d2' : '#c9e2cf';
  const glassShade = variant === 'forest' ? '#8db7a5' : '#a9cdbd';

  v.box(0, 0, 0, 8, 1, 6, frame);
  v.box(1, 1, 1, 6, 1, 4, foliage);
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
  v.box(3, 1, 5, 2, 4, 1, frame);
  v.set(4, 3, 6, metal);
}

export function GardenGreenhousePortal({
  position = [0, 0, 0],
  style = {},
}: {
  position?: [number, number, number];
  style?: Readonly<Record<string, unknown>>;
}) {
  const openGreenhouse = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    router.push('/greenhouse' as never);
  };

  return (
    <group
      position={position}
      rotation={[0, Math.PI / 7, 0]}
      onClick={openGreenhouse}
    >
      <mesh position={[0.55, 0.58, 0.38]} onClick={openGreenhouse}>
        <boxGeometry args={[1.45, 1.35, 1.25]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <VoxMesh
        build={(vox) => buildGardenGreenhousePortal(vox, style)}
        cacheKey={`greenhouse:${JSON.stringify(style)}`}
        scale={0.14}
      />
      <mesh position={[0.55, 0.72, 0.38]}>
        <boxGeometry args={[0.82, 0.66, 0.68]} />
        <meshBasicMaterial color="#fff0bf" transparent opacity={0.09} depthWrite={false} />
      </mesh>
    </group>
  );
}
