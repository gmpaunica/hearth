import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { room } from '@/theme/hearth';
import { atmo } from '../atmoState';
import { PlatformFx } from '../PlatformFx';
import { LIVING_BOUNDS, ROOM_SOCKETS, S } from '../shell';
import { VoxMesh } from '../VoxMesh';
import { Vox } from '../voxel';
import { MediaConsole } from '../objects/MediaConsole';

function buildLivingShell(v: Vox) {
  const { floorX0, floorX1, floorZ0, floorZ1, wallX, wallZ } = LIVING_BOUNDS;
  v.box(floorX0, -3, floorZ0, floorX1 - floorX0 + 1, 2, floorZ1 - floorZ0 + 1, '#5a3525');
  v.box(floorX0 + 1, -4, floorZ0 + 1, floorX1 - floorX0 - 1, 1, floorZ1 - floorZ0 - 1, '#3f2a22');
  for (let x = floorX0; x <= floorX1; x += 3) v.set(x, -2, floorZ1, '#9b593b');
  for (let z = floorZ0; z <= floorZ1; z += 3) v.set(floorX1, -2, z, '#81462f');

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

  for (const x of [-11, 8]) v.box(x, 2, wallZ + 1, 1, 12, 1, '#b77a58');
  v.box(wallX + 1, 2, -8, 1, 12, 1, '#a86d50');

  const gardenSocket = ROOM_SOCKETS.garden;
  v.remove(wallX, 0, gardenSocket.start, 1, 10, gardenSocket.width);
  v.box(wallX, 0, gardenSocket.start - 1, 2, 12, 1, '#8b5138');
  v.box(wallX, 0, gardenSocket.start + gardenSocket.width, 2, 12, 1, '#8b5138');
  v.box(wallX, 10, gardenSocket.start, 2, 2, gardenSocket.width, '#9e6043');
  v.set(wallX + 1, 9, gardenSocket.start, '#c97a59');
  v.set(wallX + 1, 9, gardenSocket.start + gardenSocket.width - 1, '#c97a59');

  const bedroomSocket = ROOM_SOCKETS.bedroom;
  v.remove(bedroomSocket.start, 0, wallZ, bedroomSocket.width, 10, 1);
  v.box(bedroomSocket.start - 1, 0, wallZ, 1, 12, 2, '#9b5f45');
  v.box(bedroomSocket.start + bedroomSocket.width, 0, wallZ, 1, 12, 2, '#9b5f45');
  v.box(bedroomSocket.start, 10, wallZ, bedroomSocket.width, 2, 2, '#aa6a4d');
  v.set(bedroomSocket.start, 9, wallZ + 1, '#d18b67');
  v.set(bedroomSocket.start + bedroomSocket.width - 1, 9, wallZ + 1, '#d18b67');

  v.remove(-2, 7, wallZ, 8, 6, 1);
  v.box(-3, 6, wallZ, 10, 1, 2, '#865039');
  v.box(-3, 13, wallZ, 10, 2, 2, '#9e6042');
  v.box(-3, 7, wallZ, 1, 6, 2, '#865039');
  v.box(6, 7, wallZ, 1, 6, 2, '#865039');
  v.box(1, 7, wallZ, 1, 6, 2, '#9e6042');
  v.box(-2, 10, wallZ, 8, 1, 2, '#9e6042');
  v.box(-3, 6, wallZ + 1, 10, 1, 2, '#9a603f');
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

function SkyBackdrop() {
  const skyMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color = atmo.outsideSky;
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

export function VoidBackdrop() {
  const gradientMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: voidVertex,
        fragmentShader: voidFragment,
        uniforms: { uMood: { value: 0 } },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  useFrame((_state, delta) => {
    const mode = useSceneStore.getState().atmosphere;
    const target = mode === 'warm' ? 0 : mode === 'cool' ? 0.58 : 1;
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
    const rx = 0.7071;
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

export function LivingRoom() {
  return (
    <group>
      <VoxMesh build={buildLivingShell} scale={S} />
      <VoxMesh build={buildFireRug} scale={S} meshScale={[1, 0.22, 1]} position={[-2.85, 0, -2.9]} />
      <VoxMesh build={buildCenterRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.2, 0, -0.55]} />
      <SkyBackdrop />
      <FireGlowDecal />
      <WindowSunbeams />
      <MediaConsole />
      <PlatformFx x0={-4.5} x1={5.25} z0={-4.5} z1={4.25} />
    </group>
  );
}
