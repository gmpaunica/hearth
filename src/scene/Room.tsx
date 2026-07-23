import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { useHomeProgress } from '@/state/homeProgress';
import { room } from '@/theme/hearth';
import { atmo } from './atmoState';
import { Bed } from './objects/Bed';
import { Bench } from './objects/Bench';
import { Plant } from './objects/Plant';
import { PlatformFx } from './PlatformFx';
import { BEDROOM_OFFSET, GARDEN_OFFSET, S, buildCornerShell, stripedRug } from './shell';
import { VoxMesh } from './VoxMesh';
import { Vox } from './voxel';

// The home is a cluster of floating corner-room dioramas laid out on one
// screen-horizontal line, panned between (see HomeScene). Each room is its own
// two-wall shell so no interior wall ever occludes another — the proven pattern
// for fixed-isometric cozy-home apps. Rooms unlock (appear) as the couple grows.

// ── Living room ─────────────────────────────────────────────────────────────
// Floor: vx -13..12, vz -14..12 (world x -3.25..3.25, z -3.5..3.25). Back wall
// at vz -14, left wall at vx -14. Front and right sides open to the camera.

function buildLivingShell(v: Vox) {
  // Plinth under the floor (diorama base).
  v.box(-13, -2, -14, 26, 1, 27, '#5f3d24');
  // Golden brick floor in running bond (hero target F).
  for (let x = -13; x <= 12; x++) {
    for (let z = -14; z <= 12; z++) {
      const course = Math.floor((z + 30) / 3);
      const gz = ((z % 3) + 3) % 3;
      const offset = (course % 2) * 2;
      const gx = (((x + offset) % 4) + 4) % 4;
      if (gz === 2 || gx === 3) {
        v.set(x, -1, z, room.floorGrout);
      } else {
        const brick = (Math.floor((x + offset + 30) / 4) + course) % 2 === 0;
        v.set(x, -1, z, brick ? room.floorA : room.floorB);
      }
    }
  }
  // Back + left walls, 14 voxels high, with baseboards.
  v.box(-14, 0, -14, 27, 14, 1, room.wall);
  v.box(-14, 0, -14, 1, 14, 27, room.wall);
  v.box(-14, -1, -14, 27, 1, 1, room.wall);
  v.box(-14, -1, -14, 1, 1, 27, room.wall);
  v.box(-13, 0, -14, 26, 1, 1, room.baseboard);
  v.box(-14, 0, -13, 1, 1, 26, room.baseboard);

  // Window opening in the back wall (world x 1.0..2.5).
  v.remove(4, 5, -14, 6, 6, 1);
  v.box(3, 4, -14, 8, 1, 1, room.frameWhite);
  v.box(3, 11, -14, 8, 1, 1, room.frameWhite);
  v.box(3, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(10, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(6, 5, -14, 1, 6, 1, room.frameWhite);
  v.box(4, 8, -14, 6, 1, 1, room.frameWhite);
  v.box(3, 4, -13, 8, 1, 1, room.frameWhite);

  // Garden door opening in the left wall (leads to the garden platform).
  v.remove(-14, 0, 7, 1, 10, 5);
  v.box(-14, 10, 7, 1, 1, 5, room.doorWood);
  v.box(-14, 0, 6, 1, 11, 1, room.doorWood);
  v.box(-14, 0, 12, 1, 11, 1, room.doorWood);
}

function buildFireRug(v: Vox) {
  stripedRug(v, 10, 8);
}
function buildCenterRug(v: Vox) {
  stripedRug(v, 13, 10);
}

function buildMoon(v: Vox) {
  v.box(0, 0, 0, 5, 5, 1, room.moon);
  v.remove(0, 0, 0); v.remove(4, 0, 0); v.remove(0, 4, 0); v.remove(4, 4, 0);
  v.set(1, 3, 0, '#ddd6ba');
  v.set(3, 1, 0, '#d6cfb2');
  v.set(2, 2, 0, '#e6dfc4');
}

// With a fixed orthographic camera there's no parallax, so each wall opening's
// "outside" is painted flat inside it — it can never leak past the wall.

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
      <VoxMesh build={buildMoon} scale={0.12} jitter={0.02} position={[0.98, 2.12, -3.42]} />
      <VoxMesh
        scale={0.08}
        jitter={0.03}
        position={[1.06, 1.27, -3.42]}
        build={(v) => {
          const heights = [2, 3, 2, 4, 3, 2, 3, 5, 3, 2, 3, 2, 4, 2, 3, 2, 2];
          for (let i = 0; i < heights.length; i++) v.box(i, 0, 0, 1, heights[i], 1, '#0d1526');
        }}
      />
      <points geometry={stars}>
        <pointsMaterial color="#e8ecf5" size={0.05} sizeAttenuation />
      </points>
    </group>
  );
}

const voidVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const srgb2lin = /* glsl */ `
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }
`;

const voidFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    vec3 top = srgb2lin(vec3(0.055, 0.078, 0.16));
    vec3 bottom = srgb2lin(vec3(0.10, 0.13, 0.25));
    vec3 col = mix(bottom, top, vUv.y);
    float d = length(vec2((vUv.x - 0.5) * 1.6, (vUv.y - 0.42) * 1.2));
    col = mix(col, srgb2lin(vec3(0.16, 0.15, 0.24)), smoothstep(0.55, 0.0, d));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** The global night void behind the whole floating cluster: gradient + stars. */
function VoidBackdrop() {
  const gradientMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: voidVertex, fragmentShader: voidFragment }),
    [],
  );
  const stars = useMemo(() => {
    // Stars on a big plane facing the camera, spread wide enough to sit behind
    // every room in the panned row.
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    const rx = 0.7071; // in-plane right vector (cos45, 0, -sin45)
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * 46;
      const yy = -3 + Math.random() * 15;
      pos[i * 3] = -6 + u * rx;
      pos[i * 3 + 1] = yy;
      pos[i * 3 + 2] = -6 - u * rx;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.4, -9]} rotation={[0, Math.PI / 4, 0]} material={gradientMat}>
        <planeGeometry args={[70, 40]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#c9d2e8" size={0.055} sizeAttenuation transparent opacity={0.85} />
      </points>
    </group>
  );
}

