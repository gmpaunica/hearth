import { CHARACTER_PRESETS } from '@/state/avatarAppearance';

import type { CharacterPreset } from './characterTypes';

const PRESET_META = [
  ['heritage-street', 'Green Hoodie'],
  ['layered-90s', 'Coral Sweater'],
  ['modern-prep', 'Character 03'],
  ['slip-dress', 'Character 04'],
  ['soft-tailoring', 'Character 05'],
  ['relaxed-suit', 'Character 06'],
  ['lilac-layers', 'Character 07'],
  ['ember-hoodie', 'Character 08'],
] as const;

/** Ordered one-to-one reproductions of the eight approved concept-sheet figures. */
export const REFERENCE_CHARACTER_PRESETS: CharacterPreset[] = PRESET_META.map(
  ([id, name], index) => ({
    id,
    name,
    referenceIndex: index + 1,
    appearance: { ...CHARACTER_PRESETS[id] },
    pose: 'idle',
  }),
);

export function createCharacterPreset(
  preset: Omit<CharacterPreset, 'referenceIndex'> & { referenceIndex?: number },
): CharacterPreset {
  return {
    ...preset,
    referenceIndex: preset.referenceIndex ?? REFERENCE_CHARACTER_PRESETS.length + 1,
    appearance: { ...preset.appearance },
  };
}
