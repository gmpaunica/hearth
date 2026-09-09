import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';
import { pixelScale } from './pixelState';

const COUNT = 70;

function deterministicSeed(index: number) {
  const value = Math.sin((index + 1) * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uZoom;
  varying float vTwinkle;

  void main() {
    float speed = 0.10 + fract(aSeed * 7.7) * 0.12;
    float life = fract(uTime * speed + aSeed);
    float ang = aSeed * 6.2831;
    float radius = 0.5 + fract(aSeed * 11.3) * 2.2;
    vec3 p = vec3(
      cos(ang + life * 1.5) * radius,
      0.3 + life * 2.4,
      sin(ang + life * 1.5) * radius * 0.8
    );
    p = floor(p * 10.0) / 10.0;
    vTwinkle = sin(uTime * (3.0 + fract(aSeed * 31.0) * 5.0) + aSeed * 50.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.045 + fract(aSeed * 19.0) * 0.05) * uZoom * uDpr;
  }
`;

const fragment = /* glsl */ `
  uniform float uGlow;
  varying float vTwinkle;
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }

  void main() {
    if (vTwinkle < -0.1) discard;
    gl_FragColor = vec4(srgb2lin(vec3(1.0, 0.85, 0.5)), uGlow);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Golden pixel motes that swirl through the room during the reconciliation glow. */
export function Sparkles() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) seeds[i] = deterministicSeed(i);
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 6);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: 1 },
          uZoom: { value: 50 },
          uGlow: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    const shader = pointsRef.current.material as THREE.ShaderMaterial;
    shader.uniforms.uTime.value = state.clock.elapsedTime;
    shader.uniforms.uZoom.value = (state.camera as THREE.OrthographicCamera).zoom || 50;
    shader.uniforms.uDpr.value = pixelScale.value;
    shader.uniforms.uGlow.value = atmo.glow;
    // The motes swirl, so keep them off when the user asked for reduced motion.
    pointsRef.current.visible = atmo.glow > 0.01 && !atmo.reduceMotion;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={[-0.4, 0, -0.6]}
      frustumCulled={false}
    />
  );
}
