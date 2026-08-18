import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Per-platform lighting furniture: warm trim tracing the camera-facing plinth
// edges, a restrained glow into the void, and a warm halo under the room.
// Parameterized by floor extent so every room carries its own.

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
    float a = down * down * ends * 0.2;
    gl_FragColor = vec4(srgb2lin(vec3(0.9, 0.48, 0.27)), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const haloFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    float d = length((vUv - vec2(0.5)) * 2.0);
    float alpha = smoothstep(1.0, 0.08, d) * 0.16;
    gl_FragColor = vec4(srgb2lin(vec3(1.0, 0.68, 0.39)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const groundShadowFragment = /* glsl */ `
  varying vec2 vUv;
  ${srgb2lin}
  void main() {
    vec2 p = (vUv - vec2(0.5)) * 2.0;
    float d = length(p);
    float core = smoothstep(1.0, 0.14, d);
    float alpha = core * core * 0.12;
    gl_FragColor = vec4(srgb2lin(vec3(0.25, 0.12, 0.08)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const EDGE_WOOD = '#75452f';
const EDGE_HIGHLIGHT = '#c27a53';
const EDGE_Y = -0.33;

export interface PlatformExtent {
  /** Floor world extent. The +x (x1) and +z (z1) faces meet at the near corner. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Hide a shared edge when two room modules meet as one house. */
  showFrontEdge?: boolean;
  /** Hide an entrance-facing side edge so its glow cannot leak through a door. */
  showRightEdge?: boolean;
}

/** Warm plinth trim + restrained glow + under-halo for one floating room. */
export function PlatformFx({
  x0,
  x1,
  z0,
  z1,
  showFrontEdge = true,
  showRightEdge = true,
}: PlatformExtent) {
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
  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: decalVertex,
        fragmentShader: groundShadowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => () => {
    glowMat.dispose();
    haloMat.dispose();
    shadowMat.dispose();
  }, [glowMat, haloMat, shadowMat]);

  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const spanX = x1 - x0;
  const spanZ = z1 - z0;

  return (
    <group>
      {/* Bright edge bars (unlit — the warm global tint never touches these). */}
      {showFrontEdge && (
        <group>
          <mesh position={[cx, EDGE_Y, z1 + 0.02]}>
            <boxGeometry args={[spanX + 0.02, 0.07, 0.05]} />
            <meshBasicMaterial color={EDGE_WOOD} toneMapped={false} />
          </mesh>
          <mesh position={[cx, EDGE_Y + 0.043, z1 + 0.047]}>
            <boxGeometry args={[spanX + 0.01, 0.017, 0.018]} />
            <meshBasicMaterial color={EDGE_HIGHLIGHT} toneMapped={false} />
          </mesh>
        </group>
      )}
      {showRightEdge && (
        <group>
          <mesh position={[x1 + 0.02, EDGE_Y, cz]}>
            <boxGeometry args={[0.05, 0.07, spanZ + 0.02]} />
            <meshBasicMaterial color={EDGE_WOOD} toneMapped={false} />
          </mesh>
          <mesh position={[x1 + 0.047, EDGE_Y + 0.043, cz]}>
            <boxGeometry args={[0.018, 0.017, spanZ + 0.01]} />
            <meshBasicMaterial color={EDGE_HIGHLIGHT} toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* Soft glow hugging each edge, fading down into the void. */}
      {showFrontEdge && (
        <mesh position={[cx - 0.15, -0.72, z1 + 0.58]} material={glowMat}>
          <planeGeometry args={[spanX - 0.4, 0.95]} />
        </mesh>
      )}
      {showRightEdge && (
        <mesh position={[x1 + 0.58, -0.72, cz + 0.15]} rotation={[0, Math.PI / 2, 0]} material={glowMat}>
          <planeGeometry args={[spanZ + 0.3, 0.95]} />
        </mesh>
      )}
      {/* A diffuse contact shadow grounds the room before the warm bounce. */}
      <mesh
        position={[cx, -0.635, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={shadowMat}
        renderOrder={-2}
      >
        <planeGeometry args={[spanX + 2.2, spanZ + 2.2]} />
      </mesh>
      {/* Warm halo under the floating platform. */}
      <mesh position={[cx, -0.62, cz]} rotation={[-Math.PI / 2, 0, 0]} material={haloMat}>
        <planeGeometry args={[spanX + 4, spanZ + 4]} />
      </mesh>
    </group>
  );
}
