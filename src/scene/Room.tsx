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

// Floor extent (voxel indices). The back-left corner is fixed at (-14,-14) so
// every wall feature keeps its world coordinates; the house grows toward the
// camera on the two open sides (+x to 5.25, +z to 3.75).
const FX0 = -13;
const FX1 = 20;
const FZ0 = -14;
const FZ1 = 14;
const WALL_H = 14;

function buildShell(v: Vox) {
  // Plinth under the floor (diorama base).
  v.box(FX0, -2, FZ0, FX1 - FX0 + 1, 1, FZ1 - FZ0 + 1, '#5f3d24');
  // Golden brick floor in running bond: each course of bricks is offset half
  // a brick from the previous, with thin darker mortar seams (hero target F).
  for (let x = FX0; x <= FX1; x++) {
    for (let z = FZ0; z <= FZ1; z++) {
      const course = Math.floor((z + 30) / 3); // bands of 2 brick rows + 1 seam
      const gz = ((z % 3) + 3) % 3;
      const offset = (course % 2) * 2; // half-brick offset per course
      const gx = (((x + offset) % 4) + 4) % 4; // bricks 3 long + 1 seam
      if (gz === 2 || gx === 3) {
        v.set(x, -1, z, room.floorGrout);
      } else {
        const brick = (Math.floor((x + offset + 30) / 4) + course) % 2 === 0;
        v.set(x, -1, z, brick ? room.floorA : room.floorB);
      }
    }
  }
  // Back wall (z = -14) and left wall (x = -14), 14 voxels high.
  v.box(-14, 0, -14, FX1 + 15, WALL_H, 1, room.wall);
  v.box(-14, 0, -14, 1, WALL_H, FZ1 + 15, room.wall);
  v.box(-14, -1, -14, FX1 + 15, 1, 1, room.wall);
  v.box(-14, -1, -14, 1, 1, FZ1 + 15, room.wall);
  // Baseboards.
  v.box(FX0, 0, -14, FX1 - FX0 + 1, 1, 1, room.baseboard);
  v.box(-14, 0, -13, 1, 1, FZ1 + 14, room.baseboard);

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

  // Bedroom nook: a low partition dividing the back-right corner from the
  // living room (kept on the far side of the bed so it never occludes it),
  // topped with a trim cap and a warm little lamp lighting the nook.
  v.box(12, 0, -14, 1, 8, 9, room.wall); // world x 3.0-3.25, z -3.5..-1.5, h 2.0
  v.box(12, 8, -14, 1, 1, 9, room.wallShade); // trim cap
  v.box(12, 8, -7, 1, 2, 2, room.lamp); // nook lamp at the front end

  // Big cross-stitch heart picture on the left wall (above the bookshelf).
  v.box(-13, 7, -6, 1, 7, 7, '#8a5a33'); // wooden frame
  v.box(-13, 8, -5, 1, 5, 5, room.frameWhite); // canvas
  const heart: [number, number, string][] = [
    [12, -4, '#d0564a'], [12, -2, '#d0564a'],
    [11, -5, '#a8433a'], [11, -4, '#d0564a'], [11, -3, '#d0564a'], [11, -2, '#d0564a'], [11, -1, '#a8433a'],
    [10, -5, '#a8433a'], [10, -4, '#d0564a'], [10, -3, '#d0564a'], [10, -2, '#d0564a'], [10, -1, '#a8433a'],
    [9, -4, '#a8433a'], [9, -3, '#d0564a'], [9, -2, '#a8433a'],
    [8, -3, '#a8433a'],
  ];
  for (const [y, z, c] of heart) v.set(-12, y, z, c);

  // Little landscape picture above the bench.
  v.box(-13, 8, 1, 1, 5, 6, room.frameWhite);
  v.box(-12, 9, 2, 1, 3, 4, '#7fa8c9');
  v.box(-12, 9, 2, 1, 1, 4, '#59a04c');
  v.set(-12, 11, 4, '#f2ecd5');
}

// Hero-F rugs: cream woven mats with soft horizontal stripes — no loud
// oranges, the rug reads as a pale island on the golden brick floor.
function stripedRug(v: Vox, w: number, d: number) {
  v.box(0, 0, 0, w, 1, d, '#eadcbd');
  for (let z = 1; z < d - 1; z++) {
    for (let x = 1; x < w - 1; x++) {
      v.set(x, 0, z, z % 2 === 0 ? '#e0d0ab' : '#d2c096');
    }
  }
  v.remove(0, 0, 0); v.remove(w - 1, 0, 0); v.remove(0, 0, d - 1); v.remove(w - 1, 0, d - 1);
}

function buildFireRug(v: Vox) {
  stripedRug(v, 10, 8);
}

function buildCenterRug(v: Vox) {
  stripedRug(v, 13, 10);
}

function buildNookRug(v: Vox) {
  stripedRug(v, 6, 5);
}

