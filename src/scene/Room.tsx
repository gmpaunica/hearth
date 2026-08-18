import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useHomeProgress } from '@/state/homeProgress';
import { useSceneStore } from '@/state/sceneStore';
import { room } from '@/theme/hearth';
import { atmo } from './atmoState';
import { LockedBedroom, LockedGarden } from './LockedRoom';
import { Bed } from './objects/Bed';
import { Bench } from './objects/Bench';
import { PlatformFx } from './PlatformFx';
import {
  BEDROOM_OFFSET,
  GARDEN_OFFSET,
  LIVING_BOUNDS,
  ROOM_SOCKETS,
  S,
  buildCornerShell,
} from './shell';
import { VoxMesh } from './VoxMesh';
import { Vox } from './voxel';

// The living room is the hub of one connected dollhouse. The bedroom meets its
// back wall through a shared arch; the garden sits beyond a narrow west path.
// No long bridge or hallway geometry crosses a room shell.

// ── Living room ─────────────────────────────────────────────────────────────
// Floor: vx -17..20, vz -17..16. The extra width keeps the dining set, sofa,
// daily drawing, and bedroom socket in distinct readable zones.

function buildLivingShell(v: Vox) {
  const { floorX0, floorX1, floorZ0, floorZ1, wallX, wallZ } = LIVING_BOUNDS;
  // A layered, carved plinth keeps the room feeling like a crafted miniature
  // instead of a single floating slab.
  v.box(floorX0, -3, floorZ0, floorX1 - floorX0 + 1, 2, floorZ1 - floorZ0 + 1, '#5a3525');
  v.box(floorX0 + 1, -4, floorZ0 + 1, floorX1 - floorX0 - 1, 1, floorZ1 - floorZ0 - 1, '#3f2a22');
  for (let x = floorX0; x <= floorX1; x += 3) v.set(x, -2, floorZ1, '#9b593b');
  for (let z = floorZ0; z <= floorZ1; z += 3) v.set(floorX1, -2, z, '#81462f');

  // Sun-warmed terracotta floor in a small running bond. A handful of pale
  // tiles makes the broad floor read as handmade rather than procedural.
  for (let x = floorX0; x <= floorX1; x++) {
    for (let z = floorZ0; z <= floorZ1; z++) {
      const course = Math.floor((z + 30) / 3);
      const gz = ((z % 3) + 3) % 3;
      const offset = (course % 2) * 2;
      const gx = (((x + offset) % 4) + 4) % 4;
      if (gz === 2 || gx === 3) {
        v.set(x, -1, z, '#9d6543');
      } else {
        const brick = (Math.floor((x + offset + 30) / 4) + course) % 2 === 0;
        const worn = ((x * 11 + z * 7) % 23 + 23) % 23 === 0;
        v.set(x, -1, z, worn ? '#d7a777' : brick ? '#c9875f' : '#bb7553');
      }
    }
  }
  // Warm plaster walls with shaded lower panels and a terracotta coping. The
  // stepped roofline is a key silhouette from the approved visual reference.
  v.box(wallX, 0, wallZ, floorX1 - wallX + 1, 15, 1, '#efd8bd');
  v.box(wallX, 0, wallZ, 1, 15, floorZ1 - wallZ + 1, '#e6c8ab');
  v.box(wallX, -1, wallZ, floorX1 - wallX + 1, 1, 1, room.wall);
  v.box(wallX, -1, wallZ, 1, 1, floorZ1 - wallZ + 1, room.wall);
  v.box(floorX0, 0, wallZ + 1, floorX1 - floorX0 + 1, 2, 1, '#9d6447');
  v.box(wallX + 1, 0, floorZ0, 1, 2, floorZ1 - floorZ0 + 1, '#8e593f');
  v.box(wallX, 15, wallZ, floorX1 - wallX + 1, 2, 2, '#9d4f39');
  v.box(wallX, 15, wallZ, 2, 2, floorZ1 - wallZ + 1, '#8f4735');
  for (let x = wallX; x <= floorX1; x += 4) v.box(x, 17, wallZ, 3, 1, 2, '#b55d45');
  for (let z = wallZ; z <= floorZ1; z += 4) v.box(wallX, 17, z, 2, 1, 3, '#a8523e');

  // Keep one quiet timber upright on the back wall. The former left-wall
  // uprights crossed the daily painting and the garden opening.
  for (const x of [-11, 8]) v.box(x, 2, wallZ + 1, 1, 12, 1, '#b77a58');
  v.box(wallX + 1, 2, -8, 1, 12, 1, '#a86d50');

  // West garden socket, inset from the open corner so it reads as architecture.
  const gardenSocket = ROOM_SOCKETS.garden;
  v.remove(wallX, 0, gardenSocket.start, 1, 10, gardenSocket.width);
  v.box(wallX, 0, gardenSocket.start - 1, 2, 12, 1, '#8b5138');
  v.box(wallX, 0, gardenSocket.start + gardenSocket.width, 2, 12, 1, '#8b5138');
  v.box(wallX, 10, gardenSocket.start, 2, 2, gardenSocket.width, '#9e6043');
  v.set(wallX + 1, 9, gardenSocket.start, '#c97a59');
  v.set(wallX + 1, 9, gardenSocket.start + gardenSocket.width - 1, '#c97a59');

  // The bedroom shares this back wall. A stepped top makes the wide opening
  // read as an arch rather than a freestanding door frame in the corner.
  const bedroomSocket = ROOM_SOCKETS.bedroom;
  v.remove(bedroomSocket.start, 0, wallZ, bedroomSocket.width, 10, 1);
  v.box(bedroomSocket.start - 1, 0, wallZ, 1, 12, 2, '#9b5f45');
  v.box(bedroomSocket.start + bedroomSocket.width, 0, wallZ, 1, 12, 2, '#9b5f45');
  v.box(bedroomSocket.start, 10, wallZ, bedroomSocket.width, 2, 2, '#aa6a4d');
  v.set(bedroomSocket.start, 9, wallZ + 1, '#d18b67');
  v.set(bedroomSocket.start + bedroomSocket.width - 1, 9, wallZ + 1, '#d18b67');

  // Raise the window base above the coral sofa so the furniture no longer
  // reads as if it enters the opening.
  v.remove(-2, 7, wallZ, 8, 6, 1);
  v.box(-3, 6, wallZ, 10, 1, 2, '#865039');
  v.box(-3, 13, wallZ, 10, 2, 2, '#9e6042');
  v.box(-3, 7, wallZ, 1, 6, 2, '#865039');
  v.box(6, 7, wallZ, 1, 6, 2, '#865039');
  v.box(1, 7, wallZ, 1, 6, 2, '#9e6042');
  v.box(-2, 10, wallZ, 8, 1, 2, '#9e6042');
  // A slim, empty sill keeps the opening architectural without window plants.
  v.box(-3, 6, wallZ + 1, 10, 1, 2, '#9a603f');

  // Keep this wall quiet. The freestanding bookshelf and daily drawing are
  // the two intentional focal points, with a full plaster bay between them.
}

