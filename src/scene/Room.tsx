import { useMemo } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';
import { atmo } from './atmoState';

// Portrait-first layout: the room is narrow (x in [-2.7, 2.7]) and deep
// (z in [-4.2 back wall, +4.4 open front]) so a phone screen frames it whole.
const WALL_H = 5;
const WALL_T = 0.18;

function Wall({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={room.wall} roughness={0.95} />
    </mesh>
  );
}

function Rug({
  position,
  radius,
  scaleX,
  scaleZ,
  outer,
  inner,
}: {
  position: [number, number, number];
  radius: number;
  scaleX: number;
  scaleZ: number;
  outer: string;
  inner: string;
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scaleX, scaleZ, 1]}>
        <circleGeometry args={[radius, 36]} />
        <meshStandardMaterial color={outer} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[scaleX, scaleZ, 1]}>
        <circleGeometry args={[radius * 0.7, 36]} />
        <meshStandardMaterial color={inner} roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * Night sky backdrop behind and above the room (also visible over the wall
 * tops, dollhouse-style), plus moon and stars framed by the window.
 */
function WindowView() {
  const skyMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.outsideSky; // live reference — Atmosphere damps this color
    m.fog = false;
    return m;
  }, []);

  const stars = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) {
      pos[i * 3] = -3 + Math.random() * 8;
      pos[i * 3 + 1] = 1.6 + Math.random() * 4.4;
      pos[i * 3 + 2] = -6.55 + Math.random() * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group>
      <mesh position={[0, 4, -6.9]} material={skyMat}>
        <planeGeometry args={[24, 16]} />
      </mesh>
      <mesh position={[2.2, 3.3, -6.7]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#e6e1d1" fog={false} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#cfd6e8" size={0.05} sizeAttenuation />
      </points>
    </group>
  );
}

