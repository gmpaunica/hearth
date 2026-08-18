import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from '../atmoState';
import { Bench } from '../objects/Bench';
import { PlatformFx } from '../PlatformFx';
import { GARDEN_OFFSET, S } from '../shell';
import { VoxMesh } from '../VoxMesh';
import { Vox } from '../voxel';

const shaderVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const srgb2lin = /* glsl */ `
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }
`;

function buildGardenPlatform(v: Vox) {
  const x0 = -32, x1 = 12, z0 = -24, z1 = 20;
  const wx = x0 - 1, wz = z0 - 1;
  const spanX = x1 - wx + 1, spanZ = z1 - wz + 1;
  v.box(wx, -4, wz, spanX, 3, spanZ, '#54362a');
  v.box(wx + 1, -5, wz + 1, spanX - 2, 1, spanZ - 2, '#3e2b25');
  for (let x = wx; x < x1; x += 3) v.set(x, -2, z1, x % 2 ? '#7d4c36' : '#936044');
  for (let z = wz; z < z1; z += 3) v.set(x1, -2, z, z % 2 ? '#754632' : '#8a563d');

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

  v.box(wx, 0, wz, spanX - 1, 3, 2, '#3f6638');
  v.box(wx, 0, wz, 2, 3, spanZ, '#395f35');
  v.box(wx, 3, wz, spanX - 1, 1, 2, '#5f7c43');
  v.box(wx, 3, wz, 2, 1, spanZ, '#56743f');
  v.box(x0, 0, z1, x1 - x0 + 1, 2, 2, '#42693a');
  v.box(x0, 2, z1, x1 - x0 + 1, 1, 2, '#5e7d44');
  const exposedEastZ = 8;
  v.box(x1, 0, exposedEastZ, 2, 3, z1 - exposedEastZ + 1, '#42693a');
  v.box(x1, 3, exposedEastZ, 2, 1, z1 - exposedEastZ + 1, '#5e7d44');

  const stones: readonly [number, number, number, number][] = [
    [10, 0, 3, 2], [7, 0, 2, 2], [4, -1, 3, 2], [1, -1, 2, 2],
    [-2, -2, 3, 2], [-5, -2, 2, 2], [-8, -1, 3, 2], [-11, 0, 2, 2],
    [-14, 0, 3, 2], [-17, 1, 2, 2], [-20, 2, 3, 2],
  ];
  stones.forEach(([x, z, w, d], index) => {
    v.box(x, 0, z, w, 1, d, index % 3 === 0 ? '#e2c6a3' : index % 3 === 1 ? '#cfaa88' : '#edd6b7');
    if (w === 3) v.set(x + 1, 1, z, '#f1dcc0');
  });

  for (const [x, z, tone] of [
    [-28, -20, '#54723e'], [6, -20, '#607d43'],
    [-28, 15, '#66854a'], [7, 15, '#58743f'],
  ] as const) {
    v.box(x, 0, z, 4, 2, 3, tone);
    v.remove(x, 1, z); v.remove(x + 3, 1, z + 2);
  }
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
        vertexShader: shaderVertex,
        fragmentShader: pondFragment,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

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

export function Garden() {
  return (
    <group position={[...GARDEN_OFFSET]}>
      <VoxMesh build={buildGardenPlatform} scale={S} />
      <VoxMesh build={buildCherryTree} scale={0.17} position={[-7, 0, -5.2]} />
      <KoiPond />
      <VoxMesh build={buildRoseBush} scale={0.12} position={[-7.2, 0, 2.7]} />
      <VoxMesh build={buildRoseBush} scale={0.12} position={[1.7, 0, -4.7]} rotation={[0, Math.PI / 2, 0]} />
      <GardenLantern position={[-3.2, 0, -0.8]} />
      <GardenLantern position={[0.5, 0, -0.7]} />
      <Bench position={[-5.3, 0, 1.1]} />
      <PlatformFx x0={-8.25} x1={3.25} z0={-6.25} z1={5.25} showRightEdge={false} />
    </group>
  );
}
