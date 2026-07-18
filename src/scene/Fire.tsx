import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';

const FLAME_COUNT = 130;
const EMBER_COUNT = 24;

function makeSeedGeometry(count: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3); // filled in the shader
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  // Particles are positioned in the vertex shader; avoid wrong culling.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 3);
  return geo;
}

const flameVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uIntensity;
  varying float vLife;
  varying float vSeed;

  void main() {
    float speed = 0.55 + fract(aSeed * 7.13) * 0.5;
    float life = fract(uTime * speed + aSeed);
    vLife = life;
    vSeed = aSeed;

    float height = life * (0.5 + fract(aSeed * 13.7) * 0.4) * (0.55 + 0.45 * uIntensity);
    float ang = aSeed * 6.2831 + life * 3.0;
    float spread = (1.0 - life * 0.85) * 0.17;
    vec3 p = vec3(
      cos(ang) * spread + sin(life * 9.0 + aSeed * 25.0) * 0.03,
      height,
      sin(ang) * spread * 0.55
    );

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (1.0 - life * 0.7) * 42.0 * (0.6 + 0.5 * uIntensity);
    gl_PointSize = size * uDpr * (4.2 / -mv.z);
  }
`;

const flameFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float shape = smoothstep(0.5, 0.05, d);
    float fade = (1.0 - vLife) * min(1.0, vLife * 6.0);
    float alpha = shape * fade * (0.35 + 0.55 * uIntensity);
    if (alpha < 0.01) discard;

    vec3 deep = vec3(0.85, 0.22, 0.02);
    vec3 mid = vec3(1.0, 0.55, 0.1);
    vec3 hot = vec3(1.0, 0.85, 0.45);
    vec3 col = mix(hot, mix(mid, deep, vLife), smoothstep(0.0, 0.75, vLife));
    gl_FragColor = vec4(col, alpha);
  }
`;

const emberVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uIntensity;
  varying float vLife;

  void main() {
    float speed = 0.16 + fract(aSeed * 5.7) * 0.14;
    float life = fract(uTime * speed + aSeed);
    vLife = life;
    vec3 p = vec3(
      (fract(aSeed * 17.3) - 0.5) * 0.5 + sin(life * 12.0 + aSeed * 40.0) * 0.08,
      life * 1.6,
      (fract(aSeed * 29.1) - 0.5) * 0.3
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 7.0 * uDpr * (4.2 / -mv.z) * (0.5 + 0.5 * uIntensity);
  }
`;

const emberFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, d) * (1.0 - vLife) * min(1.0, vLife * 8.0) * uIntensity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(1.0, 0.62, 0.2, alpha);
  }
`;

const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const haloFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - vec2(0.5, 0.35)) * 2.0;
    float alpha = smoothstep(1.0, 0.0, d) * 0.5 * uIntensity;
    gl_FragColor = vec4(1.0, 0.5, 0.15, alpha);
  }
`;

function useParticleMaterial(vertex: string, fragment: string) {
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: dpr },
          uIntensity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vertex, fragment]
  );
  material.uniforms.uDpr.value = dpr;
  return material;
}

/** Shader-driven fire: flames, drifting embers and a soft light halo. */
export function Fire({ position }: { position: [number, number, number] }) {
  const flameGeo = useMemo(() => makeSeedGeometry(FLAME_COUNT), []);
  const emberGeo = useMemo(() => makeSeedGeometry(EMBER_COUNT), []);
  const flameMat = useParticleMaterial(flameVertex, flameFragment);
  const emberMat = useParticleMaterial(emberVertex, emberFragment);
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: { uIntensity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    flameMat.uniforms.uTime.value = t;
    emberMat.uniforms.uTime.value = t;
    flameMat.uniforms.uIntensity.value = atmo.fire;
    emberMat.uniforms.uIntensity.value = atmo.fire;
    haloMat.uniforms.uIntensity.value = atmo.fire;
  });

  return (
    <group position={position}>
      <points geometry={flameGeo} material={flameMat} frustumCulled={false} />
      <points geometry={emberGeo} material={emberMat} frustumCulled={false} />
      <mesh material={haloMat} position={[0, 0.45, 0.05]}>
        <planeGeometry args={[1.6, 1.5]} />
      </mesh>
    </group>
  );
}
