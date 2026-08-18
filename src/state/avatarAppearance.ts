import { CHARACTER_PALETTE } from '@/character/characterPalette';

import type { AvatarKey } from './sceneStore';

export type AppearanceCategory =
  | 'skinTone'
  | 'hair'
  | 'eyes'
  | 'face'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'outfit'
  | 'accessory';

export interface AvatarAppearance {
  skinTone: string;
  hair: string;
  eyes: string;
  face: string;
  top: string;
  bottom: string;
  shoes: string;
  outfit: string;
  accessory: string;
}

export interface AppearanceOption {
  id: string;
  label: string;
  description?: string;
  color?: string;
  swatches?: string[];
}

export const APPEARANCE_OPTIONS: Record<AppearanceCategory, AppearanceOption[]> = {
  skinTone: [
    { id: 'porcelain', label: 'Porcelain', color: '#f0d3c2' },
    { id: 'peach', label: 'Peach', color: CHARACTER_PALETTE.skin.peach },
    { id: 'honey', label: 'Honey', color: '#d99b6c' },
    { id: 'amber', label: 'Amber', color: '#b97852' },
    { id: 'cocoa', label: 'Cocoa', color: '#8b583f' },
    { id: 'deep', label: 'Deep', color: '#5b392f' },
  ],
  hair: [
    { id: 'textured-crop', label: 'Tousled crop', color: CHARACTER_PALETTE.hair.chocolate },
    { id: 'curly-volume', label: 'Cloud curls', color: '#201a17' },
    { id: 'center-part', label: 'Soft center part', color: '#7a3d22' },
    { id: 'layered-bob', label: 'Layered bob', color: '#4a2d20' },
    { id: 'long-waves', label: 'Long soft waves', color: CHARACTER_PALETTE.hair.auburn },
    { id: 'braided-pony', label: 'High puff', color: '#201814' },
    { id: 'butterfly-layers', label: 'High bun', color: '#c7832f' },
    { id: 'soft-wolf', label: 'Feathered shag', color: '#402a20' },
    { id: 'italian-bob', label: 'Rounded bob', color: '#302019' },
    { id: 'modern-mullet', label: 'Copper crop', color: '#9f411e' },
    { id: 'beanie-crop', label: 'Beanie crop', color: '#2a211b' },
  ],
  eyes: [
    { id: 'round', label: 'Round' },
    { id: 'almond', label: 'Almond' },
    { id: 'upturned', label: 'Upturned' },
    { id: 'soft-lidded', label: 'Soft lidded' },
  ],
  face: [
    { id: 'soft', label: 'Soft smile' },
    { id: 'bright', label: 'Bright smile' },
    { id: 'calm', label: 'Calm gaze' },
  ],
  top: [
    { id: 'moss-hoodie', label: 'Olive hoodie', color: CHARACTER_PALETTE.clothes.olive },
    {
      id: 'berry-puffer',
      label: 'Coral sweater',
      swatches: [
        CHARACTER_PALETTE.clothes.coral,
        CHARACTER_PALETTE.clothes.coralLight,
        CHARACTER_PALETTE.clothes.coralDark,
      ],
    },
    { id: 'oatmeal-knit', label: 'Oatmeal knit', color: '#e5cfaa' },
    { id: 'garden-overalls', label: 'Garden overalls', swatches: ['#536b35', '#ead9bb'] },
    { id: 'golden-cardigan', label: 'Golden cardigan', color: '#c88727' },
    { id: 'denim-weekend', label: 'Denim jacket', swatches: ['#4d6270', '#eee0c8'] },
    { id: 'lilac-cardigan', label: 'Lilac cardigan', swatches: ['#9b78a8', '#df9f62'] },
    { id: 'ember-hoodie', label: 'Ember hoodie', color: '#9f412b' },
  ],
  bottom: [
    { id: 'straight-denim', label: 'Slate jeans', color: '#374149' },
    { id: 'wide-trousers', label: 'Cocoa trousers', color: '#6b452b' },
    { id: 'pleated-skirt', label: 'Ivory pleated skirt', color: '#e7d7ba' },
    { id: 'carpenter-cargos', label: 'Sage carpenter trousers', color: '#647044' },
    { id: 'tailored-shorts', label: 'Charcoal trousers', color: CHARACTER_PALETTE.clothes.charcoal },
  ],
  shoes: [
    { id: 'retro-sneakers', label: 'Cream trainers', color: CHARACTER_PALETTE.clothes.cream },
    { id: 'mary-janes', label: 'Brown Mary Janes', color: '#704126' },
    { id: 'loafers', label: 'Chestnut loafers', color: '#55351f' },
    { id: 'ankle-boots', label: 'Lace-up boots', color: '#693e1e' },
    { id: 'derby-shoes', label: 'Walking shoes', color: '#403028' },
  ],
  outfit: [
    {
      id: 'none',
      label: 'Mix and match',
      description: 'Use your selected top, bottoms and shoes',
      swatches: ['#666b47', '#374149', '#e7d7ba'],
    },
    {
      id: 'heritage-street',
      label: 'Olive Hoodie',
      description: 'Soft green hoodie, charcoal chinos and cream trainers',
      swatches: ['#666b47', '#968742', '#3a3428', '#e7d7ba'],
    },
    {
      id: 'layered-90s',
      label: 'Coral Sweater',
      description: 'Coral crew sweater, slate jeans and cocoa boots',
      swatches: ['#c25e4b', '#d6785a', '#374149', '#693e1e'],
    },
    {
      id: 'modern-prep',
      label: 'Oatmeal Morning',
      description: 'Chunky cream knit, cocoa trousers and warm walking shoes',
      swatches: ['#e5cfaa', '#f1e5ce', '#6b452b', '#51301f'],
    },
    {
      id: 'slip-dress',
      label: 'Garden Overalls',
      description: 'Forest overalls, linen blouse and honey work shoes',
      swatches: ['#536b35', '#748946', '#ead9bb', '#9a6031'],
    },
    {
      id: 'soft-tailoring',
      label: 'Golden Cardigan',
      description: 'Ochre cardigan, airy ivory skirt and brown Mary Janes',
      swatches: ['#c88727', '#e1a441', '#e7d7ba', '#704126'],
    },
    {
      id: 'relaxed-suit',
      label: 'Denim Weekend',
      description: 'Slate denim jacket, cream tee and cocoa trousers',
      swatches: ['#4d6270', '#718592', '#eee0c8', '#6b452b'],
    },
    {
      id: 'lilac-layers',
      label: 'Lilac Layers',
      description: 'Lilac cardigan, cream dress and brown ankle boots',
      swatches: ['#9b78a8', '#bd98c6', '#df9f62', '#e7d7ba'],
    },
    {
      id: 'ember-hoodie',
      label: 'Ember Hoodie',
      description: 'Rust hoodie, charcoal trousers and cream trainers',
      swatches: ['#9f412b', '#bd5a3b', '#373731', '#e8ddc7'],
    },
  ],
  accessory: [
    { id: 'beaded-necklace', label: 'Cheerful bead necklace', color: '#df6b58' },
    { id: 'technical-pack', label: 'Little canvas backpack', color: '#455967' },
    { id: 'metal-frames', label: 'Round brass frames', color: '#c69b55' },
    { id: 'brooch-cluster', label: 'Tiny flower pins', color: '#d4a13d' },
    { id: 'zigzag-headband', label: 'Rose headband', color: '#dc7c84' },
    { id: 'cream-beanie', label: 'Cream knit beanie', color: '#ddc9a5' },
    { id: 'none', label: 'No accessory' },
  ],
};

