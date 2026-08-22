import type { GardenTier, HomeRoomKind, HomeRoomSize, HomeSnapshot } from './types';

export const HOME_UNLOCK_MILESTONES = [
  { id: 'moving-in', seconds: 0, label: 'Compact living room and core fixtures' },
  { id: 'first-finishes', seconds: 3 * 86_400, label: 'Finishes, lighting, decor, and planters' },
  { id: 'living-standard', seconds: 144 * 3_600, label: 'Standard living-room expansion' },
  { id: 'fireplace-tier-2', seconds: 14 * 86_400, label: 'Fireplace tier II' },
  { id: 'bedroom', seconds: 21 * 86_400, label: 'Bedroom, beds, and wardrobes' },
  { id: 'garden-standard', seconds: 30 * 86_400, label: 'Standard garden' },
  { id: 'large-options', seconds: 60 * 86_400, label: 'Large rooms and garden structures' },
  { id: 'garden-large', seconds: 90 * 86_400, label: 'Large garden and major water features' },
  { id: 'fireplace-tier-3', seconds: 90 * 86_400, label: 'Fireplace tier III' },
  { id: 'garden-grand', seconds: 180 * 86_400, label: 'Grand garden and monumental pieces' },
] as const;

export function activeGrowthDays(snapshot: Pick<HomeSnapshot, 'activeGrowthSeconds'>) {
  return Math.max(0, snapshot.activeGrowthSeconds / 86_400);
}

export function roomSizeUnlockDay(room: HomeRoomKind, size: HomeRoomSize) {
  if (size === 'compact') return 0;
  if (size === 'large') return 60;
  if (room === 'living') return 6;
  if (room === 'bedroom') return 21;
  return 60;
}

export function gardenTierUnlockDay(tier: GardenTier) {
  if (tier === 'courtyard') return 0;
  if (tier === 'standard') return 30;
  if (tier === 'large') return 90;
  return 180;
}

export function moduleUnlockDay(moduleId: 'bedroom' | 'future-room') {
  return moduleId === 'bedroom' ? 21 : 60;
}
