import * as THREE from 'three';
import type { AtmosphereMode } from '@/state/sceneStore';

// Mutable, frame-damped atmosphere values shared between scene components
// without causing React re-renders. Atmosphere.tsx writes these every frame;
// Fire, Rain, the sky backdrop etc. read them in their own useFrame callbacks.
export const atmo = {
  /** 0..~1.7 — flame strength (glow pulses push it above 1). */
  fire: 1,
  /** 0..1 — rain particle visibility. */
  rain: 0,
  /** 0..1 — golden reconciliation pulse. */
  glow: 0,
  /** OS "reduce motion" is on — soften the glow (no bloom spike / swirl). */
  reduceMotion: false,
  /** Shared color instances; materials reference these directly. */
  outsideSky: new THREE.Color('#22304f'),
  gardenLight: new THREE.Color('#3d6b3a'),
  background: new THREE.Color('#1a2340'),
};

export interface AtmoPreset {
  /** Global multiplier tint applied to every voxel (the mood). */
  tint: string;
  bg: string;
  fire: number;
  rain: number;
  outsideSky: string;
  gardenLight: string;
}

export const PRESETS: Record<AtmosphereMode, AtmoPreset> = {
  warm: {
    tint: '#fff3e2',
    bg: '#1a2340',
    fire: 1,
    rain: 0,
    outsideSky: '#22304f',
    gardenLight: '#3d6b3a',
  },
  cool: {
    tint: '#adbad4',
    bg: '#141b30',
    fire: 0.35,
    rain: 0,
    outsideSky: '#182238',
    gardenLight: '#2c4a30',
  },
  rain: {
    tint: '#9aa9c4',
    bg: '#111726',
    fire: 0.5,
    rain: 1,
    outsideSky: '#131c30',
    gardenLight: '#26402c',
  },
};

/** Duration of the reconciliation golden pulse, in seconds. */
export const GLOW_DURATION = 4.5;
