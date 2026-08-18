import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { atmo } from './atmoState';
import { pixelScale } from './pixelState';
import { voxelTint } from './voxel';

const blitVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * One inexpensive finishing pass: a four-neighbour highlight lift plus a
 * static peach daylight veil. Source samples stay on exact art-pixel offsets,
 * preserving the crisp nearest-neighbour voxel silhouettes.
 */
const editorialFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform vec2 uTexel;
  // x = aspect, y = warmth, z = reconciliation glow
  uniform vec3 uGrade;
  varying vec2 vUv;

  float luma(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec3 color = texture2D(uScene, vUv).rgb;

    // Block-aligned, thresholded glow rather than a silhouette-softening blur.
    vec2 step2 = uTexel * 2.0;
    vec3 around = (
      texture2D(uScene, vUv + vec2(step2.x, 0.0)).rgb
      + texture2D(uScene, vUv - vec2(step2.x, 0.0)).rgb
      + texture2D(uScene, vUv + vec2(0.0, step2.y)).rgb
      + texture2D(uScene, vUv - vec2(0.0, step2.y)).rgb
    ) * 0.25;
    float highlight = smoothstep(0.5, 0.9, luma(around));
    vec3 bloom = max(around - vec3(0.42), vec3(0.0)) * highlight;
    color += bloom * vec3(0.2, 0.13, 0.075) * (uGrade.y + uGrade.z * 1.6);

    float luminosity = luma(color);
    float shadowLift = (1.0 - smoothstep(0.08, 0.68, luminosity)) * uGrade.y;
    color += vec3(0.075, 0.03, 0.012) * shadowLift;
    color *= mix(vec3(1.0), vec3(1.035, 0.99, 0.94), uGrade.y);

    // Broad fixed daylight from the upper-left; no shimmer or motion.
    vec2 p = (vUv - vec2(0.5)) * vec2(uGrade.x, 1.0);
    vec2 sunP = (vUv - vec2(0.12, 0.88)) * vec2(uGrade.x, 1.0);
    float sunVeil = 1.0 - smoothstep(0.05, 1.05, length(sunP));
    float shaftA = 1.0 - smoothstep(0.04, 0.24, abs(vUv.x - 0.08 - (1.0 - vUv.y) * 0.24));
    float shaftB = 1.0 - smoothstep(0.03, 0.18, abs(vUv.x - 0.27 - (1.0 - vUv.y) * 0.16));
    float daylight = (sunVeil * 0.018 + (shaftA + shaftB * 0.55) * 0.006) * uGrade.y;
    color += vec3(0.95, 0.48, 0.18) * daylight;

    // A restrained warm vignette focuses the diorama without crushing detail.
    float vignette = smoothstep(0.38, 0.78, length(p));
    color *= 1.0 - vignette * 0.045;

    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Style-F "crunchy pixel poster" look. Renders the whole diorama into a small
 * fixed-resolution target (NEAREST filtering), then blits it fullscreen. The
 * nearest-neighbour upscale is what turns the smooth 3D voxels into the big,
 * uniform square pixels of the hero frame (docs/reference/hero-F-pixel-poster.png).
 *
 * `resolution` is the internal render size of the SHORTER screen side, in
 * pixels. The 360px art grid keeps the square-pixel finish while giving the
 * denser avatars, rooms and cosmetics enough samples to survive the overview
 * camera. It remains device-independent, so art density is stable across phones.
 *
 * Taking a render priority > 0 hands the render loop to this component: R3F
 * stops auto-rendering and we draw the scene ourselves.
 */
export const HOME_ART_RESOLUTION = 360;

export function PixelPass({ resolution = HOME_ART_RESOLUTION }: { resolution?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const rig = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    target.texture.generateMipmaps = false;
    target.texture.colorSpace = THREE.NoColorSpace;
    // Scene colors stay linear in the untagged target. The editorial shader
    // grades in linear space, then encodes once on the way to the canvas.
    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: target.texture },
        uTexel: { value: new THREE.Vector2(0.5, 0.5) },
        uGrade: { value: new THREE.Vector3(1, 1, 0) },
      },
      vertexShader: blitVertex,
      fragmentShader: editorialFragment,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    quadScene.add(quad);
    return { target, quadScene, quadCamera, quad };
  }, []);

  useEffect(() => {
    const { target, quad } = rig;
    return () => {
      target.dispose();
      quad.geometry.dispose();
      quad.material.dispose();
    };
  }, [rig]);

  useFrame((state) => {
    const { target, quadScene, quadCamera } = rig;
    const { width, height } = state.size; // CSS pixels
    const short = Math.max(1, Math.min(width, height));
    const scale = resolution / short; // internal px per CSS px (< 1 = crunchy)
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    if (target.width !== w || target.height !== h) target.setSize(w, h);

    const uniforms = (rig.quad.material as THREE.ShaderMaterial).uniforms;
    (uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    const warmth = THREE.MathUtils.clamp(
      0.52 + (voxelTint.r - voxelTint.b) * 1.7 - atmo.rain * 0.12,
      0.2,
      1,
    );
    (uniforms.uGrade.value as THREE.Vector3).set(
      w / h,
      warmth,
      atmo.glow * (atmo.reduceMotion ? 0.42 : 1),
    );

    // Point-sprite particles (fire, embers, rain, sparkles) size themselves in
    // framebuffer pixels, so they must match the low-res target — not the
    // full drawing buffer — to stay chunky and aligned with the upscale.
    pixelScale.value = scale;

    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCamera);
  }, 1);

  return null;
}