/** The eight figures in the approved concept sheet, ordered left-to-right. */
export const CHARACTER_PRESETS: Record<string, AvatarAppearance> = {
  'heritage-street': {
    skinTone: 'peach',
    hair: 'textured-crop',
    eyes: 'almond',
    face: 'calm',
    top: 'moss-hoodie',
    bottom: 'tailored-shorts',
    shoes: 'retro-sneakers',
    outfit: 'heritage-street',
    accessory: 'none',
  },
  'layered-90s': {
    skinTone: 'peach',
    hair: 'long-waves',
    eyes: 'almond',
    face: 'calm',
    top: 'berry-puffer',
    bottom: 'straight-denim',
    shoes: 'ankle-boots',
    outfit: 'layered-90s',
    accessory: 'none',
  },
  'modern-prep': {
    skinTone: 'amber',
    hair: 'curly-volume',
    eyes: 'almond',
    face: 'calm',
    top: 'oatmeal-knit',
    bottom: 'wide-trousers',
    shoes: 'retro-sneakers',
    outfit: 'modern-prep',
    accessory: 'none',
  },
  'slip-dress': {
    skinTone: 'peach',
    hair: 'butterfly-layers',
    eyes: 'almond',
    face: 'soft',
    top: 'garden-overalls',
    bottom: 'carpenter-cargos',
    shoes: 'derby-shoes',
    outfit: 'slip-dress',
    accessory: 'none',
  },
  'soft-tailoring': {
    skinTone: 'cocoa',
    hair: 'braided-pony',
    eyes: 'almond',
    face: 'bright',
    top: 'golden-cardigan',
    bottom: 'pleated-skirt',
    shoes: 'mary-janes',
    outfit: 'soft-tailoring',
    accessory: 'zigzag-headband',
  },
  'relaxed-suit': {
    skinTone: 'peach',
    hair: 'modern-mullet',
    eyes: 'almond',
    face: 'calm',
    top: 'denim-weekend',
    bottom: 'wide-trousers',
    shoes: 'retro-sneakers',
    outfit: 'relaxed-suit',
    accessory: 'none',
  },
  'lilac-layers': {
    skinTone: 'peach',
    hair: 'layered-bob',
    eyes: 'almond',
    face: 'bright',
    top: 'lilac-cardigan',
    bottom: 'pleated-skirt',
    shoes: 'ankle-boots',
    outfit: 'lilac-layers',
    accessory: 'none',
  },
  'ember-hoodie': {
    skinTone: 'amber',
    hair: 'beanie-crop',
    eyes: 'almond',
    face: 'calm',
    top: 'ember-hoodie',
    bottom: 'tailored-shorts',
    shoes: 'retro-sneakers',
    outfit: 'ember-hoodie',
    accessory: 'cream-beanie',
  },
};

