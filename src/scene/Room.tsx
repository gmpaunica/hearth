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
  // Honey tile floor: 2x2 tiles with thin grout seams (hero target F).
  for (let x = -13; x <= 12; x++) {
    for (let z = -14; z <= 12; z++) {
      const gx = ((x % 3) + 3) % 3;
      const gz = ((z % 3) + 3) % 3;
      if (gx === 2 || gz === 2) {
        v.set(x, -1, z, '#a87844'); // grout
      } else {
        const tile = (Math.floor((x + 30) / 3) + Math.floor((z + 30) / 3)) % 2 === 0;
        v.set(x, -1, z, tile ? room.floorA : room.floorB);
      }
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

function buildFireRug(v: Vox) {
  // 10 x 8 rug: cream border with a warm checker weave (hero target B).
  v.box(0, 0, 0, 10, 1, 8, '#e8d4a8');
  for (let x = 1; x < 9; x++) {
    for (let z = 1; z < 7; z++) {
      v.set(x, 0, z, (x + z) % 2 === 0 ? '#c2703a' : '#d98e4f');
    }
  }
  v.remove(0, 0, 0); v.remove(9, 0, 0); v.remove(0, 0, 7); v.remove(9, 0, 7);
}

function buildCenterRug(v: Vox) {
  v.box(0, 0, 0, 12, 1, 10, '#e8d4a8');
  v.box(1, 0, 1, 10, 1, 8, '#c2703a');
  v.box(2, 0, 2, 8, 1, 6, '#d98e4f');
  v.remove(0, 0, 0); v.remove(11, 0, 0); v.remove(0, 0, 9); v.remove(11, 0, 9);
}

function buildMoon(v: Vox) {
  // Crescent moon (C-shape opening to the right).
  v.set(0, 0, 0, room.moon); v.set(1, 0, 0, room.moon);
  v.set(0, 1, 0, room.moon);
  v.set(0, 2, 0, room.moon);
  v.set(0, 3, 0, room.moon); v.set(1, 3, 0, room.moon);
  v.set(2, 3, 0, room.moon); v.set(2, 0, 0, room.moon);
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
      <VoxMesh build={buildMoon} scale={0.12} jitter={0.02} position={[1.12, 2.18, -3.42]} />
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

const voidFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Vertical night gradient with a soft warm hearth-glow near the center.
    vec3 top = vec3(0.055, 0.078, 0.16);
    vec3 bottom = vec3(0.10, 0.13, 0.25);
    vec3 col = mix(bottom, top, vUv.y);
    float d = length(vec2((vUv.x - 0.5) * 1.6, (vUv.y - 0.42) * 1.2));
    col = mix(col, vec3(0.16, 0.15, 0.24), smoothstep(0.55, 0.0, d));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const rimVertex = voidVertex;
const rimFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length((vUv - vec2(0.5)) * 2.0);
    float alpha = smoothstep(1.0, 0.1, d) * 0.28;
    gl_FragColor = vec4(1.0, 0.61, 0.24, alpha);
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
      <mesh position={[-5.5, 2.4, -5.5]} rotation={[0, Math.PI / 4, 0]} material={gradientMat}>
        <planeGeometry args={[34, 22]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#c9d2e8" size={0.055} sizeAttenuation transparent opacity={0.85} />
      </points>
      {/* Warm halo under the floating diorama */}
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} material={rimMat}>
        <planeGeometry args={[11, 9]} />
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

const poolFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length((vUv - vec2(0.5)) * 2.0);
    float alpha = smoothstep(1.0, 0.05, d) * 0.34 * uIntensity;
    vec3 col = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.78, 0.42), smoothstep(0.7, 0.0, d));
    gl_FragColor = vec4(col, alpha);
  }
`;

const streakFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float across = smoothstep(0.5, 0.05, abs(vUv.x - 0.5));
    float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
    float alpha = across * along * 0.22 * uIntensity;
    gl_FragColor = vec4(1.0, 0.62, 0.26, alpha);
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

/** The room shell: floor, two walls, openings, rugs, backdrops, decals. */
export function Room() {
  return (
    <group>
      <VoxMesh build={buildShell} scale={S} />
      <VoxMesh build={buildFireRug} scale={S} meshScale={[1, 0.22, 1]} position={[-2.85, 0, -2.9]} />
      <VoxMesh build={buildCenterRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.2, 0, -0.55]} />
      <VoidBackdrop />
      <SkyBackdrop />
      <GardenBackdrop />
      <BedroomBackdrop />
      <FireGlowDecal />
    </group>
  );
}
