import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { room } from '@/theme/hearth';
import { atmo } from './atmoState';
import { VoxMesh } from './VoxMesh';
import { Vox } from './voxel';

// Isometric corner diorama on a 0.25-unit voxel grid.
// Floor: vx -13..12, vz -14..12 (world x -3.25..3.25, z -3.5..3.25).
// Back wall at vz -14, left wall at vx -14. Front and right sides are open.

const S = 0.25;

function buildShell(v: Vox) {
  // Plinth under the floor (diorama base).
  v.box(-13, -2, -14, 26, 1, 27, '#5f3d24');
  // Wooden plank floor: two tones, plank rows along x.
  for (let x = -13; x <= 12; x++) {
    for (let z = -14; z <= 12; z++) {
      const plank = (Math.floor((x + 40) / 4) + z) % 2 === 0;
      v.set(x, -1, z, plank ? room.floorA : room.floorB);
    }
  }
  // Back wall (z = -14) and left wall (x = -14), 14 voxels high.
  v.box(-14, 0, -14, 27, 14, 1, room.wall);
  v.box(-14, 0, -14, 1, 14, 27, room.wall);
  v.box(-14, -1, -14, 27, 1, 1, room.wall);
  v.box(-14, -1, -14, 1, 1, 27, room.wall);
  // Baseboards.
  v.box(-13, 0, -14, 26, 1, 1, room.baseboard);
  v.box(-14, 0, -13, 1, 1, 26, room.baseboard);

  // Window opening in the back wall (world x 1.0..2.5, y 1.25..2.75).
  v.remove(4, 5, -14, 6, 6, 1);
  // Window frame + cross bars.
  v.box(3, 4, -14, 8, 1, 1, room.frameWhite);
  v.box(3, 11, -14, 8, 1, 1, room.frameWhite);
  v.box(3, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(10, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(6, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(4, 8, -14, 6, 1, 1, room.frameWhite);
  // Sill.
  v.box(3, 4, -13, 8, 1, 1, room.frameWhite);

  // Garden door opening in the left wall (world z 1.75..3.0, h 2.5).
  v.remove(-14, 0, 7, 1, 10, 5);
  v.box(-14, 10, 7, 1, 1, 5, room.doorWood);
  v.box(-14, 0, 6, 1, 11, 1, room.doorWood);
  v.box(-14, 0, 12, 1, 11, 1, room.doorWood);

  // Bedroom door opening in the left wall (world z -2.75..-1.75, h 2.5).
  v.remove(-14, 0, -11, 1, 10, 4);
  v.box(-14, 10, -11, 1, 1, 4, room.doorWood);
  v.box(-14, 0, -12, 1, 11, 1, room.doorWood);
  v.box(-14, 0, -7, 1, 11, 1, room.doorWood);

  // Pixel-heart picture on the left wall (above the bookshelf).
  v.box(-13, 8, -6, 1, 6, 7, room.frameWhite);
  const heart: [number, number][] = [
    [12, -5], [12, -3],
    [11, -6], [11, -5], [11, -4], [11, -3], [11, -2],
    [10, -5], [10, -4], [10, -3],
    [9, -4],
  ];
  for (const [y, z] of heart) v.set(-12, y, z, '#d0564a');

  // Little landscape picture above the bench.
  v.box(-13, 8, 1, 1, 5, 6, room.frameWhite);
  v.box(-12, 9, 2, 1, 3, 4, '#7fa8c9');
  v.box(-12, 9, 2, 1, 1, 4, '#59a04c');
  v.set(-12, 11, 4, '#f2ecd5');
}

function buildFireRug(v: Vox) {
  // 10 x 8 rug with a cream border.
  v.box(0, 0, 0, 10, 1, 8, '#d98e4f');
  v.box(1, 0, 1, 8, 1, 6, '#c2703a');
  v.box(3, 0, 3, 4, 1, 2, '#d98e4f');
  v.remove(0, 0, 0); v.remove(9, 0, 0); v.remove(0, 0, 7); v.remove(9, 0, 7);
}

function buildCenterRug(v: Vox) {
  v.box(0, 0, 0, 12, 1, 10, '#e8d4a8');
  v.box(1, 0, 1, 10, 1, 8, '#c2703a');
  v.box(2, 0, 2, 8, 1, 6, '#d98e4f');
  v.remove(0, 0, 0); v.remove(11, 0, 0); v.remove(0, 0, 9); v.remove(11, 0, 9);
}

function buildMoon(v: Vox) {
  v.box(0, 0, 0, 3, 3, 1, room.moon);
  v.remove(0, 0, 0);
  v.set(-1, 1, 0, room.moon);
  v.set(1, 3, 0, room.moon);
}

// With a fixed orthographic camera there is no parallax, so the "outside"
// is painted flat inside each wall opening — it can never leak past a wall.

/** Night sky filling the window opening: flat color + relief moon + stars. */
function SkyBackdrop() {
  const skyMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.outsideSky; // live reference
    return m;
  }, []);

  const stars = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(14 * 3);
    for (let i = 0; i < 14; i++) {
      pos[i * 3] = 1.08 + Math.random() * 1.34;
      pos[i * 3 + 1] = 1.35 + Math.random() * 1.3;
      pos[i * 3 + 2] = -3.36;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group>
      <mesh position={[1.75, 2.0, -3.44]} material={skyMat}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <VoxMesh build={buildMoon} scale={0.11} jitter={0.02} position={[2.02, 2.28, -3.42]} />
      <points geometry={stars}>
        <pointsMaterial color="#e8ecf5" size={0.05} sizeAttenuation />
      </points>
    </group>
  );
}

/** Garden filling the door opening: green flat + relief bush and lantern. */
function GardenBackdrop() {
  const gardenMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.gardenLight; // live reference
    return m;
  }, []);

  return (
    <group>
      <mesh position={[-3.44, 1.25, 2.375]} rotation={[0, Math.PI / 2, 0]} material={gardenMat}>
        <planeGeometry args={[1.25, 2.5]} />
      </mesh>
      {/* Relief bush + lantern just inside the opening */}
      <VoxMesh
        scale={0.16}
        position={[-3.42, 0, 1.85]}
        build={(v) => {
          v.box(0, 0, 0, 1, 2, 3, room.plantLeafDark);
          v.box(0, 2, 0, 1, 1, 2, room.plantLeaf);
          v.box(0, 0, 5, 1, 6, 1, '#4a3222');
          v.set(0, 6, 5, room.lamp);
        }}
      />
    </group>
  );
}

