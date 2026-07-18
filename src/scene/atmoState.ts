import * as THREE from 'three';
import type { AtmosphereMode } from '@/state/sceneStore';

// Mutable, frame-damped atmosphere values shared between scene components
// without causing React re-renders. Atmosphere.tsx writes these every frame;
// Fire, Rain, Window etc. read them in their own useFrame callbacks.
export const atmo = {
  /** 0..~1.7 — flame + fire light strength (glow pulses push it above 1). */
  fire: 1,
  /** 0..1 — rain particle visibility. */
  rain: 0,
  /** 0..1 — golden reconciliation pulse. */
  glow: 0,
  /** Shared color instances; materials reference these directly. */
  outsideSky: new THREE.Color('#182238'),
  gardenLight: new THREE.Color('#3c5a38'),
};

export interface AtmoPreset {
  bg: string;
  fogColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambColor: string;
  ambIntensity: number;
  fire: number;
  rain: number;
  outsideSky: string;
  gardenLight: string;
}

export const PRESETS: Record<AtmosphereMode, AtmoPreset> = {
  warm: {
    bg: '#191009',
    fogColor: '#191009',
    hemiSky: '#ffc89e',
    hemiGround: '#573828',
    hemiIntensity: 0.85,
    ambColor: '#ffb877',
    ambIntensity: 0.38,
    fire: 1,
    rain: 0,
    outsideSky: '#1c2440',
    gardenLight: '#43653d',
  },
  cool: {
    bg: '#101319',
    fogColor: '#101319',
    hemiSky: '#96a9c4',
    hemiGround: '#2b3038',
    hemiIntensity: 0.65,
    ambColor: '#7f93ad',
    ambIntensity: 0.32,
    fire: 0.32,
    rain: 0,
    outsideSky: '#131a2e',
    gardenLight: '#2c4230',
  },
  rain: {
    bg: '#0d1015',
    fogColor: '#0d1015',
    hemiSky: '#8397b3',
    hemiGround: '#262b33',
    hemiIntensity: 0.6,
    ambColor: '#74889f',
    ambIntensity: 0.3,
    fire: 0.45,
    rain: 1,
    outsideSky: '#0e1424',
    gardenLight: '#243627',
  },
};

/** Duration of the reconciliation golden pulse, in seconds. */
export const GLOW_DURATION = 4.5;
