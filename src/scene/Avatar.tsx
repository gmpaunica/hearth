import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneStore, type AvatarKey } from '@/state/sceneStore';
import { SPOTS } from './spots';

export interface AvatarColors {
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
}

const HIP_Y = 0.48;

/** Shortest-path exponential approach for angles. */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

const shadowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shadowFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - vec2(0.5)) * 2.0;
    float alpha = smoothstep(1.0, 0.15, d) * 0.32;
    gl_FragColor = vec4(0.05, 0.02, 0.0, alpha);
  }
`;

/**
 * A soft stylized person: breathing idle animation, smooth walking between
 * spots, and a standing/seated pose blend. Purely procedural — swappable for
 * a rigged GLB model later without changing the movement logic.
 */
export function Avatar({ avatar, colors }: { avatar: AvatarKey; colors: AvatarColors }) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const legsRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  // Per-instance animation state kept in a ref (no re-renders).
  const anim = useRef({
    rotY: SPOTS.idle[avatar].rotY,
    sit: 0,
    phase: avatar === 'a' ? 0 : 1.7,
  });

  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shadowVertex,
        fragmentShader: shadowFragment,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const dt = Math.min(rawDelta, 0.1);
    const t = state.clock.elapsedTime;
    const a = anim.current;

    const spotId = useSceneStore.getState().spots[avatar];
    const pose = SPOTS[spotId][avatar];

    // Glide toward the target spot.
    root.position.x = THREE.MathUtils.damp(root.position.x, pose.x, 3.2, dt);
    root.position.z = THREE.MathUtils.damp(root.position.z, pose.z, 3.2, dt);
    const dx = pose.x - root.position.x;
    const dz = pose.z - root.position.z;
    const dist = Math.hypot(dx, dz);
    const moving = dist > 0.09;

    // Face the walking direction while moving, then settle into the pose.
    const targetRot = moving ? Math.atan2(dx, dz) : pose.rotY;
    a.rotY = dampAngle(a.rotY, targetRot, moving ? 8 : 4.5, dt);
    root.rotation.y = a.rotY;

    // Sit only once we've arrived at a seat.
    const sitTarget = !moving && pose.seatY > 0 ? 1 : 0;
    a.sit = THREE.MathUtils.damp(a.sit, sitTarget, 5, dt);

    // Body height: lift the hips onto the seat top + a little bounce while
    // walking. (seatY is the seat surface height; 0.30 keeps the torso base
    // resting on it rather than sinking through.)
    const bob = moving ? Math.abs(Math.sin(t * 9 + a.phase)) * 0.045 : 0;
    body.position.y = a.sit * (pose.seatY - 0.3) + bob;

    // Legs swing forward-and-down when seated.
    if (legsRef.current) {
      legsRef.current.rotation.x = -a.sit * 1.22;
      // Slight walk-cycle scissor while moving.
      const swing = moving ? Math.sin(t * 9 + a.phase) * 0.4 : 0;
      const [l, r] = legsRef.current.children as THREE.Object3D[];
      if (l && r) {
        l.rotation.x = swing;
        r.rotation.x = -swing;
      }
    }

    // Breathing.
    if (torsoRef.current) {
      const breath = 1 + Math.sin(t * 1.9 + a.phase) * 0.022;
      torsoRef.current.scale.set(1, breath, 1);
    }
    if (headRef.current) {
      headRef.current.position.y = 1.24 + Math.sin(t * 1.9 + a.phase) * 0.008;
      headRef.current.rotation.z = Math.sin(t * 0.5 + a.phase * 3) * 0.03;
    }

    // Ground shadow stays on the floor, fades when lifted onto a seat.
    if (shadowRef.current) {
      shadowRef.current.position.y = 0.012 - root.position.y;
      const s = 1 - a.sit * 0.25;
      shadowRef.current.scale.set(s, s, 1);
    }
  });

  const start = SPOTS.idle[avatar];
  return (
    <group ref={rootRef} position={[start.x, 0, start.z]} rotation={[0, start.rotY, 0]}>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
        <planeGeometry args={[0.68, 0.68]} />
      </mesh>
      <group ref={bodyRef}>
        {/* Legs (pivot at the hips so they can swing forward when seated) */}
        <group ref={legsRef} position={[0, HIP_Y, 0]}>
          <mesh position={[-0.11, -0.24, 0]}>
            <capsuleGeometry args={[0.085, 0.26, 4, 10]} />
            <meshStandardMaterial color={colors.accent} roughness={0.9} />
          </mesh>
          <mesh position={[0.11, -0.24, 0]}>
            <capsuleGeometry args={[0.085, 0.26, 4, 10]} />
            <meshStandardMaterial color={colors.accent} roughness={0.9} />
          </mesh>
        </group>
        {/* Torso */}
        <mesh ref={torsoRef} position={[0, 0.78, 0]}>
          <capsuleGeometry args={[0.21, 0.4, 6, 14]} />
          <meshStandardMaterial color={colors.outfit} roughness={0.85} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.27, 0.72, 0]} rotation={[0, 0, 0.16]}>
          <capsuleGeometry args={[0.06, 0.26, 4, 8]} />
          <meshStandardMaterial color={colors.outfit} roughness={0.85} />
        </mesh>
        <mesh position={[0.27, 0.72, 0]} rotation={[0, 0, -0.16]}>
          <capsuleGeometry args={[0.06, 0.26, 4, 8]} />
          <meshStandardMaterial color={colors.outfit} roughness={0.85} />
        </mesh>
        {/* Head */}
        <group ref={headRef} position={[0, 1.24, 0]}>
          <mesh>
            <sphereGeometry args={[0.19, 20, 20]} />
            <meshStandardMaterial color={colors.skin} roughness={0.7} />
          </mesh>
          {/* Hair cap */}
          <mesh position={[0, 0.06, -0.02]} scale={[1, 0.82, 1]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshStandardMaterial color={colors.hair} roughness={0.95} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.065, -0.01, 0.165]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#2b1d15" roughness={0.4} />
          </mesh>
          <mesh position={[0.065, -0.01, 0.165]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#2b1d15" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
