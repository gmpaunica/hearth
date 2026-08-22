import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { CharacterRenderer } from '@/character/CharacterRenderer';
import type { CharacterColors } from '@/character/characterTypes';
import type { SignalType } from '@/copy';
import { consequenceFor } from '@/moments/consequenceCatalog';
import { useHomeStore } from '@/state/homeStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useSceneStore, type AvatarKey } from '@/state/sceneStore';
import { atmo } from './atmoState';
import {
  AVATAR_HIP_Y,
  AVATAR_TORSO_HEIGHT,
} from './ReferenceAvatarFigure';
import {
  nearestWalkablePoint,
  planPath,
  randomLivingPoint,
  type GroundPoint,
} from './sceneNavigation';
import { getSpotPose, SPOTS } from './spots';
import { Vox } from './voxel';

// A tiny 5×5 icon per signal so a glance across the room reads the *feeling*:
// heart = wants to reconnect / affection, "…" = wants to talk, leaf = needs
// space, "z" = overwhelmed/resting.
const ICONS: Record<SignalType, { color: string; rows: string[] }> = {
  fireplace: { color: '#e8607a', rows: ['01010', '11111', '11111', '01110', '00100'] },
  sofa: { color: '#f08aa2', rows: ['01010', '11111', '11111', '01110', '00100'] },
  table: { color: '#f5e6d8', rows: ['00000', '00000', '10101', '00000', '00000'] },
  garden: { color: '#7bb47a', rows: ['00010', '00110', '01110', '11110', '01100'] },
  rest: { color: '#9fc3e0', rows: ['11111', '00010', '00100', '01000', '11111'] },
  romantic: { color: '#e0608a', rows: ['01010', '11111', '11111', '01110', '00100'] },
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

const WALK_SPEED = 1.05;
const AMBIENT_SPEED = 0.72;
const WALK_CADENCE = 10.2;
const TABLE_ACTIVITY_CHANCE = 0.3;

interface MotionTarget extends GroundPoint {
  rotY: number;
  seatY: number;
}

function chooseAmbientTarget(
  avatar: AvatarKey,
  current: GroundPoint,
  tableAvailable: boolean,
): MotionTarget {
  const chair = getSpotPose('table', avatar);
  if (
    tableAvailable &&
    Math.random() < TABLE_ACTIVITY_CHANCE &&
    Math.hypot(chair.x - current.x, chair.z - current.z) > 0.8
  ) {
    return { ...chair };
  }
  const point = randomLivingPoint(Math.random, current);
  return { ...point, rotY: Math.random() * Math.PI * 2, seatY: 0 };
}

/** Shortest-path exponential approach for angles. */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

/**
 * Big-headed voxel person: breathing idle, walking between spots with a
 * little leg scissor, and a standing/seated pose blend. Same animation
 * contract as before — only the look changed.
 */
export function Avatar({ avatar, colors }: { avatar: AvatarKey; colors: CharacterColors }) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const anim = useRef({
    rotY: getSpotPose('idle', avatar).rotY,
    sit: 0,
    seatY: 0,
    seating: false,
    phase: avatar === 'a' ? 0 : 1.7,
    seenSnap: 0,
    ambientTarget: null as MotionTarget | null,
    ambientArrived: false,
    ambientWait: 2,
    path: [] as GroundPoint[],
    pathIndex: 0,
    goalKey: '',
    lastSpot: 'idle' as keyof typeof SPOTS,
    exitTarget: null as { x: number; z: number; rotY: number } | null,
    exitSeatY: 0,
  });

  // Show a thought bubble while this character has an open signal.
  const signalType = useMomentV2Store((s) => {
    if (!s.ctx) return null;
    const userId = avatar === s.ctx.myAvatar ? s.ctx.userId : s.ctx.partnerId;
    if (!userId) return null;
    const active = s.snapshot?.active;
    return active?.author_id === userId ? active.destination : null;
  });
  const tableAvailable = useHomeStore((state) => Boolean(state.resolved.roles.shared_table));
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
    const basePose = getSpotPose(spotId, avatar);
    const actionEvent = [...scene.momentActionEvents]
      .reverse()
      .find((event) => {
        const actor = event.actor_id === useMomentV2Store.getState().ctx?.userId
          ? useMomentV2Store.getState().ctx?.myAvatar
          : useMomentV2Store.getState().ctx?.partnerAvatar;
        return actor === avatar;
      });
    const action = consequenceFor(scene.liveMomentAction?.actor === avatar
      ? scene.liveMomentAction.actionId
      : actionEvent?.canonical_action);
    const pose = action?.destination === 'fireplace' && spotId === 'fireplace'
      ? {
        ...basePose,
        x: basePose.x + (action.id === 'listen_by_fire' ? (avatar === 'a' ? -0.12 : 0.12) : 0),
        z: basePose.z + (action.id === 'talk_by_fire' ? 0.14 : 0),
        rotY: basePose.rotY + (action.id === 'listen_by_fire' ? (avatar === 'a' ? 0.22 : -0.22) : 0),
      }
      : basePose;

    // A seated Moment ends through the seat's authored clear-side point. Keep
    // the low pose while crossing the furniture edge, then stand only once the
    // avatar is outside its collider. This prevents the old one-frame switch
    // to an upright body in the middle of a sofa, chair, bench, mat, or bed.
    const applyingSnap = scene.snapAt !== a.seenSnap;
    if (!applyingSnap && spotId !== a.lastSpot) {
      const previousPose = getSpotPose(a.lastSpot, avatar);
      if (previousPose.seatY > 0 && previousPose.egress) {
        const nearSeat = Math.hypot(
          root.position.x - previousPose.x,
          root.position.z - previousPose.z,
        ) < 0.55;
        if (a.sit > 0.12 || nearSeat) {
          a.exitTarget = previousPose.egress;
          a.exitSeatY = previousPose.seatY;
        }
      }
      a.lastSpot = spotId;
      a.goalKey = '';
      a.path = [];
      a.pathIndex = 0;
      a.ambientTarget = null;
      a.ambientArrived = false;
      a.ambientWait = 1.2;
    }

    // Stay hidden until the saved state has loaded (first snap): the app then
    // opens with everyone already in place — no flash of "standing in the
    // middle" before a glitchy catch-up walk.
    root.visible = a.seenSnap !== 0;

    // On a hydrate snap, jump straight to the current pose (the app is opening
    // to existing state — it shouldn't replay the walk).
    if (scene.snapAt !== a.seenSnap) {
      a.seenSnap = scene.snapAt;
      a.lastSpot = spotId;
      a.exitTarget = null;
      a.exitSeatY = 0;
      root.position.set(pose.x, 0, pose.z);
      a.rotY = pose.rotY;
      a.sit = pose.seatY > 0 ? 1 : 0;
      a.seatY = pose.seatY;
      a.seating = pose.seatY > 0;
      a.ambientTarget = null;
      a.ambientArrived = false;
      a.ambientWait = 2;
      a.path = [];
      a.pathIndex = 0;
      a.goalKey = '';
    }

    // Reduced motion means immediate poses and static characters: no travel,
    // idle wandering, breathing, bubble bob, or seated interpolation.
    if (atmo.reduceMotion) {
      root.visible = true;
      if (spotId === 'idle') {
        // Reduced motion still respects collision safety: a seated avatar
        // snaps to the authored clear-side point before becoming upright.
        if (a.exitTarget) {
          root.position.set(a.exitTarget.x, 0, a.exitTarget.z);
          a.rotY = a.exitTarget.rotY;
          a.exitTarget = null;
          a.exitSeatY = 0;
        }
        a.sit = 0;
        a.seatY = 0;
      } else {
        a.exitTarget = null;
        a.exitSeatY = 0;
        root.position.set(pose.x, 0, pose.z);
        a.rotY = pose.rotY;
        a.sit = pose.seatY > 0 ? 1 : 0;
        a.seatY = pose.seatY;
      }
      root.rotation.y = a.rotY;
      a.ambientTarget = null;
      a.path = [];
      body.position.y = a.sit * (a.seatY - AVATAR_HIP_Y + 0.06);
      if (bubbleRef.current) {
        bubbleRef.current.position.y = 1.62;
        bubbleRef.current.rotation.y = Math.PI / 4 - a.rotY;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = -a.sit * 0.55;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -a.sit * 0.55;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -a.sit * 0.18;
        leftArmRef.current.rotation.z = 0.07 + a.sit * 0.06;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -a.sit * 0.18;
        rightArmRef.current.rotation.z = -0.07 - a.sit * 0.06;
      }
      if (torsoRef.current) torsoRef.current.scale.set(1, 1, 1);
      if (headRef.current) {
        headRef.current.position.y = AVATAR_TORSO_HEIGHT;
        headRef.current.rotation.z = 0;
      }
      if (action?.pose === 'holdObject') {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.9;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.9;
      } else if (action?.pose === 'hug') {
        if (leftArmRef.current) { leftArmRef.current.rotation.x = -1.25; leftArmRef.current.rotation.z = -0.62; }
        if (rightArmRef.current) { rightArmRef.current.rotation.x = -1.25; rightArmRef.current.rotation.z = 0.62; }
      } else if (action?.pose === 'holdHands') {
        if (leftArmRef.current) leftArmRef.current.rotation.z = -0.42;
        if (rightArmRef.current) rightArmRef.current.rotation.z = 0.42;
      } else if (action?.pose === 'wave' && rightArmRef.current) {
        rightArmRef.current.rotation.z = -2.3;
      }
      return;
    }

    const exitingSeat = a.exitTarget != null;
    const ambientAllowed = spotId === 'idle' && !signalType && !exitingSeat;
    if (!ambientAllowed) {
      a.ambientTarget = null;
      a.ambientArrived = false;
      a.ambientWait = 2;
    } else if (a.ambientTarget && a.ambientArrived) {
      a.ambientWait -= dt;
      if (a.ambientWait <= 0) {
        a.ambientTarget = chooseAmbientTarget(
          avatar,
          { x: root.position.x, z: root.position.z },
          tableAvailable,
        );
        a.ambientArrived = false;
      }
    } else {
      if (!a.ambientTarget) {
        a.ambientWait -= dt;
      }
      if (!a.ambientTarget && a.ambientWait <= 0) {
        a.ambientTarget = chooseAmbientTarget(
          avatar,
          { x: root.position.x, z: root.position.z },
          tableAvailable,
        );
        a.ambientArrived = false;
      }
    }

    const destination: MotionTarget = a.exitTarget
      ? { ...a.exitTarget, seatY: 0 }
      : a.ambientTarget ?? (
        ambientAllowed
          ? { x: root.position.x, z: root.position.z, rotY: a.rotY, seatY: 0 }
          : pose
      );
    const seatedDestination = !exitingSeat && destination.seatY > 0;
    const approach = exitingSeat
      ? destination
      : seatedDestination
        ? (pose.approach ?? nearestWalkablePoint(destination))
        : destination;
    const targetX = approach.x;
    const targetZ = approach.z;
    const speed = a.ambientTarget ? AMBIENT_SPEED : WALK_SPEED;
    const goalKey = [
      targetX.toFixed(3),
      targetZ.toFixed(3),
      destination.x.toFixed(3),
      destination.z.toFixed(3),
    ].join(',');
    if (goalKey !== a.goalKey) {
      a.goalKey = goalKey;
      a.seating = false;
      a.path = exitingSeat
        ? [{ x: targetX, z: targetZ }]
        : planPath(
          { x: root.position.x, z: root.position.z },
          { x: targetX, z: targetZ },
        );
      a.pathIndex = 0;
    }

    let waypoint = a.path[a.pathIndex] ?? approach;
    let dx = waypoint.x - root.position.x;
    let dz = waypoint.z - root.position.z;
    let waypointDistance = Math.hypot(dx, dz);
    if (waypointDistance < 0.045 && a.pathIndex < a.path.length - 1) {
      a.pathIndex++;
      waypoint = a.path[a.pathIndex];
      dx = waypoint.x - root.position.x;
      dz = waypoint.z - root.position.z;
      waypointDistance = Math.hypot(dx, dz);
    }
    const approachRemainingBefore = Math.hypot(
      targetX - root.position.x,
      targetZ - root.position.z,
    );
    const destinationRemainingBefore = Math.hypot(
      destination.x - root.position.x,
      destination.z - root.position.z,
    );
    if (
      seatedDestination &&
      approachRemainingBefore < 0.08 &&
      !a.ambientArrived
    ) {
      a.seating = true;
    }
    const standingUp =
      !exitingSeat &&
      a.sit > 0.12 &&
      destinationRemainingBefore > 0.12 &&
      !a.seating;
    const settlingIntoSeat =
      seatedDestination &&
      a.seating &&
      !a.ambientArrived;
    const walking =
      !a.ambientArrived &&
      !standingUp &&
      !settlingIntoSeat &&
      destinationRemainingBefore > 0.055 &&
      approachRemainingBefore > 0.055;
    const step = walking ? Math.min(speed * dt, waypointDistance) : 0;
    if (step > 0 && waypointDistance > 0.0001) {
      root.position.x += (dx / waypointDistance) * step;
      root.position.z += (dz / waypointDistance) * step;
    }
    if (standingUp) {
      root.position.x = THREE.MathUtils.damp(root.position.x, waypoint.x, 4.8, dt);
      root.position.z = THREE.MathUtils.damp(root.position.z, waypoint.z, 4.8, dt);
    }
    if (settlingIntoSeat) {
      root.position.x = THREE.MathUtils.damp(root.position.x, destination.x, 4.8, dt);
      root.position.z = THREE.MathUtils.damp(root.position.z, destination.z, 4.8, dt);
    }
    const approachRemaining = Math.hypot(
      targetX - root.position.x,
      targetZ - root.position.z,
    );
    const destinationRemaining = Math.hypot(
      destination.x - root.position.x,
      destination.z - root.position.z,
    );

    const targetRot = walking
      ? Math.atan2(dx, dz)
      : seatedDestination || !ambientAllowed || a.ambientArrived
        ? destination.rotY
        : a.rotY;
    a.rotY = dampAngle(a.rotY, targetRot, walking ? 4.5 : 5.5, dt);
    root.rotation.y = a.rotY;

    const sitTarget =
      exitingSeat
        ? (approachRemaining > 0.07 ? 1 : 0)
        : seatedDestination && (settlingIntoSeat || destinationRemaining < 0.1) ? 1 : 0;
    a.sit = THREE.MathUtils.damp(a.sit, sitTarget, 5, dt);
    a.seatY = THREE.MathUtils.damp(
      a.seatY,
      exitingSeat ? a.exitSeatY : seatedDestination ? destination.seatY : 0,
      5,
      dt,
    );

    const activityComplete = exitingSeat
      ? approachRemaining < 0.055 && a.sit < 0.08
      : seatedDestination
        ? destinationRemaining < 0.045 && a.sit > 0.82
        : approachRemaining < 0.055;
    if (exitingSeat && activityComplete) {
      a.exitTarget = null;
      a.exitSeatY = 0;
      a.goalKey = '';
      a.path = [];
      a.pathIndex = 0;
      a.ambientWait = 1.2;
    }
    if (a.ambientTarget && !a.ambientArrived && activityComplete) {
      a.ambientArrived = true;
      a.ambientWait = 5 + Math.random() * 4;
    }

    // Hips land just above the seat surface.
    const bob = walking ? Math.abs(Math.sin(t * WALK_CADENCE + a.phase)) * 0.04 : 0;
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
    body.position.y = a.sit * (a.seatY - AVATAR_HIP_Y + 0.06) + bob + hop;

    // Thought bubble: gentle bob, always turned toward the isometric camera.
    if (bubbleRef.current) {
      bubbleRef.current.position.y = 1.62 + Math.sin(t * 2.2 + a.phase) * 0.03;
      bubbleRef.current.rotation.y = Math.PI / 4 - a.rotY;
    }

    const swing = walking ? Math.sin(t * WALK_CADENCE + a.phase) * 0.42 : 0;
    if (leftLegRef.current) {
      // These compact reference legs read best as a gentle dangle. Rotating
      // them almost horizontal hid both shoes inside deep cushions.
      leftLegRef.current.rotation.x = -a.sit * 0.55 + swing;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -a.sit * 0.55 - swing;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -a.sit * 0.18 - swing * 0.42;
      leftArmRef.current.rotation.z = 0.07 + a.sit * 0.06;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -a.sit * 0.18 + swing * 0.42;
      rightArmRef.current.rotation.z = -0.07 - a.sit * 0.06;
    }

    // The same catalog pose used by the miniature preview lands on the real
    // actor after travel. These overrides remain subtle enough to preserve the
    // walk/seating rig while making listen, hug, gift and hand-holding distinct.
    if (!walking && action) {
      if (action.pose === 'holdObject') {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.9;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.9;
      } else if (action.pose === 'hug') {
        if (leftArmRef.current) { leftArmRef.current.rotation.x = -1.25; leftArmRef.current.rotation.z = -0.62; }
        if (rightArmRef.current) { rightArmRef.current.rotation.x = -1.25; rightArmRef.current.rotation.z = 0.62; }
      } else if (action.pose === 'holdHands') {
        if (leftArmRef.current) leftArmRef.current.rotation.z = -0.42;
        if (rightArmRef.current) rightArmRef.current.rotation.z = 0.42;
      } else if (action.pose === 'wave' && rightArmRef.current) {
        rightArmRef.current.rotation.z = -2.3;
      }
    }

    // Breathing.
    if (torsoRef.current) {
      const breath = 1 + Math.sin(t * 1.9 + a.phase) * 0.025;
      torsoRef.current.scale.set(1, breath, 1);
    }
    if (headRef.current) {
      headRef.current.position.y = AVATAR_TORSO_HEIGHT + Math.sin(t * 1.9 + a.phase) * 0.01;
      headRef.current.rotation.z = Math.sin(t * 0.5 + a.phase * 3) * 0.04;
    }
  });

  const start = getSpotPose('idle', avatar);
  return (
    <group
      ref={rootRef}
      position={[start.x, 0, start.z]}
      rotation={[0, start.rotY, 0]}
      visible={false}
    >
      <group ref={bodyRef}>
        <CharacterRenderer
          colors={colors}
          rigRefs={{
            hips: hipsRef,
            torso: torsoRef,
            head: headRef,
            leftArm: leftArmRef,
            rightArm: rightArmRef,
            leftLeg: leftLegRef,
            rightLeg: rightLegRef,
          }}
        />
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
