import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneStore } from '@/state/sceneStore';
import { atmo, GLOW_DURATION, PRESETS } from './atmoState';

const GOLD = new THREE.Color('#ffcf87');

/**
 * Owns the room lighting, fog and background, smoothly damping everything
 * toward the active preset each frame. Also drives the shared `atmo` values
 * (fire strength, rain amount, reconciliation glow) that particle systems read.
 */
export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);

  const colors = useMemo(
    () => ({
      bg: new THREE.Color(PRESETS.warm.bg),
      fog: new THREE.Color(PRESETS.warm.fogColor),
      hemiSky: new THREE.Color(PRESETS.warm.hemiSky),
      hemiGround: new THREE.Color(PRESETS.warm.hemiGround),
      amb: new THREE.Color(PRESETS.warm.ambColor),
      target: {
        bg: new THREE.Color(),
        fog: new THREE.Color(),
        hemiSky: new THREE.Color(),
        hemiGround: new THREE.Color(),
        amb: new THREE.Color(),
        outsideSky: new THREE.Color(),
        gardenLight: new THREE.Color(),
      },
    }),
    []
  );

  useEffect(() => {
    scene.background = colors.bg;
    scene.fog = new THREE.Fog(colors.fog, 9, 22);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene, colors]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const { atmosphere, glowStartedAt } = useSceneStore.getState();
    const preset = PRESETS[atmosphere];
    const t = colors.target;

    // Reconciliation glow: eased 1 -> 0 pulse over GLOW_DURATION seconds.
    let glow = 0;
    if (glowStartedAt != null) {
      const age = (Date.now() - glowStartedAt) / 1000;
      if (age < GLOW_DURATION) {
        const x = age / GLOW_DURATION;
        // Fast attack, slow golden decay.
        glow = Math.min(1, x * 8) * (1 - x) * (1 - x);
      }
    }
    atmo.glow = glow;

    t.bg.set(preset.bg);
    t.fog.set(preset.fogColor);
    t.hemiSky.set(preset.hemiSky).lerp(GOLD, glow * 0.6);
    t.hemiGround.set(preset.hemiGround).lerp(GOLD, glow * 0.3);
    t.amb.set(preset.ambColor).lerp(GOLD, glow * 0.7);
    t.outsideSky.set(preset.outsideSky);
    t.gardenLight.set(preset.gardenLight);

    const k = 1 - Math.exp(-3.2 * delta); // smooth exponential approach
    colors.bg.lerp(t.bg, k);
    colors.fog.lerp(t.fog, k);
    colors.hemiSky.lerp(t.hemiSky, k);
    colors.hemiGround.lerp(t.hemiGround, k);
    colors.amb.lerp(t.amb, k);
    atmo.outsideSky.lerp(t.outsideSky, k);
    atmo.gardenLight.lerp(t.gardenLight, k);

    atmo.fire = THREE.MathUtils.damp(atmo.fire, preset.fire + glow * 0.8, 3.2, delta);
    atmo.rain = THREE.MathUtils.damp(atmo.rain, preset.rain, 2.5, delta);

    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(colors.fog);

    const hemi = hemiRef.current;
    if (hemi) {
      hemi.color.copy(colors.hemiSky);
      hemi.groundColor.copy(colors.hemiGround);
      hemi.intensity = THREE.MathUtils.damp(
        hemi.intensity,
        preset.hemiIntensity + glow * 0.5,
        3.2,
        delta
      );
    }
    const amb = ambRef.current;
    if (amb) {
      amb.color.copy(colors.amb);
      amb.intensity = THREE.MathUtils.damp(
        amb.intensity,
        preset.ambIntensity + glow * 0.35,
        3.2,
        delta
      );
    }

    // Flickering firelight: layered sines make convincing organic noise.
    const fl = fireLightRef.current;
    if (fl) {
      const time = state.clock.elapsedTime;
      const flicker =
        0.86 +
        0.09 * Math.sin(time * 9.3) +
        0.05 * Math.sin(time * 23.7 + 1.7) +
        0.04 * Math.sin(time * 5.1 + 4.2);
      fl.intensity = 26 * atmo.fire * flicker;
      fl.position.x = -1.1 + Math.sin(time * 7.1) * 0.03;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} intensity={PRESETS.warm.hemiIntensity} position={[0, 8, 2]} />
      <ambientLight ref={ambRef} intensity={PRESETS.warm.ambIntensity} />
      {/* Firelight — the emotional heart of the room. */}
      <pointLight
        ref={fireLightRef}
        position={[-1.1, 1.0, -3.2]}
        color="#ff9a45"
        intensity={26}
        distance={13}
        decay={2}
      />
      {/* Soft cool fill from the window so shadows aren't pure black. */}
      <directionalLight position={[2.5, 4.5, -2]} intensity={0.18} color="#aebfdd" />
    </>
  );
}
