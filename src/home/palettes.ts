export interface HomePaletteChoice {
  id: string;
  label: string;
  color: string;
}

export const HOME_PALETTES = {
  wood: [
    { id: 'honey-oak', label: 'Honey oak', color: '#a66f43' },
    { id: 'washed-ash', label: 'Washed ash', color: '#cbb99e' },
    { id: 'walnut', label: 'Walnut', color: '#664535' },
    { id: 'painted-cream', label: 'Painted cream', color: '#e9d9ba' },
  ],
  fabric: [
    { id: 'hearth-rose', label: 'Hearth rose', color: '#b96f73' },
    { id: 'oat-linen', label: 'Oat linen', color: '#d7c5a9' },
    { id: 'sage-cloth', label: 'Sage cloth', color: '#81917c' },
    { id: 'night-blue', label: 'Night blue', color: '#58677f' },
  ],
  wall: [
    { id: 'warm-plaster', label: 'Warm plaster', color: '#e9d8c3' },
    { id: 'blush-wash', label: 'Blush wash', color: '#d9ada7' },
    { id: 'garden-mist', label: 'Garden mist', color: '#b8c4b2' },
  ],
  floor: [
    { id: 'oak-board', label: 'Oak board', color: '#a77a54' },
    { id: 'pale-board', label: 'Pale board', color: '#ccb99c' },
    { id: 'dark-board', label: 'Dark board', color: '#5e4538' },
  ],
  metal: [
    { id: 'aged-brass', label: 'Aged brass', color: '#ad8a4e' },
    { id: 'warm-iron', label: 'Warm iron', color: '#55504d' },
    { id: 'soft-copper', label: 'Soft copper', color: '#a7674f' },
  ],
  stone: [
    { id: 'limestone', label: 'Limestone', color: '#c9bda7' },
    { id: 'river-grey', label: 'River grey', color: '#858b87' },
    { id: 'rose-stone', label: 'Rose stone', color: '#b8897d' },
  ],
  flower: [
    { id: 'peony', label: 'Peony', color: '#d57d91' },
    { id: 'marigold', label: 'Marigold', color: '#db9b45' },
    { id: 'lavender', label: 'Lavender', color: '#8e79a7' },
    { id: 'ivory-bloom', label: 'Ivory bloom', color: '#f0dfc5' },
  ],
  foliage: [
    { id: 'fern', label: 'Fern', color: '#57745b' },
    { id: 'sage-leaf', label: 'Sage leaf', color: '#829479' },
    { id: 'deep-leaf', label: 'Deep leaf', color: '#3f5c49' },
  ],
  terrain: [
    { id: 'summer-lawn', label: 'Summer lawn', color: '#78966a' },
    { id: 'soft-clover', label: 'Soft clover', color: '#6f8f67' },
    { id: 'woodland-moss', label: 'Woodland moss', color: '#65755a' },
    { id: 'garden-earth', label: 'Garden earth', color: '#7a5a42' },
  ],
  water: [
    { id: 'clear-blue', label: 'Clear blue', color: '#70aeb8' },
    { id: 'pond-green', label: 'Pond green', color: '#668f83' },
    { id: 'twilight-blue', label: 'Twilight blue', color: '#657f9d' },
  ],
  glass: [
    { id: 'clear-glass', label: 'Clear glass', color: '#b9d4d0' },
    { id: 'smoke-glass', label: 'Smoke glass', color: '#758889' },
    { id: 'rose-glass', label: 'Rose glass', color: '#d2a5a4' },
  ],
  paper: [
    { id: 'warm-paper', label: 'Warm paper', color: '#eadcc5' },
    { id: 'blue-paper', label: 'Blue paper', color: '#9baabd' },
    { id: 'rose-paper', label: 'Rose paper', color: '#d6a2a0' },
  ],
} as const satisfies Readonly<Record<string, readonly HomePaletteChoice[]>>;

export type HomePaletteSlot = keyof typeof HOME_PALETTES;

export function paletteChoices(slot: string): readonly HomePaletteChoice[] {
  return HOME_PALETTES[slot as HomePaletteSlot] ?? [];
}

export function paletteColor(
  style: Readonly<Record<string, unknown>>,
  slot: string,
  fallback: string,
) {
  const selected = style[slot];
  return paletteChoices(slot).find((choice) => choice.id === selected)?.color ?? fallback;
}