export function applyCharacterPreset(base: AvatarAppearance, outfitId: string): AvatarAppearance {
  const look = CHARACTER_PRESETS[outfitId];
  if (!look) return { ...base, outfit: outfitId };
  // A full look changes clothing, not the person's face, hair, skin or chosen
  // accessory. The reference presets remain available to defaults/Character
  // Lab, while Wardrobe keeps identity details stable.
  return {
    ...base,
    top: look.top,
    bottom: look.bottom,
    shoes: look.shoes,
    outfit: look.outfit,
  };
}

export const DEFAULT_APPEARANCE: Record<AvatarKey, AvatarAppearance> = {
  // Stable membership colors: member A is coral/red, member B is green.
  a: { ...CHARACTER_PRESETS['layered-90s'] },
  b: { ...CHARACTER_PRESETS['heritage-street'] },
};

const VALID_CATEGORIES: AppearanceCategory[] = [
  'skinTone',
  'hair',
  'eyes',
  'face',
  'top',
  'bottom',
  'shoes',
  'outfit',
  'accessory',
];

const HIDDEN_COMPATIBILITY_IDS: Partial<Record<AppearanceCategory, readonly string[]>> = {
  top: [
    'boxy-tee',
    'striped-rugby',
    'cropped-cardigan',
    'oversized-hoodie',
    'fitted-turtleneck',
  ],
  bottom: ['dress-skirt'],
};

function optionExists(category: AppearanceCategory, id: unknown): id is string {
  return typeof id === 'string' && (
    APPEARANCE_OPTIONS[category].some((option) => option.id === id)
    || HIDDEN_COMPATIBILITY_IDS[category]?.includes(id) === true
  );
}

export function sanitizeAppearance(value: unknown, fallback: AvatarAppearance): AvatarAppearance {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Record<string, unknown>;
  const next = { ...fallback };
  for (const category of VALID_CATEGORIES) {
    if (optionExists(category, candidate[category])) next[category] = candidate[category];
  }
  return next;
}

function optionColor(category: AppearanceCategory, id: string, fallback: string): string {
  return APPEARANCE_OPTIONS[category].find((option) => option.id === id)?.color ?? fallback;
}

interface OutfitPalette {
  outer: string;
  inner: string;
  bottom: string;
  shoes: string;
  detail: string;
}

