import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';
import { pixelScale } from './pixelState';

// Chunky pixel-square flames for the voxel art style.
const FLAME_COUNT = 130;
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

    float height = life * (0.68 + fract(aSeed * 13.7) * 0.34) * (0.5 + 0.5 * uIntensity);
    float ang = aSeed * 6.2831 + life * 3.0;
    vec3 p = vec3(
      cos(ang) * (1.0 - life * 0.8) * 0.32,
      height,
      sin(ang) * (1.0 - life * 0.8) * 0.06
    );
    // Snap to a coarse grid for a stepped, pixel-y motion.
    p = floor(p * 14.0) / 14.0;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float world = (1.0 - life * 0.55) * 0.19 * (0.7 + 0.5 * uIntensity);
    gl_PointSize = world * uZoom * uDpr;
  }
`;

// Linear-space color helper — see Room.tsx: custom shaders author display
// colors and encode via the standard chunks, matching built-in materials.
const srgb2lin = /* glsl */ `
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }
`;

const flameFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;
  ${srgb2lin}
  void main() {
    if (vLife > 0.92) discard;
    vec3 col = vec3(0.88, 0.32, 0.18);
    if (vLife < 0.3) col = vec3(1.0, 0.88, 0.54);
    else if (vLife < 0.62) col = vec3(1.0, 0.61, 0.24);
    gl_FragColor = vec4(srgb2lin(col), clamp(uIntensity * 1.4, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const emberVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uZoom;
  uniform float uIntensity;
  uniform float uRise;
  uniform float uSpread;

  varying float vLife;

  void main() {
    float speed = 0.18 + fract(aSeed * 5.7) * 0.14;
    float life = fract(uTime * speed + aSeed);
    vLife = life;
    vec3 p = vec3(
      (fract(aSeed * 17.3) - 0.5) * uSpread + sin(life * 7.0 + aSeed * 30.0) * 0.08 * uRise,
      life * uRise,
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
  ${srgb2lin}
  void main() {
    if (vLife > 0.8) discard;
    gl_FragColor = vec4(srgb2lin(vec3(1.0, 0.66, 0.28)), clamp(uIntensity, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function usePixelMaterial(vertex: string, fragment: string, extra?: Record<string, number>) {
  const material = useMemo(() => {
    const uniforms: Record<string, { value: number }> = {
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uZoom: { value: 50 },
      uIntensity: { value: 1 },
    };
    if (extra) for (const [k, v] of Object.entries(extra)) uniforms[k] = { value: v };
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertex, fragment]);
  return material;
}

const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float d = length(vec2((vUv.x - 0.5) * 1.3, vUv.y - 0.32));
    float alpha = smoothstep(0.72, 0.0, d) * 0.8 * uIntensity;
    vec3 col = mix(srgb2lin(vec3(1.0, 0.5, 0.16)), srgb2lin(vec3(1.0, 0.86, 0.55)), smoothstep(0.5, 0.0, d));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Pixel-square fire: stepped flames + drifting embers + firebox glow. */
export function Fire({ position }: { position: [number, number, number] }) {
  const flameGeo = useMemo(() => makeSeedGeometry(FLAME_COUNT), []);
  const emberGeo = useMemo(() => makeSeedGeometry(EMBER_COUNT), []);
  const flameMat = usePixelMaterial(flameVertex, flameFragment);
  const emberMat = usePixelMaterial(emberVertex, emberFragment, { uRise: 1.1, uSpread: 0.4 });
  const glowMat = usePixelMaterial(glowVertex, glowFragment);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const zoom = (state.camera as THREE.OrthographicCamera).zoom || 50;
    const flicker =
      0.9 + 0.07 * Math.sin(t * 9.3) + 0.04 * Math.sin(t * 23.7 + 1.7);
    for (const m of [flameMat, emberMat, glowMat]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uZoom.value = zoom;
      m.uniforms.uDpr.value = pixelScale.value;
      m.uniforms.uIntensity.value = atmo.fire * flicker;
    }
  });

  return (
    <group position={position}>
      {/* Warm glow filling the firebox behind the flames */}
      <mesh material={glowMat} position={[0, 0.42, -0.05]}>
        <planeGeometry args={[1.35, 1.2]} />
      </mesh>
      <points geometry={flameGeo} material={flameMat} frustumCulled={false} />
      <points geometry={emberGeo} material={emberMat} frustumCulled={false} />
    </group>
  );
}

/** Sparse embers drifting up from the chimney top into the night. */
export function EmberColumn({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => makeSeedGeometry(22), []);
  const mat = usePixelMaterial(emberVertex, emberFragment, { uRise: 2.4, uSpread: 0.7 });

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uZoom.value = (state.camera as THREE.OrthographicCamera).zoom || 50;
    mat.uniforms.uDpr.value = pixelScale.value;
    mat.uniforms.uIntensity.value = atmo.fire * 0.9;
  });

  return <points geometry={geo} material={mat} position={position} frustumCulled={false} />;
}
