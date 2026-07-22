import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneStore, type AvatarKey } from '@/state/sceneStore';
import { SPOTS } from './spots';
import { Vox, voxelMaterial } from './voxel';

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

  const parts = useMemo(
    () => ({
      leg: buildLeg(colors),
      torso: buildTorso(colors),
      arm: buildArm(colors),
      head: buildHead(colors),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
    body.position.y = a.sit * (pose.seatY - HIP_Y + 0.06) + bob;

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
    <group ref={rootRef} position={[start.x, 0, start.z]} rotation={[0, start.rotY, 0]}>
      <group ref={bodyRef}>
        <group ref={legsRef} position={[0, HIP_Y, 0]}>
          <mesh geometry={parts.leg} material={voxelMaterial} position={[-S, 0, 0]} />
          <mesh geometry={parts.leg} material={voxelMaterial} position={[S, 0, 0]} />
        </group>
        <mesh ref={torsoRef} geometry={parts.torso} material={voxelMaterial} position={[0, HIP_Y, 0]} />
        <mesh geometry={parts.arm} material={voxelMaterial} position={[-3.5 * S, 8 * S, 0]} rotation={[0, 0, 0.08]} />
        <mesh geometry={parts.arm} material={voxelMaterial} position={[3.5 * S, 8 * S, 0]} rotation={[0, 0, -0.08]} />
        <mesh ref={headRef} geometry={parts.head} material={voxelMaterial} position={[0, 8 * S, 0]} />
      </group>
    </group>
  );
}
