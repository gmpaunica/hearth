import type { RefObject } from 'react';
import type * as THREE from 'three';

import type { AvatarAppearance } from '@/state/avatarAppearance';

export type CharacterPoseId =
  | 'idle'
  | 'sit'
  | 'wave'
  | 'holdObject'
  | 'sitTogether'
  | 'hug'
  | 'holdHands';

export interface CharacterPreset {
  id: string;
  name: string;
  referenceIndex: number;
  appearance: AvatarAppearance;
  pose: CharacterPoseId;
}

export interface CharacterColors {
  skin: string;
  hair: string;
  hairAccent: string;
  face: string;
  faceStyle: string;
  eyeStyle: string;
  hairStyle: string;
  outfitStyle: string;
  topStyle: string;
  bottomStyle: string;
  shoeStyle: string;
  accessory: string;
  outer: string;
  inner: string;
  bottom: string;
  shoes: string;
  detail: string;
}

export interface CharacterRigRefs {
  bodyRoot?: RefObject<THREE.Group | null>;
  hips?: RefObject<THREE.Group | null>;
  torso?: RefObject<THREE.Group | null>;
  head?: RefObject<THREE.Group | null>;
  leftArm?: RefObject<THREE.Group | null>;
  rightArm?: RefObject<THREE.Group | null>;
  leftLeg?: RefObject<THREE.Group | null>;
  rightLeg?: RefObject<THREE.Group | null>;
}

export interface CharacterPartTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface CharacterPoseDefinition {
  body: CharacterPartTransform;
  torso: CharacterPartTransform;
  head: CharacterPartTransform;
  leftArm: CharacterPartTransform;
  rightArm: CharacterPartTransform;
  leftLeg: CharacterPartTransform;
  rightLeg: CharacterPartTransform;
}
