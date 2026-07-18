import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';

interface PlantProps {
  position: [number, number, number];
  scale?: number;
  /** Phase offset so multiple plants don't sway in sync. */
  phase?: number;
}

/** Potted plant with gently swaying foliage. */
export function Plant({ position, scale = 1, phase = 0 }: PlantProps) {
  const foliageRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const f = foliageRef.current;
    if (f) {
      const t = state.clock.elapsedTime;
      f.rotation.z = Math.sin(t * 0.9 + phase) * 0.045;
      f.rotation.x = Math.sin(t * 0.7 + phase * 2.0) * 0.03;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Pot */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.32, 12]} />
        <meshStandardMaterial color={room.plantPot} roughness={0.85} />
      </mesh>
      <group ref={foliageRef} position={[0, 0.32, 0]}>
        {/* Stems */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.015, 0.02, 0.5, 6]} />
          <meshStandardMaterial color="#4a5f3a" roughness={0.9} />
        </mesh>
        {/* Leaf clusters */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial color={room.plantLeaf} roughness={0.95} />
        </mesh>
        <mesh position={[0.15, 0.4, 0.05]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.15, 9, 9]} />
          <meshStandardMaterial color="#6d8c5c" roughness={0.95} />
        </mesh>
        <mesh position={[-0.14, 0.44, -0.04]} scale={[1, 0.85, 1]}>
          <sphereGeometry args={[0.13, 9, 9]} />
          <meshStandardMaterial color="#54724a" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}
