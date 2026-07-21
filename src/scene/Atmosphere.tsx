import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { atmo, GLOW_DURATION, PRESETS } from './atmoState';
import { voxelTint } from './voxel';

const GOLD = new THREE.Color('#ffd98e');

/**
 * No lights in this scene — the voxel shading is baked. Mood is a single
 * global tint on the shared voxel material, damped toward the active preset,
 * plus the shared sky/garden colors and the fire/rain/glow scalars.
 */
export function Atmosphere() {
  const scene = useThree((s) => s.scene);

  const target = useMemo(
    () => ({
      tint: new THREE.Color(),
      bg: new THREE.Color(),
      outsideSky: new THREE.Color(),
      gardenLight: new THREE.Color(),
    }),
    []
  );

  useEffect(() => {
    scene.background = atmo.background;
    return () => {
      scene.background = null;
    };
  }, [scene]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const { atmosphere, glowStartedAt } = useSceneStore.getState();
    const preset = PRESETS[atmosphere];

    // Reconciliation glow over GLOW_DURATION seconds. Normally a bloom-like
    // pulse; under "reduce motion" a calm, non-oscillating swell instead — the
    // warm gold still lands, without the spike, bloom flash, or swirling motes.
    const reduce = atmo.reduceMotion;
    let glow = 0;
    if (glowStartedAt != null) {
      const age = (Date.now() - glowStartedAt) / 1000;
      if (age < GLOW_DURATION) {
        const x = age / GLOW_DURATION;
        glow = reduce
          ? 0.55 * Math.min(1, x / 0.2, (1 - x) / 0.3) // ease in, hold, ease out
          : Math.min(1, x * 8) * (1 - x) * (1 - x); // fast rise + slow decay
      }
    }
    atmo.glow = glow;

    target.tint.set(preset.tint).lerp(GOLD, glow * 0.75);
    // Push slightly past white at the glow peak for a bloom-like lift (skipped
    // when reducing motion so there's no flash).
    target.tint.multiplyScalar(1 + glow * (reduce ? 0 : 0.25));
    target.bg.set(preset.bg).lerp(GOLD, glow * 0.25);
    target.outsideSky.set(preset.outsideSky);
    target.gardenLight.set(preset.gardenLight);

    const k = 1 - Math.exp(-3.2 * delta);
    voxelTint.lerp(target.tint, k);
    atmo.background.lerp(target.bg, k);
    atmo.outsideSky.lerp(target.outsideSky, k);
    atmo.gardenLight.lerp(target.gardenLight, k);

    atmo.fire = THREE.MathUtils.damp(
      atmo.fire,
      preset.fire + glow * (reduce ? 0.3 : 0.8),
      3.2,
      delta,
    );
    atmo.rain = THREE.MathUtils.damp(atmo.rain, preset.rain, 2.5, delta);
  });

  return null;
}