function buildMoon(v: Vox) {
  // Big full moon with clipped corners and a couple of soft craters (hero F).
  v.box(0, 0, 0, 5, 5, 1, room.moon);
  v.remove(0, 0, 0); v.remove(4, 0, 0); v.remove(0, 4, 0); v.remove(4, 4, 0);
  v.set(1, 3, 0, '#ddd6ba');
  v.set(3, 1, 0, '#d6cfb2');
  v.set(2, 2, 0, '#e6dfc4');
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
      {/* Centered on the upper-left pane so the cross bars don't swallow it. */}
      <VoxMesh build={buildMoon} scale={0.12} jitter={0.02} position={[0.98, 2.12, -3.42]} />
      {/* Distant treeline silhouette along the sill */}
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

// All custom shaders work in linear space like three's built-in materials:
// authored display colors pass through srgb2lin(), and the standard output
// chunks encode exactly once — identical result with or without the PixelPass.
const srgb2lin = /* glsl */ `
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }
`;

const voidFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    // Vertical night gradient with a soft warm hearth-glow near the center.
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

const rimVertex = voidVertex;
const rimFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float d = length((vUv - vec2(0.5)) * 2.0);
    float alpha = smoothstep(1.0, 0.1, d) * 0.28;
    gl_FragColor = vec4(srgb2lin(vec3(1.0, 0.61, 0.24)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * The void around the diorama: gradient night backdrop, ambient star field,
 * and a warm halo under the floating room (hero targets A + F).
 */
function VoidBackdrop() {
  const gradientMat = useMemo(
    () =>
      new THREE.ShaderMaterial({ vertexShader: voidVertex, fragmentShader: voidFragment }),
    []
  );
  const rimMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rimVertex,
        fragmentShader: rimFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const stars = useMemo(() => {
    // Stars scattered on a plane facing the camera, behind the room.
    const geo = new THREE.BufferGeometry();
    const count = 110;
    const pos = new Float32Array(count * 3);
    const rx = 0.7071; // in-plane right vector (cos45, 0, -sin45)
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * 26;
      const yy = -2.5 + Math.random() * 13;
      pos[i * 3] = -4.8 + u * rx;
      pos[i * 3 + 1] = yy;
      pos[i * 3 + 2] = -4.8 - u * rx;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* Oversized so no screen aspect can see past its edges (the raw
          scene.background would peek through as a flat band otherwise). */}
      <mesh position={[-5.5, 0.4, -5.5]} rotation={[0, Math.PI / 4, 0]} material={gradientMat}>
        <planeGeometry args={[44, 30]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#c9d2e8" size={0.055} sizeAttenuation transparent opacity={0.85} />
      </points>
      {/* Warm halo under the floating diorama */}
      <mesh position={[0.9, -0.62, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={rimMat}>
        <planeGeometry args={[15, 11]} />
      </mesh>
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

const decalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Firelight on the floor: a flickering warm pool by the hearth plus a soft
 * "reflection" streak reaching into the room (fakes target F's glossy floor).
 */
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
    []
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
    []
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
      {/* Streak points from the hearth toward the open room (+z) */}
      <mesh
        position={[-1.6, 0.018, -1.0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={streakMat}
      >
        <planeGeometry args={[1.1, 2.6]} />
      </mesh>
      {/* Warm wash climbing the back wall around the fireplace */}
      <mesh position={[-1.6, 1.35, -3.23]} material={poolMat}>
        <planeGeometry args={[3.4, 2.7]} />
      </mesh>
    </group>
  );
}

// Neon-blue rim tracing the two camera-facing edges of the floating plinth,
// with a soft glow bleeding down into the void (hero target F).
const RIM_BLUE = '#37c4ff';

const rimGlowFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    // Brightest right at the edge (top), fading down AND toward both ends so
    // it reads as a soft halo, not a hard rectangle or a column at the corner.
    float down = smoothstep(0.0, 1.0, vUv.y);
    float ends = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float a = down * down * ends * 0.6;
    gl_FragColor = vec4(srgb2lin(vec3(0.24, 0.72, 1.0)), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * The blue rim-light on the plinth. Two bright edge bars sit on the exposed
 * bottom edges of the base slab; two additive glow planes hang just outside
 * those faces and fade downward, so the diorama reads as a lit dollhouse
 * floating in the night.
 */
function PlinthRim() {
  const glowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: rimGlowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Plinth spans world x -3.25..5.25, z -3.5..3.75; base slab bottom ≈ y -0.5.
  // The +x and +z faces meet at the near corner facing the camera.
  const EDGE_Y = -0.33;
  return (
    <group>
      {/* Bright edge bars (unlit — the warm global tint never touches these). */}
      <mesh position={[1.0, EDGE_Y, 3.77]}>
        <boxGeometry args={[8.52, 0.06, 0.04]} />
        <meshBasicMaterial color={RIM_BLUE} toneMapped={false} />
      </mesh>
      <mesh position={[5.27, EDGE_Y, 0.125]}>
        <boxGeometry args={[0.04, 0.06, 7.27]} />
        <meshBasicMaterial color={RIM_BLUE} toneMapped={false} />
      </mesh>
      {/* Soft glow hugging each edge and fading down into the void. Kept short
          and inset from the near corner so the two don't stack into a column. */}
      <mesh position={[0.85, -0.72, 3.83]} material={glowMat}>
        <planeGeometry args={[8.0, 0.95]} />
      </mesh>
      <mesh position={[5.33, -0.72, -0.02]} rotation={[0, Math.PI / 2, 0]} material={glowMat}>
        <planeGeometry args={[7.0, 0.95]} />
      </mesh>
    </group>
  );
}

/** The room shell: floor, two walls, openings, rugs, backdrops, decals. */
export function Room() {
  return (
    <group>
      <VoxMesh build={buildShell} scale={S} />
      <VoxMesh build={buildFireRug} scale={S} meshScale={[1, 0.22, 1]} position={[-2.85, 0, -2.9]} />
      <VoxMesh build={buildCenterRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.2, 0, -0.55]} />
      <VoxMesh build={buildNookRug} scale={S} meshScale={[1, 0.22, 1]} position={[3.6, 0, -1.3]} />
      <VoidBackdrop />
      <SkyBackdrop />
      <GardenBackdrop />
      <FireGlowDecal />
      <PlinthRim />
    </group>
  );
}