const OUTFIT_PALETTES: Record<string, OutfitPalette> = {
  'heritage-street': {
    outer: CHARACTER_PALETTE.clothes.olive,
    inner: CHARACTER_PALETTE.clothes.oliveLight,
    bottom: CHARACTER_PALETTE.clothes.charcoal,
    shoes: CHARACTER_PALETTE.clothes.cream,
    detail: CHARACTER_PALETTE.clothes.oliveDark,
  },
  'modern-prep': {
    outer: '#e5cfaa',
    inner: '#f1e5ce',
    bottom: '#6b452b',
    shoes: CHARACTER_PALETTE.clothes.cream,
    detail: '#b67c3f',
  },
  'layered-90s': {
    outer: CHARACTER_PALETTE.clothes.coral,
    inner: CHARACTER_PALETTE.clothes.coralLight,
    bottom: '#374149',
    shoes: '#693e1e',
    detail: CHARACTER_PALETTE.clothes.coralDark,
  },
  'soft-tailoring': {
    outer: '#c88727',
    inner: '#f0dfc2',
    bottom: '#e7d7ba',
    shoes: '#693e1e',
    detail: '#7f4b28',
  },
  'slip-dress': {
    outer: '#536b35',
    inner: '#ead9bb',
    bottom: '#536b35',
    shoes: '#aa7847',
    detail: '#d8a957',
  },
  'relaxed-suit': {
    outer: '#4d6270',
    inner: '#eee0c8',
    bottom: '#6b452b',
    shoes: '#4b443b',
    detail: '#d6a253',
  },
  'lilac-layers': {
    outer: '#9b78a8',
    inner: '#f1dfc4',
    bottom: '#e7d7ba',
    shoes: '#693e1e',
    detail: '#df9f62',
  },
  'ember-hoodie': {
    outer: '#9f412b',
    inner: '#bd5a3b',
    bottom: CHARACTER_PALETTE.clothes.charcoal,
    shoes: CHARACTER_PALETTE.clothes.cream,
    detail: '#e4c493',
  },
};

const TOP_PALETTES: Record<string, Pick<OutfitPalette, 'outer' | 'inner' | 'detail'>> = {
  'moss-hoodie': {
    outer: CHARACTER_PALETTE.clothes.olive,
    inner: CHARACTER_PALETTE.clothes.oliveLight,
    detail: CHARACTER_PALETTE.clothes.oliveDark,
  },
  'berry-puffer': {
    outer: CHARACTER_PALETTE.clothes.coral,
    inner: CHARACTER_PALETTE.clothes.coralLight,
    detail: CHARACTER_PALETTE.clothes.coralDark,
  },
  'oatmeal-knit': { outer: '#e5cfaa', inner: '#f1e5ce', detail: '#b67c3f' },
  'garden-overalls': { outer: '#536b35', inner: '#ead9bb', detail: '#d8a957' },
  'golden-cardigan': { outer: '#c88727', inner: '#f0dfc2', detail: '#7f4b28' },
  'denim-weekend': { outer: '#4d6270', inner: '#eee0c8', detail: '#d6a253' },
  'lilac-cardigan': { outer: '#9b78a8', inner: '#f1dfc4', detail: '#df9f62' },
  'ember-hoodie': { outer: '#9f412b', inner: '#bd5a3b', detail: '#7d2f22' },
  // Compatibility for profiles saved before the reference redesign.
  'boxy-tee': {
    outer: CHARACTER_PALETTE.clothes.olive,
    inner: CHARACTER_PALETTE.clothes.oliveLight,
    detail: CHARACTER_PALETTE.clothes.oliveDark,
  },
  'striped-rugby': {
    outer: CHARACTER_PALETTE.clothes.coral,
    inner: CHARACTER_PALETTE.clothes.coralLight,
    detail: CHARACTER_PALETTE.clothes.coralDark,
  },
  'cropped-cardigan': { outer: '#c88727', inner: '#f0dfc2', detail: '#7f4b28' },
  'oversized-hoodie': { outer: '#9f412b', inner: '#bd5a3b', detail: '#7d2f22' },
  'fitted-turtleneck': { outer: '#e5cfaa', inner: '#f1e5ce', detail: '#b67c3f' },
};

