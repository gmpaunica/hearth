import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildPot(v: Vox) {
  // Footed, stepped terracotta pot with a broad rim and visible soil.
  v.box(0, 0, 0, 3, 1, 3, '#81452f');
  v.box(0, 1, 0, 3, 1, 3, room.plantPot);
  v.box(-1, 2, -1, 5, 1, 5, '#9c5c36');
  v.box(0, 3, 0, 3, 1, 3, '#3d2a1c');
  v.set(0, 3, 0, '#b86b43');
  v.set(2, 3, 2, '#b86b43');
  v.set(1, 1, 3, '#cf7b4d');
}

/** One arcing blade: rises from the crown, reaches out, then droops. */
function blade(v: Vox, dx: number, dz: number, lift = 0, lightTip = false) {
  const light = lightTip ? '#8bc56d' : '#72b95e';
  v.set(1 + dx, 2 + lift, 1 + dz, room.plantLeafDark);
  v.set(1 + dx * 2, 3 + lift, 1 + dz * 2, room.plantLeaf);
  v.set(
    1 + dx * 3,
    3 + lift,
    1 + dz * 3,
    lightTip ? '#67ad55' : room.plantLeaf,
  );
  v.set(1 + dx * 4, 2 + lift, 1 + dz * 4, light);
}

function buildFoliage(v: Vox) {
  // A dense central crown prevents the plant from looking like disconnected
  // spokes when viewed from the room camera.
  v.box(1, 0, 1, 1, 4, 1, room.plantLeafDark);
  v.set(0, 2, 1, room.plantLeaf);
  v.set(2, 2, 1, room.plantLeaf);
  v.set(1, 2, 0, room.plantLeaf);
  v.set(1, 2, 2, room.plantLeaf);

  // Cardinal fronds and a complete diagonal crown create a lush silhouette.
  blade(v, 1, 0, 0, true);
  blade(v, -1, 0);
  blade(v, 0, 1, 1);
  blade(v, 0, -1, 0, true);
  blade(v, 1, 1, 1);
  blade(v, -1, -1, 1, true);
  blade(v, 1, -1, 2, true);
  blade(v, -1, 1, 2);
  v.box(0, 4, 0, 3, 1, 3, '#67ad55');
  v.set(1, 5, 1, '#8bc56d');
  v.set(0, 5, 1, '#f0b4a7');
}

interface PlantProps {
  position: [number, number, number];
  scale?: number;
  /** Phase offset so multiple plants don't sway in sync. */
  phase?: number;
}

/** Layered potted plant with gently swaying voxel foliage. */
export function Plant({ position, scale = 1, phase = 0 }: PlantProps) {
  const foliageRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const foliage = foliageRef.current;
    if (foliage) {
      const t = state.clock.elapsedTime;
      foliage.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
      foliage.rotation.x = Math.sin(t * 0.7 + phase * 2.0) * 0.035;
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
