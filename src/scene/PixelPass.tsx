import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { pixelScale } from './pixelState';

/**
 * Style-F "crunchy pixel poster" look. Renders the whole diorama into a small
 * fixed-resolution target (NEAREST filtering), then blits it fullscreen. The
 * nearest-neighbour upscale is what turns the smooth 3D voxels into the big,
 * uniform square pixels of the hero frame (docs/reference/hero-F-pixel-poster.png).
 *
 * `resolution` is the internal render size of the SHORTER screen side, in
 * pixels — small on purpose (a phone screen ~200px tall of "art pixels"). It is
 * device-independent, so the crunch is identical on every display.
 *
 * Taking a render priority > 0 hands the render loop to this component: R3F
 * stops auto-rendering and we draw the scene ourselves.
 */
export function PixelPass({ resolution = 200 }: { resolution?: number }) {
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
    // Color architecture: every material (including our custom shaders, which
    // end in three's tonemapping/colorspace chunks) works in linear space. The
    // scene pass stores linear values in this untagged target, and the blit
    // material encodes to sRGB exactly once on the way to the canvas — the
    // same single encode a direct render would do.
    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, toneMapped: false })
    );
    quadScene.add(quad);
    return { target, quadScene, quadCamera, quad };
  }, []);

  useEffect(() => {
    const { target, quad } = rig;
    return () => {
      target.dispose();
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
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
