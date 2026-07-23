import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { SignalType } from '@/copy';
import { useSignalStore } from '@/state/signalStore';
import { useSceneStore, type AvatarKey } from '@/state/sceneStore';
import { atmo } from './atmoState';
import { SPOTS } from './spots';
import { Vox, voxelMaterial } from './voxel';

// A tiny 5×5 icon per signal so a glance across the room reads the *feeling*:
// heart = wants to reconnect / affection, "…" = wants to talk, leaf = needs
// space, "z" = overwhelmed/resting.
const ICONS: Record<SignalType, { color: string; rows: string[] }> = {
  fireplace: { color: '#e8607a', rows: ['01010', '11111', '11111', '01110', '00100'] },
  sofa: { color: '#f08aa2', rows: ['01010', '11111', '11111', '01110', '00100'] },
  table: { color: '#f5e6d8', rows: ['00000', '00000', '10101', '00000', '00000'] },
  garden: { color: '#7bb47a', rows: ['00010', '00110', '01110', '11110', '01100'] },
  rest: { color: '#9fc3e0', rows: ['11111', '00010', '00100', '01000', '11111'] },
};

const iconMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
const iconCache: Partial<Record<SignalType, THREE.BufferGeometry>> = {};
function iconGeometry(type: SignalType): THREE.BufferGeometry {
  if (iconCache[type]) return iconCache[type]!;
  const { rows, color } = ICONS[type];
  const v = new Vox();
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === '1') v.set(x, rows.length - 1 - y, 0, color);
    });
  });
  const g = v.build(0.05, 0);
  g.translate(-2.5 * 0.05, -2.5 * 0.05, 0);
  iconCache[type] = g;
  return g;
}

export interface AvatarColors {
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
}

const S = 0.09; // avatar voxel size (total height ≈ 1.35 world units)
const HIP_Y = 3 * S; // legs are 3 voxels tall

/** Shortest-path exponential approach for angles. */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function buildLeg(colors: AvatarColors) {
  const v = new Vox();
  v.box(0, 0, 0, 2, 3, 2, colors.accent);
  v.box(0, 0, 0, 2, 1, 2, '#4a3222'); // shoes
  const g = v.build(S, 0.04);
  g.translate(-S, -3 * S, -S); // pivot at hip (top center)
  return g;
}

function buildTorso(colors: AvatarColors) {
  const v = new Vox();
  // Narrow body under the big head (hero F: head reads much wider than body).
  v.box(0, 0, 0, 5, 5, 4, colors.outfit);
  v.box(0, 4, 0, 5, 1, 4, colors.accent); // collar/scarf band under the chin
  const g = v.build(S, 0.04);
  g.translate(-2.5 * S, 0, -2 * S);
  return g;
}

function buildArm(colors: AvatarColors) {
  const v = new Vox();
  v.box(0, 0, 0, 2, 4, 2, colors.outfit);
  v.box(0, 0, 0, 2, 1, 2, colors.skin); // hands
  const g = v.build(S, 0.04);
  g.translate(-S, -4 * S, -S); // pivot at shoulder
  return g;
}

function buildHead(colors: AvatarColors) {
  const v = new Vox();
  // Big cute head: 8 wide, 7 tall, 7 deep (front is +z).
  v.box(0, 0, 0, 8, 7, 7, colors.skin);
  // Hero-F hair: a flat solid slab over the top 3 rows with a straight fringe
  // across the forehead, plus the full back of the head.
  v.box(0, 4, 0, 8, 3, 7, colors.hair);
  v.box(0, 0, 0, 8, 7, 2, colors.hair);
  // Eyes, blush, small mouth on the front face.
  v.set(2, 2, 6, '#2a1c12');
  v.set(5, 2, 6, '#2a1c12');
  v.set(1, 1, 6, '#f0a08a');
  v.set(6, 1, 6, '#f0a08a');
  v.set(3, 1, 6, '#d9997b');
  v.set(4, 1, 6, '#d9997b');
  const g = v.build(S, 0.03);
  g.translate(-4 * S, 0, -3.5 * S);
  return g;
}

/**
 * Big-headed voxel person: breathing idle, walking between spots with a
 * little leg scissor, and a standing/seated pose blend. Same animation
 * contract as before — only the look changed.
 */