/** Garden filling the left door opening: green flat + relief bush and lantern. */
function GardenDoorView() {
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

const poolFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float d = length((vUv - vec2(0.5)) * 2.0);
    float alpha = smoothstep(1.0, 0.05, d) * 0.34 * uIntensity;
    vec3 col = mix(srgb2lin(vec3(1.0, 0.55, 0.2)), srgb2lin(vec3(1.0, 0.78, 0.42)), smoothstep(0.7, 0.0, d));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const streakFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float across = smoothstep(0.5, 0.05, abs(vUv.x - 0.5));
    float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
    float alpha = across * along * 0.22 * uIntensity;
    gl_FragColor = vec4(srgb2lin(vec3(1.0, 0.62, 0.26)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const decalVertex = voidVertex;

/** Firelight on the living-room floor: a flickering pool + a reflection streak. */
function FireGlowDecal() {
  const poolMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: poolFragment,
        uniforms: { uIntensity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const streakMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: streakFragment,
        uniforms: { uIntensity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 0.9 + 0.08 * Math.sin(t * 9.3) + 0.05 * Math.sin(t * 23.7 + 1.2);
    poolMat.uniforms.uIntensity.value = atmo.fire * flicker;
    streakMat.uniforms.uIntensity.value = atmo.fire * flicker;
  });
  return (
    <group>
      <mesh position={[-1.6, 0.02, -2.3]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}>
        <planeGeometry args={[2.9, 2.1]} />
      </mesh>
      <mesh position={[-1.6, 0.018, -1.0]} rotation={[-Math.PI / 2, 0, 0]} material={streakMat}>
        <planeGeometry args={[1.1, 2.6]} />
      </mesh>
      <mesh position={[-1.6, 1.35, -3.23]} material={poolMat}>
        <planeGeometry args={[3.4, 2.7]} />
      </mesh>
    </group>
  );
}

/** The living room: shell, rugs, window sky, garden-door view, fire glow, rim. */
function LivingRoom() {
  return (
    <group>
      <VoxMesh build={buildLivingShell} scale={S} />
      <VoxMesh build={buildFireRug} scale={S} meshScale={[1, 0.22, 1]} position={[-2.85, 0, -2.9]} />
      <VoxMesh build={buildCenterRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.2, 0, -0.55]} />
      <SkyBackdrop />
      <GardenDoorView />
      <FireGlowDecal />
      <PlatformFx x0={-3.25} x1={3.25} z0={-3.5} z1={3.25} />
    </group>
  );
}

// ── Bedroom ─────────────────────────────────────────────────────────────────
// A smaller corner room floating to the screen-right (BEDROOM_OFFSET). Floor
// vx -9..8, vz -9..8 (local world x/z -2.25..2.25). Holds the bed; the couple
// walks here for the "feeling romantic" signal.

function buildBedroomShell(v: Vox) {
  buildCornerShell(v, -9, 8, -9, 8);
  // A small framed heart picture on the back wall, right of the bed.
  v.box(3, 6, -10, 4, 4, 1, '#8a5a33'); // frame
  v.box(4, 7, -10, 2, 2, 1, room.frameWhite); // canvas
  v.set(4, 8, -10, '#d0564a');
  v.set(5, 8, -10, '#d0564a');
  v.set(4, 7, -10, '#d0564a');
  v.set(5, 7, -10, '#d0564a');
}

function buildNookRug(v: Vox) {
  stripedRug(v, 6, 5);
}

function Bedroom() {
  return (
    <group position={[...BEDROOM_OFFSET]}>
      <VoxMesh build={buildBedroomShell} scale={S} />
      <VoxMesh build={buildNookRug} scale={S} meshScale={[1, 0.22, 1]} position={[-0.75, 0, -0.3]} />
      {/* Bed against the back wall, centred. */}
      <Bed position={[-0.875, 0, -2.25]} />
      {/* A cosy corner plant + a warm floor lamp. */}
      <Plant position={[1.55, 0, 1.4]} phase={1.3} scale={0.75} />
      <VoxMesh
        scale={S}
        position={[1.55, 0, -1.9]}
        build={(v) => {
          v.box(1, 0, 1, 1, 6, 1, room.woodDark); // lamp post
          v.box(0, 6, 0, 3, 2, 3, room.lamp); // warm shade
        }}
      />
      <PlatformFx x0={-2.5} x1={2.25} z0={-2.5} z1={2.25} />
    </group>
  );
}

// ── Garden ──────────────────────────────────────────────────────────────────
// An open-air platform floating to the screen-left (GARDEN_OFFSET): grass floor,
// low hedges instead of tall walls, trees, flower beds, a pond and a bench. This
// is where the "I need some space" (garden) signal lives; unlocks around a month.

function buildGardenPlatform(v: Vox) {
  const x0 = -9, x1 = 9, z0 = -9, z1 = 9;
  const wx = x0 - 1, wz = z0 - 1;
  const spanX = x1 - wx + 1, spanZ = z1 - wz + 1;
  // Soil plinth.
  v.box(wx, -2, wz, spanX, 1, spanZ, '#5f3d24');
  // Grass floor with a little tonal variation.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const g = (((x * 7 + z * 13) % 5) + 5) % 5;
      v.set(x, -1, z, g === 0 ? '#5e9345' : (x + z) % 2 === 0 ? '#6ba24f' : '#639a49');
    }
  }
  // Low hedges on the back + left edges (waist-high, lighter tops).
  v.box(wx, 0, wz, spanX, 4, 1, '#43733a');
  v.box(wx, 0, wz, 1, 4, spanZ, '#43733a');
  v.box(wx, 4, wz, spanX, 1, 1, '#4f8544');
  v.box(wx, 4, wz, 1, 1, spanZ, '#4f8544');
  // A small pond.
  v.box(3, -1, 3, 4, 1, 4, '#4f86b8');
  v.box(4, -1, 4, 2, 1, 2, '#6aa6d4');
  // Flower beds along the front, dotted with blooms.
  const bloom = ['#e0608a', '#f2c14e', '#f4ecdd', '#c77dd6'];
  for (let i = 0; i < 7; i++) {
    const fx = -7 + i * 2;
    v.set(fx, 0, 8, '#4a7a3e');
    v.set(fx, 1, 8, bloom[(i + fx + 8) % bloom.length]);
  }
}

