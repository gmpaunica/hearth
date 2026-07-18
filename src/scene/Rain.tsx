import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';

const DROP_COUNT = 420;

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    float speed = 0.55 + fract(aSeed * 9.7) * 0.35;
    float life = fract(uTime * speed + aSeed);
    // Fall through a volume outside the back wall, visible through the window.
    vec3 p = vec3(
      (fract(aSeed * 13.7) - 0.5) * 5.5,
      4.6 * (1.0 - life),
      -0.2 - fract(aSeed * 23.3) * 1.6
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 11.0 * uDpr * (4.2 / -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform float uAmount;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    // Thin vertical streak.
    float d = length(vec2(c.x * 4.5, c.y * 0.9));
    float alpha = smoothstep(0.5, 0.1, d) * 0.55 * uAmount;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(0.62, 0.72, 0.86, alpha);
  }
`;

/** Rain falling outside the window (positioned behind the back wall). */
export function Rain() {
  const dpr = useThree((s) => s.viewport.dpr);
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(DROP_COUNT * 3);
    const seeds = new Float32Array(DROP_COUNT);
    for (let i = 0; i < DROP_COUNT; i++) seeds[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, -1.5), 8);
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
          uAmount: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  material.uniforms.uDpr.value = dpr;

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAmount.value = atmo.rain;
    if (pointsRef.current) pointsRef.current.visible = atmo.rain > 0.02;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={[1.45, 0, -4.6]}
      frustumCulled={false}
    />
  );
}