function buildFireRug(v: Vox) {
  v.box(0, 0, 0, 11, 1, 9, '#e9c9ad');
  for (let x = 1; x < 10; x++) for (let z = 1; z < 8; z++) {
    const border = x === 1 || x === 9 || z === 1 || z === 7;
    v.set(x, 0, z, border ? '#b96855' : ((x + z) % 4 === 0 ? '#d99378' : '#f2dcc4'));
  }
  for (const [x, z] of [[0, 0], [10, 0], [0, 8], [10, 8]]) v.remove(x, 0, z);
}
function buildCenterRug(v: Vox) {
  v.box(0, 0, 0, 14, 1, 10, '#dac5a1');
  for (let x = 1; x < 13; x++) for (let z = 1; z < 9; z++) {
    const diamond = (Math.abs(x - 6.5) + Math.abs(z - 4.5)) % 4 < 1.2;
    v.set(x, 0, z, diamond ? '#9aa06d' : (x + z) % 2 ? '#ead9bb' : '#e3cdae');
  }
  for (const [x, z] of [[0, 0], [13, 0], [0, 9], [13, 9]]) v.remove(x, 0, z);
}

function buildSun(v: Vox) {
  v.box(0, 0, 0, 6, 6, 1, '#ffd98d');
  for (const [x, y] of [[0, 0], [5, 0], [0, 5], [5, 5], [0, 1], [5, 1], [0, 4], [5, 4]]) v.remove(x, y, 0);
  v.box(2, 2, 1, 2, 2, 1, '#fff1bd');
}

// With a fixed orthographic camera there's no parallax, so each wall opening's
// "outside" is painted flat inside it — it can never leak past the wall.

