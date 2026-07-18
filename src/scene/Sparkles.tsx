import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';

const COUNT = 90;

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  varying float vTwinkle;

  void main() {
    float speed = 0.10 + fract(aSeed * 7.7) * 0.12;
    float life = fract(uTime * speed + aSeed);
    float ang = aSeed * 6.2831;
    float radius = 0.5 + fract(aSeed * 11.3) * 2.0;
    vec3 p = vec3(
      cos(ang + life * 1.5) * radius,
      0.3 + life * 2.6,
      sin(ang + life * 1.5) * radius * 0.7
    );
    vTwinkle = 0.5 + 0.5 * sin(uTime * (3.0 + fract(aSeed * 31.0) * 5.0) + aSeed * 50.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (4.0 + fract(aSeed * 19.0) * 5.0) * uDpr * (4.2 / -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform float uGlow;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, d) * vTwinkle * uGlow;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(1.0, 0.85, 0.5, alpha);
  }
`;

/** Golden motes that swirl through the room during the reconciliation glow. */
export function Sparkles() {
  const dpr = useThree((s) => s.viewport.dpr);
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) seeds[i] = Math.random();
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 8);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: dpr },
          uGlow: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  material.uniforms.uDpr.value = dpr;

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uGlow.value = atmo.glow;
    if (pointsRef.current) pointsRef.current.visible = atmo.glow > 0.01;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={[-0.2, 0, -0.6]}
      frustumCulled={false}
    />
  );
}
