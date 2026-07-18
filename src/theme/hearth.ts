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

export const room = {
  floor: '#8a5a3b',
  rugOuter: '#a34f2f',
  rugInner: '#c97a52',
  wall: '#8c6753',
  wallTrim: '#6f4e3d',
  fireplaceStone: '#5b4a42',
  fireplaceInner: '#120a06',
  mantel: '#6f4a2f',
  sofa: '#a35a44',
  sofaCushion: '#bf7355',
  woodDark: '#4a3222',
  tableWood: '#7a4e2e',
  plantPot: '#8f5b3a',
  plantLeaf: '#5f7d4f',
  doorWood: '#6b452a',
  glass: '#a8c4d4',
  nightSky: '#10131f',
  gardenGreen: '#243623',
} as const;

export const avatarPresets = {
  a: { skin: '#f2c9a0', hair: '#3b2a20', outfit: '#d98354', accent: '#b25f38' },
  b: { skin: '#e8b58f', hair: '#5a4632', outfit: '#7d9b76', accent: '#5d7a58' },
} as const;
