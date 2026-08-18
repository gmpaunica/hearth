import type { CharacterColors, CharacterPoseId, CharacterRigRefs } from './characterTypes';
import { ReferenceAvatarFigure } from '@/scene/ReferenceAvatarFigure';

interface CharacterRendererProps {
  colors: CharacterColors;
  pose?: CharacterPoseId;
  rigRefs?: CharacterRigRefs;
  fixedPalette?: boolean;
}

/**
 * Canonical modular Hearth character renderer.
 *
 * Geometry is merged per movable body part, so a character keeps animation
 * pivots without paying one draw call per visible voxel.
 */
export function CharacterRenderer({
  colors,
  pose = 'idle',
  rigRefs,
  fixedPalette = false,
}: CharacterRendererProps) {
  return (
    <ReferenceAvatarFigure
      colors={colors}
      pose={pose}
      rigRefs={rigRefs}
      fixedPalette={fixedPalette}
    />
  );
}