const BOTTOM_COLORS: Record<string, string> = {
  'straight-denim': '#374149',
  'wide-trousers': '#6b452b',
  'pleated-skirt': '#e7d7ba',
  'carpenter-cargos': '#647044',
  'tailored-shorts': CHARACTER_PALETTE.clothes.charcoal,
};

const SHOE_COLORS: Record<string, string> = {
  'retro-sneakers': CHARACTER_PALETTE.clothes.cream,
  'mary-janes': '#704126',
  loafers: '#55351f',
  'ankle-boots': '#693e1e',
  'derby-shoes': '#403028',
};

interface FullLookParts {
  topStyle: string;
  bottomStyle: string;
  shoeStyle: string;
}

const FULL_LOOK_PARTS: Record<string, FullLookParts> = {
  'heritage-street': { topStyle: 'moss-hoodie', bottomStyle: 'tailored-shorts', shoeStyle: 'retro-sneakers' },
  'modern-prep': { topStyle: 'oatmeal-knit', bottomStyle: 'wide-trousers', shoeStyle: 'retro-sneakers' },
  'layered-90s': { topStyle: 'berry-puffer', bottomStyle: 'straight-denim', shoeStyle: 'ankle-boots' },
  'soft-tailoring': { topStyle: 'golden-cardigan', bottomStyle: 'pleated-skirt', shoeStyle: 'mary-janes' },
  'slip-dress': { topStyle: 'garden-overalls', bottomStyle: 'carpenter-cargos', shoeStyle: 'derby-shoes' },
  'relaxed-suit': { topStyle: 'denim-weekend', bottomStyle: 'wide-trousers', shoeStyle: 'retro-sneakers' },
  'lilac-layers': { topStyle: 'lilac-cardigan', bottomStyle: 'pleated-skirt', shoeStyle: 'ankle-boots' },
  'ember-hoodie': { topStyle: 'ember-hoodie', bottomStyle: 'tailored-shorts', shoeStyle: 'retro-sneakers' },
};

const HAIR_ACCENTS: Record<string, string> = {
  'textured-crop': CHARACTER_PALETTE.hair.chocolateLight,
  'curly-volume': '#49352a',
  'center-part': '#ae6032',
  'layered-bob': '#7a4930',
  'long-waves': CHARACTER_PALETTE.hair.auburnLight,
  'braided-pony': '#4c3a2b',
  'butterfly-layers': '#e2a24a',
  'soft-wolf': '#72503b',
  'italian-bob': '#5c3b2a',
  'modern-mullet': '#c06c36',
  'beanie-crop': '#5b4638',
};

/** Resolve saved choices into the shared coarse concept-sheet renderer. */
export function appearanceToAvatarColors(appearance: AvatarAppearance) {
  const fullLook = appearance.outfit !== 'none' ? FULL_LOOK_PARTS[appearance.outfit] : undefined;
  const modularTop = TOP_PALETTES[appearance.top] ?? TOP_PALETTES['moss-hoodie'];
  const palette = fullLook
    ? (OUTFIT_PALETTES[appearance.outfit] ?? OUTFIT_PALETTES['heritage-street'])
    : {
        ...modularTop,
        bottom: BOTTOM_COLORS[appearance.bottom] ?? BOTTOM_COLORS['straight-denim'],
        shoes: SHOE_COLORS[appearance.shoes] ?? SHOE_COLORS['retro-sneakers'],
      };
  return {
    skin: optionColor('skinTone', appearance.skinTone, CHARACTER_PALETTE.skin.peach),
    hair: optionColor('hair', appearance.hair, CHARACTER_PALETTE.hair.chocolate),
    // Expressions change voxel placement, never eye pigment.
    face: CHARACTER_PALETTE.face,
    faceStyle: appearance.face,
    eyeStyle: appearance.eyes,
    hairStyle: appearance.hair,
    hairAccent: HAIR_ACCENTS[appearance.hair] ?? '#4b2c20',
    outfitStyle: fullLook ? appearance.outfit : 'modular',
    topStyle: fullLook?.topStyle ?? appearance.top,
    bottomStyle: fullLook?.bottomStyle ?? appearance.bottom,
    shoeStyle: fullLook?.shoeStyle ?? appearance.shoes,
    accessory: appearance.accessory,
    ...palette,
  };
}
