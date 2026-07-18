import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildPot(v: Vox) {
  v.box(0, 0, 0, 3, 2, 3, room.plantPot);
  v.set(1, 2, 1, '#4a3222');
}

function buildFoliage(v: Vox) {
  v.box(0, 0, 0, 1, 2, 1, '#4f7040'); // stem
  v.box(-2, 2, -2, 5, 3, 5, room.plantLeaf);
  v.box(-1, 5, -1, 3, 1, 3, room.plantLeafDark);
  // Knock off corners for a rounded canopy.
  v.remove(-2, 2, -2); v.remove(2, 2, -2); v.remove(-2, 2, 2); v.remove(2, 2, 2);
  v.remove(-2, 4, -2); v.remove(2, 4, -2); v.remove(-2, 4, 2); v.remove(2, 4, 2);
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
      <group ref={foliageRef} position={[0.33, 0.44, 0.33]}>
        <VoxMesh build={buildFoliage} scale={0.22} position={[-0.11, 0, -0.11]} />
      </group>
    </group>
  );
}
