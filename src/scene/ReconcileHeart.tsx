import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { atmo } from './atmoState';
import { SPOTS } from './spots';
import { Vox } from './voxel';

const HEART = ['11011', '11111', '11111', '01110', '00100'] as const;
const heartMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });

/** Romantic endings use two small hearts beside the pair/bed. Every other
 * positive ending is handled by the fast fullscreen UI-layer heart. */
export function ReconcileHeart() {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const v = new Vox();
    HEART.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === '1') v.set(x, HEART.length - 1 - y, 0, '#ef6f82');
    }));
    const built = v.build(0.065, 0);
    built.translate(-2.5 * 0.065, 0, 0);
    return built;
  }, []);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const { liveMomentAction, momentPayoff } = useSceneStore.getState();
    const positiveAction = liveMomentAction?.destination === 'romantic'
      && (liveMomentAction.actionId === 'come_close' || liveMomentAction.actionId === 'send_affection');
    const positiveEnding = momentPayoff?.destination === 'romantic'
      && (momentPayoff.kind === 'heart' || momentPayoff.kind === 'mutual_heart');
    const eligible = positiveAction || positiveEnding;
    const duration = atmo.reduceMotion ? 0.5 : 0.8;
    const startedAt = positiveAction ? liveMomentAction.startedAt : momentPayoff?.startedAt;
    const age = eligible && startedAt ? (Date.now() - startedAt) / 1000 : duration;
    const visible = eligible && age < duration;
    group.visible = visible;
    if (!visible) return;
    const progress = age / duration;
    const pop = atmo.reduceMotion ? 1 : Math.min(1, progress * 5) * (1 + 0.15 * Math.max(0, 1 - progress * 5));
    group.scale.setScalar(0.85 * pop);
    const a = SPOTS.romantic.a;
    const b = SPOTS.romantic.b;
    group.position.set(
      (a.x + b.x) / 2,
      1.55 + (atmo.reduceMotion ? 0 : progress * 0.12),
      (a.z + b.z) / 2,
    );
    heartMaterial.opacity = atmo.reduceMotion || progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
  });

  return (
    <group ref={ref} visible={false}>
      <mesh geometry={geometry} material={heartMaterial} position={[-0.55, 0, 0]} />
      <mesh geometry={geometry} material={heartMaterial} position={[0.55, 0.08, 0]} />
    </group>
  );
}