/** Peach sunrise filling the window opening: the main in-world light source. */
function SkyBackdrop() {
  const skyMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.outsideSky; // live reference
    return m;
  }, []);
  return (
    <group>
      <mesh position={[0.5, 2.5, -4.46]} material={skyMat}>
        <planeGeometry args={[2.0, 1.5]} />
      </mesh>
      <mesh position={[0.5, 2.5, -4.425]}>
        <planeGeometry args={[1.95, 1.45]} />
        <meshBasicMaterial
          color="#ffd28a"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <VoxMesh build={buildSun} scale={0.1} jitter={0.015} position={[0.73, 2.65, -4.42]} />
      <VoxMesh
        scale={0.08}
        jitter={0.03}
        position={[-0.19, 1.77, -4.42]}
        build={(v) => {
          const heights = [2, 3, 2, 4, 3, 2, 3, 5, 3, 2, 3, 2, 4, 2, 3, 2, 2];
          for (let i = 0; i < heights.length; i++) v.box(i, 0, 0, 1, heights[i], 1, i % 3 ? '#9c8062' : '#b39977');
        }}
      />
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
  uniform float uMood;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    vec3 warmTop = vec3(0.985, 0.925, 0.84);
    vec3 warmBottom = vec3(0.94, 0.74, 0.63);
    vec3 coolTop = vec3(0.80, 0.79, 0.79);
    vec3 coolBottom = vec3(0.43, 0.46, 0.50);
    vec3 top = srgb2lin(mix(warmTop, coolTop, uMood));
    vec3 bottom = srgb2lin(mix(warmBottom, coolBottom, uMood));
    float vertical = smoothstep(0.42, 0.58, vUv.y);
    vec3 col = mix(bottom, top, vertical);
    float d = length(vec2((vUv.x - 0.5) * 1.25, (vUv.y - 0.46) * 1.15));
    col = mix(col, srgb2lin(mix(vec3(1.0, 0.96, 0.9), vec3(0.84, 0.84, 0.85), uMood)), smoothstep(0.72, 0.05, d) * 0.55);
    col = mix(col, srgb2lin(mix(vec3(0.88, 0.58, 0.48), vec3(0.38, 0.43, 0.48), uMood)), smoothstep(0.56, 1.0, d) * 0.12);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Warm editorial backdrop behind the floating home: cream haze + dust motes. */
function VoidBackdrop() {
  const gradientMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: voidVertex,
        fragmentShader: voidFragment,
        uniforms: { uMood: { value: 0 } },
        // This is scenery, not world geometry. It must never write depth or
        // hide a room that extends behind its plane.
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  useFrame((_state, delta) => {
    const mode = useSceneStore.getState().atmosphere;
    const target = mode === 'warm' ? 0 : mode === 'cool' ? 0.58 : 1;
    // Three shader uniforms are intentionally updated in the render loop.
    // eslint-disable-next-line react-hooks/immutability
    gradientMat.uniforms.uMood.value = THREE.MathUtils.damp(
      gradientMat.uniforms.uMood.value,
      target,
      2.6,
      Math.min(delta, 0.1),
    );
  });
  const dust = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 90;
    const pos = new Float32Array(count * 3);
    const rx = 0.7071; // in-plane right vector (cos45, 0, -sin45)
    for (let i = 0; i < count; i++) {
      const seed = ((i * 73) % 97) / 97;
      const seedB = ((i * 47 + 19) % 89) / 89;
      const u = (seed - 0.5) * 42;
      const yy = -2 + seedB * 16;
      pos[i * 3] = -18 + u * rx;
      pos[i * 3 + 1] = yy;
      pos[i * 3 + 2] = -18 - u * rx;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);
  return (
    <group>
      {/* Keep the same projected centre, but move the plane from x+z=-9 to
          x+z=-33—fully behind every room. Negative render order draws it first. */}
      <mesh
        position={[-12, 0.4, -21]}
        rotation={[0, Math.PI / 4, 0]}
        material={gradientMat}
        renderOrder={-1000}
      >
        <planeGeometry args={[100, 100]} />
      </mesh>
      <points geometry={dust} renderOrder={-999}>
        <pointsMaterial
          color="#f4b28f"
          size={0.075}
          sizeAttenuation
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </points>
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

const sunbeamFragment = /* glsl */ `
  uniform float uShimmer;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
    float travel = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.32, vUv.y);
    float ribs = 0.82 + 0.18 * sin((vUv.x * 4.0 + vUv.y * 0.5) * 3.14159);
    float alpha = edge * travel * ribs * (0.12 + uShimmer * 0.018);
    vec3 col = srgb2lin(mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.9, 0.66), vUv.y));
    gl_FragColor = vec4(col, alpha);
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
    // Three shader uniforms are intentionally updated in the render loop.
    // eslint-disable-next-line react-hooks/immutability
    poolMat.uniforms.uIntensity.value = atmo.fire * flicker;
    // eslint-disable-next-line react-hooks/immutability
    streakMat.uniforms.uIntensity.value = atmo.fire * flicker;
  });
  return (
    <group>
      <mesh position={[-2.2, 0.02, -3.15]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}>
        <planeGeometry args={[2.9, 2.1]} />
      </mesh>
      <mesh position={[-2.2, 0.018, -1.85]} rotation={[-Math.PI / 2, 0, 0]} material={streakMat}>
        <planeGeometry args={[1.1, 2.6]} />
      </mesh>
      <mesh position={[-2.2, 1.35, -4.23]} material={poolMat}>
        <planeGeometry args={[3.4, 2.7]} />
      </mesh>
    </group>
  );
}

/** Broad, quiet shafts from the hero window. They are translucent decals—not
 * dynamic lights—so the look remains stable on Expo GL and older phones. */
function WindowSunbeams() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: sunbeamFragment,
        uniforms: { uShimmer: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame((state) => {
    // Three shader uniforms are intentionally updated in the render loop.
    // eslint-disable-next-line react-hooks/immutability
    material.uniforms.uShimmer.value = atmo.reduceMotion
      ? 0
      : 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.42);
  });
  return (
    <group>
      <mesh position={[0.45, 0.028, -2.35]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[2.45, 4.5]} />
      </mesh>
      <mesh position={[0.45, 2.5, -4.28]} material={material}>
        <planeGeometry args={[2.15, 1.5]} />
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
      <FireGlowDecal />
      <WindowSunbeams />
      <PlatformFx x0={-4.5} x1={5.25} z0={-4.5} z1={4.25} />
    </group>
  );
}

function buildGardenArch(v: Vox) {
  // Deep timber posts and a short pergola frame the existing single-owner
  // floor. The former y=-1 step boxes overlapped both room floors at y=0 and
  // produced coplanar flicker immediately outside the doorway.
  v.box(0, 0, 0, 2, 11, 2, '#754830');
  v.box(0, 0, 5, 2, 11, 2, '#754830');
  v.box(-4, 10, 0, 7, 2, 7, '#865238');
  for (let x = -4; x <= 2; x += 2) v.box(x, 12, -1, 1, 1, 9, '#a56547');
  // Climbing foliage wraps around—not across—the opening.
  v.box(-1, 2, -1, 2, 8, 2, '#416e3a');
  v.box(-1, 1, 6, 2, 9, 2, '#4e7d43');
  v.box(-3, 9, 0, 5, 3, 7, '#527f43');
  for (const [x, y, z, c] of [
    [-2, 8, 0, '#f3a7bc'], [-1, 5, 6, '#efc85e'], [-3, 10, 3, '#f7e9dc'],
    [1, 8, 6, '#e78b9f'], [-4, 11, 1, '#ffd58a'], [-3, 9, 6, '#f5c2cf'],
  ] as const) v.set(x, y, z, c);
}

function GardenPassage() {
  return (
    <VoxMesh build={buildGardenArch} scale={S} position={[-4.5, 0, 2.25]} />
  );
}

function buildBedroomThreshold(v: Vox) {
  v.box(0, -1, 0, 6, 1, 2, room.doorWood);
  v.box(0, -1, 0, 6, 1, 1, room.woodDark);
}

// ── Bedroom ─────────────────────────────────────────────────────────────────
// A smaller room behind and to the right. Its open front edge meets the living
// back wall exactly at the bedroom socket, so both modules read as one house.

function buildBedroomShell(v: Vox) {
  buildCornerShell(v, -10, 9, -10, 8);
  // A quiet blush-clay palette separates the private room at a glance while
  // sharing the same sun-warmed material family as the rest of the house.
  for (let x = -10; x <= 9; x++) {
    for (let z = -10; z <= 8; z++) {
      const border = x === -10 || x === 9 || z === -10 || z === 8;
      v.set(x, -1, z, border ? '#925d56' : (x + z) % 2 === 0 ? '#c8897e' : '#bb7d73');
    }
  }
  v.box(-11, -3, -11, 21, 2, 20, '#54352c');
  v.box(-11, 0, -11, 21, 15, 1, '#efd9c7');
  // The wall shared with the living-room junction uses the living wall color.
  // Its final front cell is omitted so it cannot overlap the living back wall.
  v.box(-11, 0, -11, 1, 15, 19, '#e4c2b0');
  v.remove(-11, 0, 8, 1, 15, 1);
  v.box(-10, 0, -10, 20, 2, 1, '#985c53');
  v.box(-10, 15, -11, 20, 2, 2, '#9c503f');
  v.box(-11, 15, -10, 2, 2, 18, '#8f493b');
  for (let x = -10; x <= 9; x += 4) v.box(x, 17, -11, 3, 1, 2, '#b8624b');

  // Amber window kept deliberately empty so the compact bedroom stays calm.
  v.remove(-8, 6, -11, 6, 7, 1);
  v.box(-9, 5, -11, 8, 1, 2, '#84503b');
  v.box(-9, 13, -11, 8, 1, 2, '#9a6046');
  v.box(-9, 6, -11, 1, 7, 2, '#84503b');
  v.box(-2, 6, -11, 1, 7, 2, '#84503b');
  v.box(-5, 6, -11, 1, 7, 2, '#985e42');
  v.box(-8, 9, -11, 6, 1, 2, '#985e42');
}

function buildNookRug(v: Vox) {
  v.box(0, 0, 0, 12, 1, 9, '#f0d6c4');
  for (let x = 1; x < 11; x++) for (let z = 1; z < 8; z++) {
    const stripe = (x + Math.floor(z / 2)) % 4 === 0;
    v.set(x, 0, z, stripe ? '#b97877' : (z % 3 === 0 ? '#ddafa3' : '#ead0bd'));
  }
  for (const [x, z] of [[0, 0], [11, 0], [0, 8], [11, 8]]) v.remove(x, 0, z);
}

function Bedroom() {
  return (
    <group position={[...BEDROOM_OFFSET]}>
      <VoxMesh build={buildBedroomShell} scale={S} />
      <mesh position={[-1.37, 2.35, -2.79]}>
        <planeGeometry args={[1.45, 1.7]} />
        <meshBasicMaterial color="#ffd89a" toneMapped={false} />
      </mesh>
      <VoxMesh build={buildNookRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.25, 0, -0.75]} />
      {/* Bed and storage stay on the far wall, leaving the sightline open. */}
      <Bed position={[-0.875, 0, -2.25]} />
      <VoxMesh
        scale={0.18}
        position={[-2.05, 0, -2.0]}
        build={(v) => {
          v.box(0, 0, 0, 4, 3, 3, '#754830');
          v.box(-1, 3, -1, 6, 1, 5, '#9b6041');
          v.box(1, 1, 3, 2, 1, 1, '#c58d63');
          v.box(1, 4, 1, 2, 2, 2, '#e6c8aa');
          v.set(1, 6, 1, '#ffc977');
        }}
      />
      {/* Narrow wardrobe is flush with the back wall, not the near corner. */}
      <VoxMesh
        scale={0.2}
        position={[1.2, 0, -2.25]}
        build={(v) => {
          v.box(0, 0, 0, 5, 11, 4, '#75472f');
          v.box(-1, 11, -1, 7, 1, 6, '#955a3b');
          v.box(1, 1, 4, 1, 8, 1, '#9e6549');
          v.box(3, 1, 4, 1, 8, 1, '#9e6549');
          v.box(2, 1, 4, 1, 8, 1, '#5f3b2d');
          v.set(1, 5, 5, '#dfb26e');
          v.set(3, 5, 5, '#dfb26e');
          v.box(0, 0, 4, 5, 1, 1, '#5e392b');
        }}
      />
      <PlatformFx x0={-2.75} x1={2.5} z0={-2.75} z1={2.25} showFrontEdge={false} />
    </group>
  );
}

// ── Garden ──────────────────────────────────────────────────────────────────
// An open-air west garden with distinct tree, seating and pond zones separated
// by broad areas of usable lawn.

function buildGardenPlatform(v: Vox) {
  // Expand away from the house; the east edge remains fixed at the doorway.
  const x0 = -32, x1 = 12, z0 = -24, z1 = 20;
  const wx = x0 - 1, wz = z0 - 1;
  const spanX = x1 - wx + 1, spanZ = z1 - wz + 1;
  // Layered soil and stone strata make the floating cutaway feel substantial.
  v.box(wx, -4, wz, spanX, 3, spanZ, '#54362a');
  v.box(wx + 1, -5, wz + 1, spanX - 2, 1, spanZ - 2, '#3e2b25');
  for (let x = wx; x < x1; x += 3) v.set(x, -2, z1, x % 2 ? '#7d4c36' : '#936044');
  for (let z = wz; z < z1; z += 3) v.set(x1, -2, z, z % 2 ? '#754632' : '#8a563d');

  // Olive grass with deterministic patches of sunlit moss.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const g = (((x * 7 + z * 13) % 11) + 11) % 11;
      const threshold = x >= 10 && z >= 0 && z <= 3;
      const color = threshold
        ? ((x + z) % 2 === 0 ? '#d7b392' : '#e6c9a7')
        : g === 0 ? '#8f9955' : g < 3 ? '#788b49' : (x + z) % 2 === 0 ? '#6f8244' : '#667a3e';
      v.set(x, -1, z, color);
    }
  }
  // A restrained low hedge frames the three outer edges without becoming a
  // second wall. Keeping it low preserves the enlarged lawn's visual depth.
  v.box(wx, 0, wz, spanX - 1, 3, 2, '#3f6638');
  v.box(wx, 0, wz, 2, 3, spanZ, '#395f35');
  v.box(wx, 3, wz, spanX - 1, 1, 2, '#5f7c43');
  v.box(wx, 3, wz, 2, 1, spanZ, '#56743f');
  v.box(x0, 0, z1, x1 - x0 + 1, 2, 2, '#42693a');
  v.box(x0, 2, z1, x1 - x0 + 1, 1, 2, '#5e7d44');
  // The living room owns the east boundary through local z=7, including the
  // doorway. The short exposed tail is the only place this hedge should exist.
  const exposedEastZ = 8;
  v.box(x1, 0, exposedEastZ, 2, 3, z1 - exposedEastZ + 1, '#42693a');
  v.box(x1, 3, exposedEastZ, 2, 1, z1 - exposedEastZ + 1, '#5e7d44');
  // One legible walk connects the doorway and shared bench. It intentionally
  // does not branch into every corner; open grass is part of the composition.
  const stones: readonly [number, number, number, number][] = [
    [10, 0, 3, 2], [7, 0, 2, 2], [4, -1, 3, 2], [1, -1, 2, 2],
    [-2, -2, 3, 2], [-5, -2, 2, 2], [-8, -1, 3, 2], [-11, 0, 2, 2],
    [-14, 0, 3, 2], [-17, 1, 2, 2], [-20, 2, 3, 2],
  ];
  stones.forEach(([x, z, w, d], index) => {
    v.box(x, 0, z, w, 1, d, index % 3 === 0 ? '#e2c6a3' : index % 3 === 1 ? '#cfaa88' : '#edd6b7');
    if (w === 3) v.set(x + 1, 1, z, '#f1dcc0');
  });

  // Four distant planting pockets soften the corners while keeping the middle
  // of the garden empty enough for future expansion and easy navigation.
  for (const [x, z, tone] of [
    [-28, -20, '#54723e'], [6, -20, '#607d43'],
    [-28, 15, '#66854a'], [7, 15, '#58743f'],
  ] as const) {
    v.box(x, 0, z, 4, 2, 3, tone);
    v.remove(x, 1, z); v.remove(x + 3, 1, z + 2);
  }
  // Sparse border flowers replace the former continuous ribbon of blooms.
  const bloom = ['#e0608a', '#f2c14e', '#f4ecdd', '#c77dd6'];
  const flowerSpots: readonly [number, number][] = [
    [-29, -22], [-20, -22], [-10, -22], [0, -22], [8, -22],
    [-30, -12], [-30, 0], [-30, 12],
    [-26, 18], [-15, 18], [-4, 18], [8, 18],
  ];
  flowerSpots.forEach(([x, z], index) => {
    v.set(x, 0, z, '#4a7a3e');
    v.box(x, 1, z, 1, 1 + (index % 2), 1, '#5d8248');
    v.set(x, 2 + (index % 2), z, bloom[index % bloom.length]);
  });
}

const POND_ROWS = [
  '00002222222220000',
  '00221111111112200',
  '02111111111111120',
  '21111111111111112',
  '21111111111111112',
  '21111111111111112',
  '21111111111111112',
  '21111111111111112',
  '02111111111111120',
  '00221111111112200',
  '00002222222220000',
] as const;

function buildKoiPond(v: Vox) {
  POND_ROWS.forEach((row, z) => {
    [...row].forEach((cell, x) => {
      if (cell === '1') {
        v.set(x, -1, z, '#3f7180');
        v.set(x, 0, z, (x + z) % 3 === 0 ? '#69a7ad' : '#7bb8b7');
      }
      if (cell === '2') {
        v.set(x, -1, z, '#806d55');
        v.set(x, 0, z, (x + z) % 2 === 0 ? '#cbb28c' : '#a98f70');
        if ((x * 3 + z) % 7 === 0) v.set(x, 1, z, '#dfc7a4');
      }
    });
  });
  for (const [x, z] of [[3, 4], [4, 4], [12, 7], [13, 7], [9, 3]]) v.set(x, 1, z, '#648b4b');
  v.set(13, 2, 7, '#f3a8bd');
  v.set(9, 2, 3, '#f6e5cb');
  for (const [x, z, h] of [[1, 3, 3], [2, 8, 2], [15, 4, 3], [14, 9, 2]] as const) {
    v.box(x, 1, z, 1, h, 1, '#58754a');
    v.set(x, h + 1, z, '#bd814c');
  }
  for (const [x, z] of [[6, 2], [10, 8], [12, 3]]) v.set(x, 1, z, '#c8e6d8');
}

const pondFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
      * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float ripple = sin((vUv.x * 13.0 + vUv.y * 7.0) + uTime) * 0.5 + 0.5;
    float ribbon = smoothstep(0.72, 1.0, ripple) * edge;
    vec3 col = srgb2lin(mix(vec3(0.64, 0.87, 0.8), vec3(1.0, 0.91, 0.7), vUv.y));
    gl_FragColor = vec4(col, ribbon * 0.16);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function paintKoi(v: Vox, body: string, patch: string) {
  v.set(0, 0, 0, patch);
  v.set(0, 0, 1, patch);
  v.box(1, 0, 0, 3, 1, 2, body);
  v.set(2, 1, 0, patch);
  v.set(3, 0, 0, '#f8ead9');
}

function buildSunsetKoi(v: Vox) {
  paintKoi(v, '#ef7d55', '#fff0dc');
}

function buildBlushKoi(v: Vox) {
  paintKoi(v, '#f6d7c7', '#e66f75');
}

function buildGoldenKoi(v: Vox) {
  paintKoi(v, '#f2bd52', '#fff1be');
}

function buildIvoryKoi(v: Vox) {
  paintKoi(v, '#f7ead8', '#e36f5d');
}

function buildRoseKoi(v: Vox) {
  paintKoi(v, '#d96c73', '#fff0dc');
}

function placeKoi(
  fish: THREE.Group | null,
  angle: number,
  radiusX: number,
  radiusZ: number,
  centerX: number,
  centerZ: number,
) {
  if (!fish) return;
  const x = Math.cos(angle) * radiusX;
  const z = Math.sin(angle) * radiusZ;
  const dx = -Math.sin(angle) * radiusX;
  const dz = Math.cos(angle) * radiusZ;
  fish.position.set(centerX + x, 0.19 + Math.sin(angle * 2) * 0.018, centerZ + z);
  fish.rotation.y = Math.atan2(-dz, dx);
}

function KoiPond() {
  const sunset = useRef<THREE.Group>(null);
  const blush = useRef<THREE.Group>(null);
  const golden = useRef<THREE.Group>(null);
  const ivory = useRef<THREE.Group>(null);
  const rose = useRef<THREE.Group>(null);
  const waterMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: pondFragment,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // The callback mutates Three-owned uniforms and object transforms by design.
  // eslint-disable-next-line react-hooks/immutability
  useFrame((state) => {
    const t = atmo.reduceMotion ? 0 : state.clock.elapsedTime;
    // eslint-disable-next-line react-hooks/immutability
    waterMaterial.uniforms.uTime.value = t * 0.7;
    placeKoi(sunset.current, t * 0.72 + 0.2, 1.12, 0.58, 1.68, 1.05);
    placeKoi(blush.current, -t * 0.58 + 2.3, 0.8, 0.72, 1.68, 1.05);
    placeKoi(golden.current, t * 0.5 + 4.1, 1.28, 0.44, 1.68, 1.05);
    placeKoi(ivory.current, -t * 0.82 + 1.1, 0.95, 0.58, 1.68, 1.05);
    placeKoi(rose.current, t * 0.64 + 5.2, 0.58, 0.72, 1.68, 1.05);
  });

  return (
    <group position={[-1.7, 0.02, 2.05]}>
      <VoxMesh build={buildKoiPond} scale={0.21} jitter={0.025} />
      <mesh position={[1.68, 0.195, 1.05]} rotation={[-Math.PI / 2, 0, 0]} material={waterMaterial}>
        <planeGeometry args={[2.74, 1.42]} />
      </mesh>
      <group ref={sunset}>
        <VoxMesh build={buildSunsetKoi} scale={0.075} position={[-0.15, 0, -0.075]} />
      </group>
      <group ref={blush}>
        <VoxMesh build={buildBlushKoi} scale={0.07} position={[-0.14, 0, -0.07]} />
      </group>
      <group ref={golden}>
        <VoxMesh build={buildGoldenKoi} scale={0.065} position={[-0.13, 0, -0.065]} />
      </group>
      <group ref={ivory}>
        <VoxMesh build={buildIvoryKoi} scale={0.068} position={[-0.14, 0, -0.068]} />
      </group>
      <group ref={rose}>
        <VoxMesh build={buildRoseKoi} scale={0.062} position={[-0.12, 0, -0.062]} />
      </group>
    </group>
  );
}

function roundedCluster(
  v: Vox,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
) {
  v.box(x, y, z, w, h, d, color);
  for (const [cx, cy, cz] of [
    [x, y, z], [x + w - 1, y, z], [x, y, z + d - 1], [x + w - 1, y, z + d - 1],
    [x, y + h - 1, z], [x + w - 1, y + h - 1, z],
    [x, y + h - 1, z + d - 1], [x + w - 1, y + h - 1, z + d - 1],
  ] as const) v.remove(cx, cy, cz);
}

function buildCherryTree(v: Vox) {
  v.box(6, 0, 5, 3, 12, 3, '#74442f');
  v.box(5, 2, 4, 2, 7, 2, '#8c5035');
  v.box(3, 8, 4, 4, 2, 2, '#74442f');
  v.box(2, 10, 3, 2, 5, 2, '#865039');
  v.box(8, 8, 6, 5, 2, 2, '#69402f');
  v.box(11, 10, 6, 2, 5, 2, '#80503a');
  v.box(6, 11, 3, 2, 6, 2, '#8c5035');

  const clusters = [
    [0, 12, 0, 7, 6, 6, '#e77f91'], [4, 14, -1, 7, 7, 7, '#ef93a4'],
    [9, 12, 1, 7, 6, 7, '#dc7187'], [2, 17, 3, 7, 6, 6, '#f3a4b2'],
    [7, 17, 4, 7, 6, 6, '#e9869b'], [-2, 14, 4, 6, 5, 6, '#f0a0ae'],
    [11, 15, 5, 6, 5, 6, '#d96d84'], [5, 20, 1, 6, 4, 6, '#f5b2bc'],
  ] as const;
  clusters.forEach(([x, y, z, w, h, d, color]) => roundedCluster(v, x, y, z, w, h, d, color));
  for (const [x, y, z] of [
    [1, 15, 0], [6, 18, 0], [12, 14, 2], [4, 21, 3], [10, 19, 5],
    [0, 17, 6], [14, 16, 7], [7, 23, 4], [3, 19, 7], [9, 15, 1],
  ] as const) v.set(x, y, z, '#ffd0d3');
}

function buildGardenLantern(v: Vox) {
  v.box(2, 0, 2, 2, 5, 2, '#76503b');
  v.box(0, 5, 0, 6, 1, 6, '#8d5c3f');
  v.box(1, 6, 1, 4, 5, 4, '#6b4534');
  v.box(2, 7, 2, 2, 3, 2, '#ffd077');
  v.box(0, 11, 0, 6, 1, 6, '#8d5c3f');
  v.box(1, 12, 1, 4, 1, 4, '#a46a48');
  v.box(2, 13, 2, 2, 1, 2, '#7a4b37');
}

function GardenLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <VoxMesh build={buildGardenLantern} scale={0.105} />
      <mesh position={[0.315, 0.9, 0.315]}>
        <boxGeometry args={[0.58, 0.7, 0.58]} />
        <meshBasicMaterial
          color="#ffc66b"
          transparent
          opacity={0.13}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function buildRoseBush(v: Vox) {
  roundedCluster(v, 0, 0, 0, 7, 4, 6, '#557440');
  for (const [x, y, z, c] of [
    [1, 4, 1, '#f5a9b8'], [4, 3, 0, '#ed7f96'], [5, 4, 4, '#f4cad0'],
    [2, 3, 5, '#e96f89'], [3, 4, 3, '#ffd4c7'],
  ] as const) v.set(x, y, z, c);
}

function Garden() {
  return (
    <group position={[...GARDEN_OFFSET]}>
      <VoxMesh build={buildGardenPlatform} scale={S} />
      <VoxMesh build={buildCherryTree} scale={0.17} position={[-7, 0, -5.2]} />
      <KoiPond />
      <VoxMesh build={buildRoseBush} scale={0.12} position={[-7.2, 0, 2.7]} />
      <VoxMesh build={buildRoseBush} scale={0.12} position={[1.7, 0, -4.7]} rotation={[0, Math.PI / 2, 0]} />
      <GardenLantern position={[-3.2, 0, -0.8]} />
      <GardenLantern position={[0.5, 0, -0.7]} />
      {/* The shared bench has its own lawn pocket, clear of tree and pond. */}
      <Bench position={[-5.3, 0, 1.1]} />
      <PlatformFx x0={-8.25} x1={3.25} z0={-6.25} z1={5.25} showRightEdge={false} />
    </group>
  );
}

/** The whole connected dollhouse: living hub, shared-wall bedroom and west garden. */
export function Room() {
  const { components } = useHomeProgress();
  const hasBedroom = components.has('bed');
  const hasGarden = components.has('garden');
  return (
    <group>
      <VoidBackdrop />
      <LivingRoom />
      <GardenPassage />
      {hasBedroom && (
        <VoxMesh build={buildBedroomThreshold} scale={S} position={[2.75, 0.01, -4.5]} />
      )}
      {hasBedroom ? <Bedroom /> : <LockedBedroom />}
      {hasGarden ? <Garden /> : <LockedGarden />}
    </group>
  );
}
