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

// The application layer sits over the voxel diorama like warm stationery:
// translucent ivory, cocoa ink, and a restrained terracotta accent. Keep this
// separate from `ui` for now because the wardrobe and a few in-scene notices
// still use the older dark-surface contract.
export const editorial = {
  canvas: '#f3e5d2',
  paper: 'rgba(255, 250, 241, 0.96)',
  paperStrong: '#fffaf1',
  paperSoft: 'rgba(255, 247, 235, 0.9)',
  paperTint: '#f7e8d5',
  ink: '#422b21',
  inkSoft: '#725c4d',
  inkFaint: '#9a806d',
  clay: '#bd5133',
  clayDark: '#873521',
  claySoft: 'rgba(189, 81, 51, 0.12)',
  clayWash: '#f4d8c7',
  rose: '#c97061',
  sage: '#78825a',
  sageSoft: 'rgba(120, 130, 90, 0.14)',
  gold: '#c28a45',
  line: 'rgba(103, 67, 45, 0.16)',
  lineStrong: 'rgba(153, 76, 45, 0.3)',
  scrim: 'rgba(61, 37, 25, 0.4)',
  shadow: '#5a3322',
  onAccent: '#fffaf2',
  danger: '#a74232',
} as const;

export const momentsTypography = {
  heading: 'HearthFredoka',
  body: 'HearthNunito',
  bodyBold: 'HearthNunito-ExtraBold',
} as const;

// Tactile stationery tokens shared by the review-gate surfaces. These keep
// buttons, chips, cards, and media frames recognizably Hearth without importing
// the reference mockup's navigation or screen structure.
export const hearthUi = {
  shell: '#FFF8EE',
  shellRaised: '#FFFCF7',
  shellWarm: '#FCEBDD',
  coral: '#F16F7F',
  coralDark: '#C74E61',
  coralHighlight: '#FFB2B8',
  peach: '#FFC69F',
  blush: '#F8D1D6',
  lavender: '#E7D7F5',
  sage: '#CFE2C5',
  sky: '#D8EAF7',
  butter: '#F8E4A8',
  cocoa: '#4B2E24',
  cocoaSoft: '#77594B',
  hairline: 'rgba(111, 65, 48, 0.14)',
  outline: 'rgba(171, 91, 63, 0.32)',
  shadow: '#6C3C2D',
} as const;

// Bright, saturated Tuber-Simulator-style palette. Flat colors — all light
// and shade is baked by the voxel mesher.
export const room = {
  floorA: '#d6a057',
  floorB: '#c8914a',
  floorGrout: '#9c6b38',
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

// Stable member colors sampled from the approved character reference sheet.
export const avatarPresets = {
  a: { skin: '#e6bc88', hair: '#87380a', outfit: '#c25e4b', accent: '#9f433a' },
  b: { skin: '#e6bc88', hair: '#6b3c1b', outfit: '#666b47', accent: '#48482f' },
} as const;