function buildTree(v: Vox) {
  v.box(1, 0, 1, 2, 6, 2, '#6e4526'); // trunk
  v.box(-1, 5, -1, 6, 5, 6, room.plantLeafDark); // canopy
  v.remove(-1, 5, -1); v.remove(4, 5, -1); v.remove(-1, 5, 4); v.remove(4, 5, 4);
  v.box(0, 9, 0, 4, 3, 4, room.plantLeaf); // rounded top
  v.remove(0, 11, 0); v.remove(3, 11, 0); v.remove(0, 11, 3); v.remove(3, 11, 3);
}

function Garden() {
  return (
    <group position={[...GARDEN_OFFSET]}>
      <VoxMesh build={buildGardenPlatform} scale={S} />
      <VoxMesh build={buildTree} scale={0.24} position={[-1.9, 0, -1.9]} />
      <VoxMesh build={buildTree} scale={0.2} position={[1.2, 0, -1.9]} />
      {/* A garden bench (the "space" signal seats here). */}
      <Bench position={[-2.0, 0, 0.0]} />
      <Plant position={[1.9, 0, 1.9]} phase={3.4} scale={0.7} />
      <PlatformFx x0={-2.5} x1={2.5} z0={-2.5} z1={2.5} />
    </group>
  );
}

// ── Little plank bridges connecting the living room to its neighbours ─────────
function Bridge({ from, to }: { from: [number, number]; to: [number, number] }) {
  const mx = (from[0] + to[0]) / 2;
  const mz = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz) + 0.5;
  const angle = Math.atan2(dz, dx);
  return (
    <group position={[mx, -0.14, mz]} rotation={[0, -angle, 0]}>
      <mesh>
        <boxGeometry args={[len, 0.12, 1.1]} />
        <meshBasicMaterial color={room.doorWood} />
      </mesh>
      <mesh position={[0, 0.08, 0.5]}>
        <boxGeometry args={[len, 0.16, 0.08]} />
        <meshBasicMaterial color={room.woodDark} />
      </mesh>
      <mesh position={[0, 0.08, -0.5]}>
        <boxGeometry args={[len, 0.16, 0.08]} />
        <meshBasicMaterial color={room.woodDark} />
      </mesh>
    </group>
  );
}

/** The whole floating home: the night void + every unlocked room, panned between. */
export function Room() {
  const { components } = useHomeProgress();
  const hasBedroom = components.has('bed');
  const hasGarden = components.has('garden');
  return (
    <group>
      <VoidBackdrop />
      <LivingRoom />
      {hasBedroom && (
        <>
          <Bridge from={[3.0, -3.0]} to={[BEDROOM_OFFSET[0] - 2.2, BEDROOM_OFFSET[2] + 2.0]} />
          <Bedroom />
        </>
      )}
      {hasGarden && (
        <>
          <Bridge from={[-3.2, 2.9]} to={[GARDEN_OFFSET[0] + 2.2, GARDEN_OFFSET[2] - 2.0]} />
          <Garden />
        </>
      )}
    </group>
  );
}
