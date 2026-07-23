import { useMemo } from 'react';
import * as THREE from 'three';

// Per-platform lighting furniture: the neon-blue rim tracing the two
// camera-facing plinth edges, its soft glow bleeding into the void, and the
// warm halo under the floating room. Parameterized by the floor's world extent
// so every room (living, bedroom, garden) carries its own.

const srgb2lin = /* glsl */ `
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }
`;

const decalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rimGlowFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float down = smoothstep(0.0, 1.0, vUv.y);
    float ends = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float a = down * down * ends * 0.6;
    gl_FragColor = vec4(srgb2lin(vec3(0.24, 0.72, 1.0)), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const haloFragment = /* glsl */ `
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

const RIM_BLUE = '#37c4ff';
const EDGE_Y = -0.33;

export interface PlatformExtent {
  /** Floor world extent. The +x (x1) and +z (z1) faces meet at the near corner. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** Blue plinth rim + soft glow + warm under-halo for one floating room. */
export function PlatformFx({ x0, x1, z0, z1 }: PlatformExtent) {
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
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: haloFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const spanX = x1 - x0;
  const spanZ = z1 - z0;

  return (
    <group>
      {/* Bright edge bars (unlit — the warm global tint never touches these). */}
      <mesh position={[cx, EDGE_Y, z1 + 0.02]}>
        <boxGeometry args={[spanX + 0.02, 0.06, 0.04]} />
        <meshBasicMaterial color={RIM_BLUE} toneMapped={false} />
      </mesh>
      <mesh position={[x1 + 0.02, EDGE_Y, cz]}>
        <boxGeometry args={[0.04, 0.06, spanZ + 0.02]} />
        <meshBasicMaterial color={RIM_BLUE} toneMapped={false} />
      </mesh>
      {/* Soft glow hugging each edge, fading down into the void. */}
      <mesh position={[cx - 0.15, -0.72, z1 + 0.58]} material={glowMat}>
        <planeGeometry args={[spanX - 0.4, 0.95]} />
      </mesh>
      <mesh position={[x1 + 0.58, -0.72, cz + 0.15]} rotation={[0, Math.PI / 2, 0]} material={glowMat}>
        <planeGeometry args={[spanZ + 0.3, 0.95]} />
      </mesh>
      {/* Warm halo under the floating platform. */}
      <mesh position={[cx, -0.62, cz]} rotation={[-Math.PI / 2, 0, 0]} material={haloMat}>
        <planeGeometry args={[spanX + 4, spanZ + 4]} />
      </mesh>
    </group>
  );
}
