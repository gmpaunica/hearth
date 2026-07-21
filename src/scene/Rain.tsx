import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';
import { pixelScale } from './pixelState';

const DROP_COUNT = 60;

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uZoom;

  void main() {
    float speed = 0.6 + fract(aSeed * 9.7) * 0.35;
    float life = fract(uTime * speed + aSeed);
    // Streaks crossing the window opening only.
    vec3 p = vec3(
      floor((fract(aSeed * 13.7) - 0.5) * 1.44 * 12.0) / 12.0,
      1.6 * (1.0 - life),
      0.0
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.09 * uZoom * uDpr;
  }
`;

const fragment = /* glsl */ `
  uniform float uAmount;
  vec3 srgb2lin(vec3 c) { return pow((c + 0.055) / 1.055, vec3(2.4)); }

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    // Thin pixel streak.
    if (abs(c.x) > 0.14) discard;
    gl_FragColor = vec4(srgb2lin(vec3(0.55, 0.68, 0.9)), 0.55 * uAmount);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Pixel rain falling outside the window (behind the back wall). */
export function Rain() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(DROP_COUNT * 3);
    const seeds = new Float32Array(DROP_COUNT);
    for (let i = 0; i < DROP_COUNT; i++) seeds[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, -0.3), 7);
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
          uAmount: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uZoom.value = (state.camera as THREE.OrthographicCamera).zoom || 50;
    material.uniforms.uDpr.value = pixelScale.value;
    material.uniforms.uAmount.value = atmo.rain;
    if (pointsRef.current) pointsRef.current.visible = atmo.rain > 0.02;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={[1.75, 1.22, -3.38]}
      frustumCulled={false}
    />
  );
}
