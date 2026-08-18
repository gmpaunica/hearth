import type { AvatarKey } from './sceneStore';

export interface AvatarIdentity {
  myAvatar: AvatarKey;
  partnerAvatar: AvatarKey;
}

/**
 * Couple membership is the permanent identity source for the shared scene.
 * The home creator/member A owns the red A avatar; member B owns the green B
 * avatar. Both phones therefore render the same person in the same scene slot.
 */
export function avatarIdentityFor(userId: string, memberA: string): AvatarIdentity {
  return userId === memberA
    ? { myAvatar: 'a', partnerAvatar: 'b' }
    : { myAvatar: 'b', partnerAvatar: 'a' };
}
