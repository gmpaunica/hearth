import type { CharacterPoseDefinition, CharacterPoseId } from './characterTypes';

const still = (): CharacterPoseDefinition => ({
  body: {},
  torso: {},
  head: {},
  leftArm: { rotation: [0, 0, 0.07] },
  rightArm: { rotation: [0, 0, -0.07] },
  leftLeg: {},
  rightLeg: {},
});

export const CHARACTER_POSES: Record<CharacterPoseId, CharacterPoseDefinition> = {
  idle: still(),
  sit: {
    ...still(),
    body: { position: [0, 0.08, 0] },
    torso: { rotation: [0.04, 0, 0] },
    leftArm: { rotation: [-0.18, 0, 0.13] },
    rightArm: { rotation: [-0.18, 0, -0.13] },
    leftLeg: { rotation: [-0.55, 0, 0] },
    rightLeg: { rotation: [-0.55, 0, 0] },
  },
  wave: {
    ...still(),
    head: { rotation: [0, 0, 0.05] },
    rightArm: { rotation: [0, 0, -2.3] },
  },
  holdObject: {
    ...still(),
    leftArm: { rotation: [-0.9, 0, 0.22] },
    rightArm: { rotation: [-0.9, 0, -0.22] },
  },
  sitTogether: {
    ...still(),
    body: { position: [0, 0.08, 0] },
    leftArm: { rotation: [-0.15, 0, 0.09] },
    rightArm: { rotation: [-0.15, 0, -0.09] },
    leftLeg: { rotation: [-0.55, 0, 0] },
    rightLeg: { rotation: [-0.55, 0, 0] },
  },
  hug: {
    ...still(),
    torso: { rotation: [0.03, 0, 0] },
    leftArm: { rotation: [-1.25, 0, -0.62] },
    rightArm: { rotation: [-1.25, 0, 0.62] },
  },
  holdHands: {
    ...still(),
    leftArm: { rotation: [-0.18, 0, -0.42] },
    rightArm: { rotation: [-0.18, 0, 0.42] },
  },
};

export function characterPose(id: CharacterPoseId) {
  return CHARACTER_POSES[id];
}
