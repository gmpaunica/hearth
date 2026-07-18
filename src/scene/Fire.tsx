import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';

// Chunky pixel-square flames for the voxel art style.
const FLAME_COUNT = 90;
const EMBER_COUNT = 16;

function makeSeedGeometry(count: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 2);
  return geo;
}

const flameVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uZoom;
  uniform float uIntensity;
  varying float vLife;

  void main() {
    float speed = 0.6 + fract(aSeed * 7.13) * 0.5;
    float life = fract(uTime * speed + aSeed);
    vLife = life;

    float height = life * (0.55 + fract(aSeed * 13.7) * 0.3) * (0.5 + 0.5 * uIntensity);
    float ang = aSeed * 6.2831 + life * 3.0;
    vec3 p = vec3(
      cos(ang) * (1.0 - life * 0.8) * 0.28,
      height,
      sin(ang) * (1.0 - life * 0.8) * 0.06
    );
    // Snap to a coarse grid for a stepped, pixel-y motion.
    p = floor(p * 14.0) / 14.0;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float world = (1.0 - life * 0.55) * 0.16 * (0.7 + 0.5 * uIntensity);
    gl_PointSize = world * uZoom * uDpr;
  }
`;

const flameFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;

  void main() {
    if (vLife > 0.92) discard;
    vec3 col = vec3(0.88, 0.32, 0.18);
    if (vLife < 0.3) col = vec3(1.0, 0.88, 0.54);
    else if (vLife < 0.62) col = vec3(1.0, 0.61, 0.24);
    gl_FragColor = vec4(col, clamp(uIntensity * 1.4, 0.0, 1.0));
  }
`;

const emberVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uZoom;
  uniform float uIntensity;
  varying float vLife;

  void main() {
    float speed = 0.18 + fract(aSeed * 5.7) * 0.14;
    float life = fract(uTime * speed + aSeed);
    vLife = life;
    vec3 p = vec3(
      (fract(aSeed * 17.3) - 0.5) * 0.4,
      life * 1.1,
      (fract(aSeed * 29.1) - 0.5) * 0.15
    );
    p = floor(p * 14.0) / 14.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.05 * uZoom * uDpr * (0.5 + 0.5 * uIntensity);
  }
`;

const emberFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;

  void main() {
    if (vLife > 0.8) discard;
    gl_FragColor = vec4(1.0, 0.66, 0.28, clamp(uIntensity, 0.0, 1.0));
  }
`;

function usePixelMaterial(vertex: string, fragment: string) {
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: dpr },
          uZoom: { value: 50 },
          uIntensity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vertex, fragment]
  );
  material.uniforms.uDpr.value = dpr;
  return material;
}

/** Pixel-square fire: stepped flames + drifting embers. */
export function Fire({ position }: { position: [number, number, number] }) {
  const flameGeo = useMemo(() => makeSeedGeometry(FLAME_COUNT), []);
  const emberGeo = useMemo(() => makeSeedGeometry(EMBER_COUNT), []);
  const flameMat = usePixelMaterial(flameVertex, flameFragment);
  const emberMat = usePixelMaterial(emberVertex, emberFragment);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const zoom = (state.camera as THREE.OrthographicCamera).zoom || 50;
    for (const m of [flameMat, emberMat]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uZoom.value = zoom;
      m.uniforms.uIntensity.value = atmo.fire;
    }
  });

  return (
    <group position={position}>
      <points geometry={flameGeo} material={flameMat} frustumCulled={false} />
      <points geometry={emberGeo} material={emberMat} frustumCulled={false} />
    </group>
  );
}