/** Dim bedroom filling the doorway, with a warm lamp relief. */
function BedroomBackdrop() {
  return (
    <group>
      <mesh position={[-3.44, 1.25, -2.25]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 2.5]} />
        <meshBasicMaterial color={room.bedroomDark} />
      </mesh>
      <VoxMesh
        scale={0.14}
        position={[-3.42, 0, -2.65]}
        build={(v) => {
          v.box(0, 0, 0, 1, 4, 2, '#5a3c26');
          v.set(0, 4, 0, room.lamp);
          v.set(0, 4, 1, room.lamp);
        }}
      />
    </group>
  );
}

/** Warm flickering pool of light on the floor in front of the fire. */
function FireGlowDecal() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const m = matRef.current;
    if (!m) {
      return;
    }
    const t = state.clock.elapsedTime;
    m.opacity = atmo.fire * (0.16 + 0.03 * Math.sin(t * 9.3) + 0.02 * Math.sin(t * 23.7));
  });
  return (
    <mesh position={[-1.6, 0.02, -2.35]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 0.85, 1]}>
      <circleGeometry args={[1.1, 24]} />
      <meshBasicMaterial ref={matRef} color="#ffab4d" transparent depthWrite={false} />
    </mesh>
  );
}

/** The room shell: floor, two walls, openings, rugs, backdrops, decals. */
export function Room() {
  return (
    <group>
      <VoxMesh build={buildShell} scale={S} />
      <VoxMesh build={buildFireRug} scale={S} meshScale={[1, 0.22, 1]} position={[-2.85, 0, -2.9]} />
      <VoxMesh build={buildCenterRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.2, 0, -0.55]} />
      <SkyBackdrop />
      <GardenBackdrop />
      <BedroomBackdrop />
      <FireGlowDecal />
    </group>
  );
}
