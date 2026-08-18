import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';

export function CharacterCanvas({ children, zoom }: { children: ReactNode; zoom: number }) {
  return (
    <Canvas
      orthographic
      flat
      frameloop="demand"
      camera={{ position: [3, 2.5, 3], zoom, near: 0.1, far: 20 }}
      gl={{ antialias: false }}
    >
      {children}
    </Canvas>
  );
}
