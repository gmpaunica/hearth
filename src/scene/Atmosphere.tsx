import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { useDailyRitualStore } from '@/state/dailyRitualStore';
import { firePresentation } from '@/state/firePresentation';
import { useMomentV2Store } from '@/state/momentV2Store';
import { atmo, GLOW_DURATION, PRESETS, type VisualAtmosphereMode } from './atmoState';
import { voxelTint } from './voxel';

const GOLD = new THREE.Color('#ffd98e');
const WARM_TINT = new THREE.Color(PRESETS.warm.tint);
const WARM_BG = new THREE.Color(PRESETS.warm.bg);
const WARM_OUTSIDE_SKY = new THREE.Color(PRESETS.warm.outsideSky);
const WARM_GARDEN_LIGHT = new THREE.Color(PRESETS.warm.gardenLight);
const FOG_DENSITY = 0.015;

function interactionAtmosphere(
  base: VisualAtmosphereMode,
  spot: ReturnType<typeof useSceneStore.getState>['interactionSpot'],
): VisualAtmosphereMode {
  if (!spot || spot === 'idle') return base;
  if (spot === 'garden' || spot === 'garden_arch') return 'rain';
  if (spot === 'table' || spot === 'rest') return 'cool';
  return 'warm';
}

/**
 * No lights in this scene — the voxel shading is baked. Mood is a single
 * global tint on the shared voxel material, damped toward the active preset,
 * plus the shared sky/garden colors and the fire/rain/glow scalars.
 */
export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(
    () => new THREE.FogExp2(atmo.background.clone(), FOG_DENSITY),
    [],
  );

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
    const initialMode = useSceneStore.getState().atmosphere;
    const initial = PRESETS[initialMode];
    atmo.background.set(initial.bg);
    atmo.outsideSky.set(initial.outsideSky);
    atmo.gardenLight.set(initial.gardenLight);
    fog.color.copy(atmo.background);
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    // Three owns this mutable scene object; synchronizing its background is the
    // intended imperative boundary for the renderer.
    // eslint-disable-next-line react-hooks/immutability
    scene.background = atmo.background;
    // A shallow, color-matched depth haze separates the room layers without
    // blurring their pixel edges or requiring a post-processing depth texture.
    scene.fog = fog;
    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [fog, scene]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const {
      atmosphere,
      glowStartedAt,
      interactionSpot,
      momentAtmosphere,
    } = useSceneStore.getState();
    const activeAtmosphere = momentAtmosphere?.destination
      ?? interactionAtmosphere(atmosphere, interactionSpot);
    const preset = PRESETS[activeAtmosphere];
    const accepted = !!momentAtmosphere?.partnerResponded
      && momentAtmosphere.responseAction !== 'not_now';
    const eased = accepted ? 0.34 : 0;

    // Reconciliation glow over GLOW_DURATION seconds. Reduced motion holds one
    // static gold state rather than interpolating, pulsing, or fading it.
    const reduce = atmo.reduceMotion;
    let glow = 0;
    if (glowStartedAt != null) {
      const age = (Date.now() - glowStartedAt) / 1000;
      const glowDuration = reduce ? 1.25 : GLOW_DURATION;
      if (age < glowDuration) {
        const x = age / glowDuration;
        glow = reduce
          ? 0.35
          : Math.min(1, x * 8) * (1 - x) * (1 - x); // fast rise + slow decay
      }
    }
    atmo.glow = glow;

    target.tint.set(preset.tint).lerp(WARM_TINT, eased).lerp(GOLD, glow * 0.75);
    // Push slightly past white at the glow peak for a bloom-like lift (skipped
    // when reducing motion so there's no flash).
    target.tint.multiplyScalar(1 + glow * (reduce ? 0 : 0.25));
    target.bg.set(preset.bg).lerp(WARM_BG, eased).lerp(GOLD, glow * 0.16);
    target.outsideSky.set(preset.outsideSky).lerp(WARM_OUTSIDE_SKY, eased).lerp(GOLD, glow * 0.08);
    target.gardenLight.set(preset.gardenLight).lerp(WARM_GARDEN_LIGHT, eased).lerp(GOLD, glow * 0.06);

    const k = 1 - Math.exp(-3.2 * delta);
    if (reduce) {
      voxelTint.copy(target.tint);
      atmo.background.copy(target.bg);
      atmo.outsideSky.copy(target.outsideSky);
      atmo.gardenLight.copy(target.gardenLight);
    } else {
      voxelTint.lerp(target.tint, k);
      atmo.background.lerp(target.bg, k);
      atmo.outsideSky.lerp(target.outsideSky, k);
      atmo.gardenLight.lerp(target.gardenLight, k);
    }
    fog.color.copy(atmo.background);

    // The server ritual remains durable truth. A difficult Fireplace Moment
    // adds the same temporary "tending" presentation consumed by the hearth
    // status card; it never changes a contribution or stores a penalty.
    const ritualFire = useDailyRitualStore.getState().snapshot?.fire_state ?? 'steady';
    const momentSnapshot = useMomentV2Store.getState().snapshot;
    const activeFireplace = momentSnapshot?.active?.destination === 'fireplace';
    const readyCount = activeFireplace
      ? momentSnapshot.participants.filter((participant) => participant.readiness === true).length
      : 0;
    const presentation = firePresentation(
      ritualFire,
      activeFireplace,
      readyCount,
      useSceneStore.getState().readinessHeartComplete,
    );
    const baseFire = presentation.intensity;
    const targetFire = baseFire + glow * (reduce ? 0.3 : 0.8);
    atmo.fire = reduce
      ? targetFire
      : THREE.MathUtils.damp(atmo.fire, targetFire, 3.2, delta);
    const targetRain = preset.rain * (accepted ? 0.38 : 1);
    atmo.rain = reduce
      ? targetRain
      : THREE.MathUtils.damp(atmo.rain, targetRain, 2.5, delta);
  });

  return null;
}
