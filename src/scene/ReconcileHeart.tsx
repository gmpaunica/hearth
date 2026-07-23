import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { atmo } from './atmoState';
import { SPOTS } from './spots';
import { Vox } from './voxel';

// A chunky 7×7 heart, built once.
const HEART = [
  '0110110',
  '1111111',
  '1111111',
  '1111111',
  '0111110',
  '0011100',
  '0001000',
];

const heartMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/**
 * A big heart that pops above the pair when they reconcile — the unmistakable
 * "you made up" beat. Rises and fades over ~2s. Under reduce-motion it simply
 * fades in and out without the bouncy pop.
 */
export function ReconcileHeart() {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const v = new Vox();
    HEART.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === '1') v.set(x, HEART.length - 1 - y, 0, '#ef5f7a');
      });
    });
    const g = v.build(0.09, 0);
    g.translate(-3.5 * 0.09, 0, 0);
    return g;
  }, []);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { glowStartedAt: startedAt, glowSpot } = useSceneStore.getState();
    const DUR = 2.2;
    let show = false;
    if (startedAt != null) {
      const age = (Date.now() - startedAt) / 1000;
      if (age < DUR) {
        show = true;
        const x = age / DUR;
        // Pop in with an overshoot, then hold; rise slowly; fade near the end.
        const pop = atmo.reduceMotion
          ? Math.min(1, x * 6)
          : Math.min(1, x * 5) * (1 + 0.25 * Math.max(0, 1 - x * 5));
        const s = 0.9 * pop;
        g.scale.setScalar(s);
        // Centre the heart over whichever pair of seats glowed (fire or bed).
        const a = SPOTS[glowSpot].a;
        const b = SPOTS[glowSpot].b;
        g.position.x = (a.x + b.x) / 2;
        g.position.z = (a.z + b.z) / 2;
        g.position.y = 2.15 + x * 0.5;
        const fade = x > 0.7 ? 1 - (x - 0.7) / 0.3 : 1;
        heartMaterial.opacity = fade;
        heartMaterial.transparent = true;
      }
    }
    g.visible = show;
  });

  // Positioned each frame over the glowing pair of seats (see useFrame).
  return (
    <group ref={ref} position={[-1.6, 2.15, -1.85]} visible={false}>
      <mesh geometry={geometry} material={heartMaterial} />
    </group>
  );
}
