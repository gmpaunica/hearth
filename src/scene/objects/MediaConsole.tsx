import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import type * as THREE from 'three';

import { partnerFor } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { atmo } from '../atmoState';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

type Position = [number, number, number];
type Rotation = [number, number, number];

interface DailyMediaObjectProps {
  position: Position;
  rotation?: Rotation;
}

function buildRecordPlayer(v: Vox) {
  // A compact wood turntable with a high-contrast platter, spindle, and tonearm.
  v.box(0, 0, 0, 8, 2, 7, '#4d3027');
  v.box(1, 2, 1, 6, 1, 5, '#d5a568');
  for (let x = 1; x < 7; x++) for (let z = 1; z < 6; z++) {
    const dx = x - 3.5;
    const dz = z - 3;
    if (dx * dx + dz * dz < 7) v.set(x, 3, z, '#36251f');
  }
  v.set(3, 4, 3, '#df8061');
  v.box(6, 3, 1, 1, 1, 4, '#c59c71');
  v.set(5, 3, 4, '#f1d9ae');
}

function buildCamera(v: Vox) {
  // Broad instant-camera silhouette: cream body, raised viewfinder, flash,
  // stepped lens, shutter, and a dark film slot. The old narrow body and
  // dangling white block read as an appliance rather than a camera.
  const cream = '#ead7b5';
  const creamShade = '#cda980';
  const leather = '#8f5745';
  const lensDark = '#3d302d';
  const lensGlass = '#8eb1aa';

  v.box(0, 2, 0, 10, 6, 4, cream);
  v.box(0, 2, 0, 10, 2, 4, leather);
  v.box(1, 0, 0, 8, 2, 4, creamShade);
  v.box(2, 8, 1, 4, 2, 2, leather);
  v.box(3, 8, 0, 2, 1, 1, '#f7e8ca');

  v.box(3, 3, -1, 4, 4, 1, lensDark);
  v.set(3, 3, -1, cream);
  v.set(6, 3, -1, cream);
  v.set(3, 6, -1, cream);
  v.set(6, 6, -1, cream);
  v.box(4, 4, -2, 2, 2, 1, lensGlass);
  v.set(4, 5, -3, '#c9e0d5');
  v.set(5, 4, -3, '#648d8a');

  v.box(7, 5, -1, 2, 2, 1, '#f1c66d');
  v.set(1, 8, 1, '#c95f55');
  v.box(2, 0, -1, 6, 1, 1, '#513a33');
}

function buildRecordBubble(v: Vox) {
  v.box(0, 0, 0, 8, 6, 1, '#fff4df');
  v.box(2, 1, -1, 4, 4, 1, '#503129');
  v.set(3, 2, -2, '#d87761');
  v.set(1, -1, 0, '#fff4df');
}

function buildPhotoBubble(v: Vox) {
  v.box(0, 0, 0, 8, 6, 1, '#fff4df');
  v.box(1, 1, -1, 6, 4, 1, '#bf6d54');
  v.box(2, 2, -2, 4, 2, 1, '#9bb8ac');
  v.set(5, 4, -2, '#f1c464');
  v.set(6, -1, 0, '#fff4df');
}

function useDeferredDailyRoute(path: '/daily-record' | '/daily-photo') {
  const openingRef = useRef(false);

  return useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (openingRef.current) return;
    openingRef.current = true;

    // R3F is still walking its pointer-event graph here. Let that dispatch
    // finish before Expo Router unmounts the Canvas, and accept only one tap.
    requestAnimationFrame(() => router.push(path as never));
  }, [path]);
}

export function DailyRecordPlayer({ position, rotation = [0, 0, 0] }: DailyMediaObjectProps) {
  const animatedRef = useRef<THREE.Group>(null);
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const arrival = useDailyMediaStore((state) => state.arrival);
  const userId = useAuthStore((state) => state.userId);
  const voice = partnerFor(snapshot, userId, 'voice');
  const unread = Boolean(voice && !voice.receipt);
  const open = useDeferredDailyRoute('/daily-record');

  useFrame((state) => {
    if (!animatedRef.current) return;
    const animate = unread || arrival?.medium === 'voice';
    const wave = atmo.reduceMotion || !animate ? 0 : Math.sin(state.clock.elapsedTime * 4.8);
    animatedRef.current.rotation.y = wave * 0.08;
    animatedRef.current.position.y = Math.max(0, wave) * 0.035;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={animatedRef} onClick={open}>
        <mesh position={[0.3, 0.18, 0.22]}>
          <boxGeometry args={[0.8, 0.58, 0.72]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <VoxMesh build={buildRecordPlayer} scale={0.075} />
        {unread && (
          <VoxMesh build={buildRecordBubble} scale={0.05} position={[0.12, 0.73, 0.08]} />
        )}
      </group>
    </group>
  );
}

export function DailyCamera({ position, rotation = [0, 0, 0] }: DailyMediaObjectProps) {
  const animatedRef = useRef<THREE.Group>(null);
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const arrival = useDailyMediaStore((state) => state.arrival);
  const userId = useAuthStore((state) => state.userId);
  const photo = partnerFor(snapshot, userId, 'photo');
  const unread = Boolean(photo && !photo.receipt);
  const open = useDeferredDailyRoute('/daily-photo');

  useFrame((state) => {
    if (!animatedRef.current) return;
    const animate = unread || arrival?.medium === 'photo';
    const wave = atmo.reduceMotion || !animate ? 0 : Math.sin(state.clock.elapsedTime * 5.2 + 1.4);
    animatedRef.current.rotation.z = wave * 0.055;
    animatedRef.current.position.y = Math.max(0, wave) * 0.035;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={animatedRef} onClick={open}>
        <mesh position={[0.31, 0.31, 0.1]}>
          <boxGeometry args={[0.82, 0.82, 0.58]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <VoxMesh build={buildCamera} scale={0.07} />
        {unread && (
          <VoxMesh build={buildPhotoBubble} scale={0.05} position={[0.08, 0.92, 0.03]} />
        )}
      </group>
    </group>
  );
}
