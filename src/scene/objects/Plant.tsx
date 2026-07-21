import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildPot(v: Vox) {
  // Terracotta pot with a slightly darker rim and soil on top.
  v.box(0, 0, 0, 3, 2, 3, room.plantPot);
  v.box(0, 2, 0, 3, 1, 3, '#9c5c36');
  v.set(1, 3, 1, '#3d2a1c');
}

/** One arcing palm blade: rises from the crown, reaches out, droops at the tip. */
function blade(v: Vox, dx: number, dz: number, lift = 0) {
  const dark = room.plantLeafDark;
  const light = '#72b95e';
  v.set(1 + dx, 2 + lift, 1 + dz, dark);
  v.set(1 + dx * 2, 3 + lift, 1 + dz * 2, room.plantLeaf);
  v.set(1 + dx * 3, 3 + lift, 1 + dz * 3, room.plantLeaf);
  v.set(1 + dx * 4, 2 + lift, 1 + dz * 4, light); // drooping lighter tip
}

function buildFoliage(v: Vox) {
  // Central crown the blades spring from (hero F: leafy palm, not a cube blob).
  v.box(1, 0, 1, 1, 3, 1, room.plantLeafDark);
  v.set(0, 2, 1, room.plantLeaf);
  v.set(2, 2, 1, room.plantLeaf);
  v.set(1, 2, 0, room.plantLeaf);
  v.set(1, 2, 2, room.plantLeaf);
  // Long blades toward the four sides, shorter ones on the diagonals.
  blade(v, 1, 0);
  blade(v, -1, 0);
  blade(v, 0, 1);
  blade(v, 0, -1);
  blade(v, 1, 1, 1);
  blade(v, -1, -1, 1);
  v.set(1, 4, 1, '#72b95e'); // top sprout
}

interface PlantProps {
  position: [number, number, number];
  scale?: number;
  /** Phase offset so multiple plants don't sway in sync. */
  phase?: number;
}

/** Chunky potted plant with gently swaying voxel foliage. */
export function Plant({ position, scale = 1, phase = 0 }: PlantProps) {
  const foliageRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const f = foliageRef.current;
    if (f) {
      const t = state.clock.elapsedTime;
      f.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
      f.rotation.x = Math.sin(t * 0.7 + phase * 2.0) * 0.035;
    }
  });

  return (
    <group position={position} scale={scale}>
      <VoxMesh build={buildPot} scale={0.22} />
      <group ref={foliageRef} position={[0.33, 0.6, 0.33]}>
        <VoxMesh build={buildFoliage} scale={0.22} position={[-0.33, 0, -0.33]} />
      </group>
    </group>
  );
}
