// Central place for the (provisional) app name and the visual palette.
// Swap APP_NAME once a final name is chosen — nothing else should hardcode it.
export const APP_NAME = 'Hearth';

export const ui = {
  overlayBg: 'rgba(24, 15, 11, 0.82)',
  overlayBorder: 'rgba(255, 200, 150, 0.18)',
  text: '#f5e6d8',
  textDim: '#b9a291',
  accent: '#e8a35c',
  accentSoft: 'rgba(232, 163, 92, 0.25)',
  chipBg: 'rgba(255, 220, 180, 0.10)',
  chipActiveBg: 'rgba(232, 163, 92, 0.35)',
  danger: '#c96f5a',
} as const;

// Bright, saturated Tuber-Simulator-style palette. Flat colors — all light
// and shade is baked by the voxel mesher.
export const room = {
  floorA: '#cd9a60',
  floorB: '#c08b52',
  wall: '#f0dcbc',
  wallShade: '#e3cca6',
  baseboard: '#b5824e',
  brick: '#bf5a40',
  brickDark: '#a84a34',
  fireplaceInner: '#241410',
  mantel: '#8a5a33',
  ember: '#ff9b3d',
  sofa: '#d05f48',
  sofaCushion: '#f4e4c4',
  woodDark: '#6e4526',
  tableWood: '#9a6236',
  plantPot: '#b06a3f',
  plantLeaf: '#59a04c',
  plantLeafDark: '#478540',
  doorWood: '#8a5a33',
  frameWhite: '#f6ecd8',
  nightSky: '#22304f',
  moon: '#f2ecd5',
  gardenGreen: '#3d6b3a',
  bedroomDark: '#1d1410',
  lamp: '#ffc061',
} as const;

export const avatarPresets = {
  a: { skin: '#f4c9a2', hair: '#4a2f1d', outfit: '#e08a4c', accent: '#c26f38' },
  b: { skin: '#ecb890', hair: '#6b4a2a', outfit: '#7ba05e', accent: '#63864c' },
} as const;