/** Window in the back wall: frame, mullions, glass, sill. */
function BackWindow() {
  const frame = room.doorWood;
  return (
    <group>
      <mesh position={[1.45, 2.7, -4.25]}>
        <boxGeometry args={[1.56, 0.1, 0.12]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[1.45, 1.1, -4.25]}>
        <boxGeometry args={[1.56, 0.1, 0.12]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[0.72, 1.9, -4.25]}>
        <boxGeometry args={[0.1, 1.6, 0.12]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[2.18, 1.9, -4.25]}>
        <boxGeometry args={[0.1, 1.6, 0.12]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      {/* Mullions */}
      <mesh position={[1.45, 1.9, -4.23]}>
        <boxGeometry args={[0.05, 1.5, 0.05]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[1.45, 1.9, -4.23]}>
        <boxGeometry args={[1.4, 0.05, 0.05]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      {/* Glass */}
      <mesh position={[1.45, 1.9, -4.2]}>
        <planeGeometry args={[1.4, 1.5]} />
        <meshStandardMaterial color={room.glass} transparent opacity={0.1} roughness={0.1} />
      </mesh>
      {/* Sill */}
      <mesh position={[1.45, 1.12, -4.1]}>
        <boxGeometry args={[1.65, 0.07, 0.24]} />
        <meshStandardMaterial color={frame} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Garden door in the left wall + the little garden world beyond it. */
function GardenDoor() {
  const gardenMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.gardenLight; // live reference
    m.fog = false;
    return m;
  }, []);

  const frame = room.doorWood;
  return (
    <group>
      {/* Door frame */}
      <mesh position={[-2.75, 2.55, 1.3]}>
        <boxGeometry args={[0.14, 0.12, 1.64]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[-2.75, 1.25, 0.53]}>
        <boxGeometry args={[0.14, 2.5, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[-2.75, 1.25, 2.07]}>
        <boxGeometry args={[0.14, 2.5, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      {/* Mullions on the glass door */}
      <mesh position={[-2.69, 1.25, 1.3]}>
        <boxGeometry args={[0.05, 2.5, 0.06]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[-2.69, 1.3, 1.3]}>
        <boxGeometry args={[0.05, 0.06, 1.4]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      {/* Glass */}
      <mesh position={[-2.67, 1.25, 1.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.4, 2.5]} />
        <meshStandardMaterial color="#b8d4c4" transparent opacity={0.12} roughness={0.1} />
      </mesh>
      {/* Garden backdrop */}
      <mesh position={[-4.3, 2.2, 1.3]} rotation={[0, Math.PI / 2, 0]} material={gardenMat}>
        <planeGeometry args={[7, 6]} />
      </mesh>
      {/* Ground outside */}
      <mesh position={[-3.5, -0.03, 1.3]}>
        <boxGeometry args={[1.6, 0.1, 4.5]} />
        <meshStandardMaterial color="#2c3f28" roughness={1} />
      </mesh>
      {/* Bushes */}
      <mesh position={[-3.4, 0.35, 0.6]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshStandardMaterial color="#31482c" roughness={1} />
      </mesh>
      <mesh position={[-3.55, 0.28, 2.0]}>
        <sphereGeometry args={[0.32, 10, 10]} />
        <meshStandardMaterial color="#3a5233" roughness={1} />
      </mesh>
      {/* Lantern glow in the garden */}
      <mesh position={[-3.25, 0.5, 2.25]}>
        <cylinderGeometry args={[0.02, 0.03, 1.0, 6]} />
        <meshStandardMaterial color="#33261c" roughness={0.9} />
      </mesh>
      <mesh position={[-3.25, 1.05, 2.25]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#ffc06a" />
      </mesh>
    </group>
  );
}

/** Bedroom doorway in the right wall with a warm dim interior. */
function BedroomDoorway() {
  const frame = room.doorWood;
  return (
    <group>
      <mesh position={[2.75, 2.4, -2.9]}>
        <boxGeometry args={[0.14, 0.12, 1.41]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[2.75, 1.18, -3.59]}>
        <boxGeometry args={[0.14, 2.36, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[2.75, 1.18, -2.21]}>
        <boxGeometry args={[0.14, 2.36, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      {/* Dim room beyond */}
      <mesh position={[3.2, 1.3, -2.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.0, 2.8]} />
        <meshBasicMaterial color="#171009" />
      </mesh>
      {/* Warm bedside lamp glimpsed through the doorway */}
      <mesh position={[3.05, 0.62, -3.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#ff9c50" />
      </mesh>
    </group>
  );
}

function PictureFrame({
  position,
  rotationY = 0,
  size,
  art,
}: {
  position: [number, number, number];
  rotationY?: number;
  size: [number, number];
  art: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[size[0], size[1], 0.05]} />
        <meshStandardMaterial color={room.woodDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[size[0] - 0.1, size[1] - 0.1]} />
        <meshStandardMaterial color={art} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The room shell: floor, walls with openings, rugs, window, doors, frames. */
export function Room() {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[6.0, 0.2, 8.8]} />
        <meshStandardMaterial color={room.floor} roughness={0.9} />
      </mesh>
      {/* Plank seams */}
      {[-3.4, -2.2, -1.0, 0.2, 1.4, 2.6, 3.8].map((z) => (
        <mesh key={z} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.9, 0.025]} />
          <meshStandardMaterial color="#734a2f" roughness={1} />
        </mesh>
      ))}

      {/* Back wall (z = -4.2) with window opening */}
      <Wall position={[-1.125, WALL_H / 2, -4.29]} size={[3.75, WALL_H, WALL_T]} />
      <Wall position={[1.45, 0.575, -4.29]} size={[1.4, 1.15, WALL_T]} />
      <Wall position={[1.45, 3.825, -4.29]} size={[1.4, 2.35, WALL_T]} />
      <Wall position={[2.575, WALL_H / 2, -4.29]} size={[0.85, WALL_H, WALL_T]} />

      {/* Left wall (x = -2.7) with garden door opening */}
      <Wall position={[-2.79, WALL_H / 2, -1.9]} size={[WALL_T, WALL_H, 5.0]} />
      <Wall position={[-2.79, WALL_H / 2, 3.2]} size={[WALL_T, WALL_H, 2.4]} />
      <Wall position={[-2.79, 3.75, 1.3]} size={[WALL_T, 2.5, 1.4]} />

      {/* Right wall (x = 2.7) with bedroom doorway */}
      <Wall position={[2.79, WALL_H / 2, -3.96]} size={[WALL_T, WALL_H, 0.88]} />
      <Wall position={[2.79, WALL_H / 2, 1.06]} size={[WALL_T, WALL_H, 6.68]} />
      <Wall position={[2.79, 3.675, -2.9]} size={[WALL_T, 2.65, 1.25]} />

      {/* Rugs */}
      <Rug
        position={[-1.1, 0.012, -2.55]}
        radius={1.05}
        scaleX={1.15}
        scaleZ={0.7}
        outer={room.rugOuter}
        inner={room.rugInner}
      />
      <Rug
        position={[0.15, 0.012, 0.5]}
        radius={1.35}
        scaleX={1.2}
        scaleZ={1}
        outer="#71463a"
        inner="#8a5c49"
      />

      <BackWindow />
      <WindowView />
      <GardenDoor />
      <BedroomDoorway />

      {/* Pictures */}
      <PictureFrame position={[0.35, 2.4, -4.17]} size={[0.55, 0.7]} art="#6b8b7a" />
      <PictureFrame position={[2.62, 2.35, 0.15]} rotationY={-Math.PI / 2} size={[0.72, 0.52]} art="#c78a5f" />
      <PictureFrame position={[-2.62, 2.2, -1.6]} rotationY={Math.PI / 2} size={[0.55, 0.7]} art="#9db08a" />
    </group>
  );
}
