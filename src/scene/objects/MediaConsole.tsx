import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { router } from 'expo-router';
import { useRef } from 'react';
import type * as THREE from 'three';

import { partnerFor } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { atmo } from '../atmoState';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildConsole(v: Vox) {
  v.box(0, 0, 0, 20, 2, 7, '#74452f');
  v.box(1, 2, 1, 18, 6, 5, '#9d6342');
  v.box(2, 3, 0, 7, 4, 1, '#70432f');
  v.box(11, 3, 0, 7, 4, 1, '#70432f');
  v.box(2, -2, 1, 2, 2, 2, '#593425');
  v.box(16, -2, 1, 2, 2, 2, '#593425');
  for (const x of [4, 7, 13, 16]) v.set(x, 5, 0, '#d5a568');
}

function buildRecordPlayer(v: Vox) {
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
  v.box(0, 0, 0, 7, 6, 5, '#e8d3ae');
  v.box(1, 5, 1, 5, 2, 3, '#bf6d54');
  v.box(2, 1, -1, 3, 3, 1, '#56382d');
  v.set(3, 2, -2, '#9bb8ac');
  v.box(5, 3, -1, 1, 1, 1, '#e1a449');
  v.box(1, -3, 1, 5, 3, 3, '#fff4dc');
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

export function MediaConsole() {
  const recordRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Group>(null);
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const arrival = useDailyMediaStore((state) => state.arrival);
  const userId = useAuthStore((state) => state.userId);
  const voice = partnerFor(snapshot, userId, 'voice');
  const photo = partnerFor(snapshot, userId, 'photo');
  const unreadVoice = Boolean(voice && !voice.receipt);
  const unreadPhoto = Boolean(photo && !photo.receipt);

  useFrame((state) => {
    if (!recordRef.current) return;
    const animate = unreadVoice || arrival?.medium === 'voice';
    const wave = atmo.reduceMotion || !animate ? 0 : Math.sin(state.clock.elapsedTime * 4.8);
    recordRef.current.rotation.y = wave * 0.08;
    recordRef.current.position.y = 0.47 + Math.max(0, wave) * 0.035;
    if (cameraRef.current) {
      const cameraAnimate = unreadPhoto || arrival?.medium === 'photo';
      const cameraWave = atmo.reduceMotion || !cameraAnimate ? 0 : Math.sin(state.clock.elapsedTime * 5.2 + 1.4);
      cameraRef.current.rotation.z = cameraWave * 0.06;
      cameraRef.current.position.y = 0.54 + Math.max(0, cameraWave) * 0.035;
    }
  });

  const openRecord = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    router.push('/daily-record' as never);
  };

  const openPhoto = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    router.push('/daily-photo' as never);
  };

  return (
    <group position={[3.35, 0.18, -3.85]} rotation={[0, -0.04, 0]}>
      <VoxMesh build={buildConsole} scale={0.075} />
      <group ref={recordRef} position={[0.15, 0.47, 0.12]} onClick={openRecord}>
        <mesh position={[0.3, 0.18, 0.22]} onClick={openRecord}>
          <boxGeometry args={[0.75, 0.55, 0.68]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <VoxMesh build={buildRecordPlayer} scale={0.075} />
        {unreadVoice && (
          <VoxMesh build={buildRecordBubble} scale={0.05} position={[0.12, 0.73, 0.08]} />
        )}
      </group>
      <group ref={cameraRef} position={[0.86, 0.54, 0.14]} onClick={openPhoto}>
        <mesh position={[0.26, 0.18, 0.13]} onClick={openPhoto}>
          <boxGeometry args={[0.64, 0.65, 0.55]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <VoxMesh build={buildCamera} scale={0.075} />
        {unreadPhoto && (
          <VoxMesh build={buildPhotoBubble} scale={0.05} position={[0.06, 0.73, 0.05]} />
        )}
      </group>
    </group>
  );
}