export function Avatar({ avatar, colors }: { avatar: AvatarKey; colors: AvatarColors }) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const legsRef = useRef<THREE.Group>(null);

  const anim = useRef({
    rotY: SPOTS.idle[avatar].rotY,
    sit: 0,
    phase: avatar === 'a' ? 0 : 1.7,
    seenSnap: 0,
  });

  // Rebuild the body when colors change: identity (who is member_a/member_b)
  // loads a beat after first render, and freezing the first-render colors was
  // exactly the "same person is a different colour on each phone" bug.
  const parts = useMemo(
    () => ({
      leg: buildLeg(colors),
      torso: buildTorso(colors),
      arm: buildArm(colors),
      head: buildHead(colors),
    }),
    [colors]
  );

  // Show a thought bubble while this character has an open signal.
  const signalType = useSignalStore((s) =>
    (avatar === 'a' ? s.mySignal?.type : s.partnerSignal?.type) ?? null,
  );
  const bubbleRef = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const dt = Math.min(rawDelta, 0.1);
    const t = state.clock.elapsedTime;
    const a = anim.current;

    const scene = useSceneStore.getState();
    const spotId = scene.spots[avatar];
    const pose = SPOTS[spotId][avatar];

    // Stay hidden until the saved state has loaded (first snap): the app then
    // opens with everyone already in place — no flash of "standing in the
    // middle" before a glitchy catch-up walk.
    root.visible = a.seenSnap !== 0;

    // On a hydrate snap, jump straight to the current pose (the app is opening
    // to existing state — it shouldn't replay the walk).
    if (scene.snapAt !== a.seenSnap) {
      a.seenSnap = scene.snapAt;
      root.position.set(pose.x, 0, pose.z);
      a.rotY = pose.rotY;
      a.sit = pose.seatY > 0 ? 1 : 0;
    }

    root.position.x = THREE.MathUtils.damp(root.position.x, pose.x, 3.2, dt);
    root.position.z = THREE.MathUtils.damp(root.position.z, pose.z, 3.2, dt);
    const dx = pose.x - root.position.x;
    const dz = pose.z - root.position.z;
    const dist = Math.hypot(dx, dz);
    const moving = dist > 0.09;

    const targetRot = moving ? Math.atan2(dx, dz) : pose.rotY;
    a.rotY = dampAngle(a.rotY, targetRot, moving ? 8 : 4.5, dt);
    root.rotation.y = a.rotY;

    const sitTarget = !moving && pose.seatY > 0 ? 1 : 0;
    a.sit = THREE.MathUtils.damp(a.sit, sitTarget, 5, dt);

    // Hips land just above the seat surface.
    const bob = moving ? Math.abs(Math.sin(t * 9 + a.phase)) * 0.04 : 0;
    // Reconciliation: a happy little double-hop as the glow begins (skipped
    // under reduce-motion — the warm glow itself still lands).
    let hop = 0;
    if (scene.glowStartedAt != null && !atmo.reduceMotion) {
      const age = (Date.now() - scene.glowStartedAt) / 1000;
      if (age < 1.3) {
        // Two bigger, springy hops (obvious "yay we made up").
        hop = 0.34 * Math.abs(Math.sin((age / 1.3) * Math.PI * 3)) * (1 - age / 1.3);
      }
    }
    body.position.y = a.sit * (pose.seatY - HIP_Y + 0.06) + bob + hop;

    // Thought bubble: gentle bob, always turned toward the isometric camera.
    if (bubbleRef.current) {
      bubbleRef.current.position.y = 1.62 + Math.sin(t * 2.2 + a.phase) * 0.03;
      bubbleRef.current.rotation.y = Math.PI / 4 - a.rotY;
    }

    if (legsRef.current) {
      legsRef.current.rotation.x = -a.sit * 1.22;
      const swing = moving ? Math.sin(t * 9 + a.phase) * 0.5 : 0;
      const [l, r] = legsRef.current.children as THREE.Object3D[];
      if (l && r) {
        l.rotation.x = swing;
        r.rotation.x = -swing;
      }
    }

    // Breathing.
    if (torsoRef.current) {
      const breath = 1 + Math.sin(t * 1.9 + a.phase) * 0.025;
      torsoRef.current.scale.set(1, breath, 1);
    }
    if (headRef.current) {
      headRef.current.position.y = 8 * S + Math.sin(t * 1.9 + a.phase) * 0.01;
      headRef.current.rotation.z = Math.sin(t * 0.5 + a.phase * 3) * 0.04;
    }
  });

  const start = SPOTS.idle[avatar];
  return (
    <group
      ref={rootRef}
      position={[start.x, 0, start.z]}
      rotation={[0, start.rotY, 0]}
      visible={false}
    >
      <group ref={bodyRef}>
        <group ref={legsRef} position={[0, HIP_Y, 0]}>
          <mesh geometry={parts.leg} material={voxelMaterial} position={[-S, 0, 0]} />
          <mesh geometry={parts.leg} material={voxelMaterial} position={[S, 0, 0]} />
        </group>
        <mesh ref={torsoRef} geometry={parts.torso} material={voxelMaterial} position={[0, HIP_Y, 0]} />
        <mesh geometry={parts.arm} material={voxelMaterial} position={[-3.5 * S, 8 * S, 0]} rotation={[0, 0, 0.08]} />
        <mesh geometry={parts.arm} material={voxelMaterial} position={[3.5 * S, 8 * S, 0]} rotation={[0, 0, -0.08]} />
        <mesh ref={headRef} geometry={parts.head} material={voxelMaterial} position={[0, 8 * S, 0]} />
        {signalType && (
          <group ref={bubbleRef} position={[0, 1.62, 0]}>
            {/* Cream speech bubble with a little tail and a meaningful icon. */}
            <mesh position={[0.16, 0.02, 0]}>
              <boxGeometry args={[0.46, 0.36, 0.08]} />
              <meshBasicMaterial color="#fdf6ec" />
            </mesh>
            <mesh position={[-0.02, -0.24, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.08]} />
              <meshBasicMaterial color="#fdf6ec" />
            </mesh>
            <mesh
              geometry={iconGeometry(signalType)}
              material={iconMaterial}
              position={[0.16, 0.02, 0.06]}
            />
          </group>
        )}
      </group>
    </group>
  );
}
