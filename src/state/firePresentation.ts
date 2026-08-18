import type { RitualFireState } from '@/lib/db';

export type FirePresentationState = RitualFireState | 'tending';

export interface FirePresentation {
  state: FirePresentationState;
  label: string;
  intensity: number;
  description: string;
}

const RITUAL_FIRE_LEVEL: Record<RitualFireState, number> = {
  low: 0.22,
  steady: 0.5,
  warming: 0.74,
  glowing: 1,
};

/**
 * The daily ritual remains the durable source of truth. A difficult Fireplace
 * Moment adds a temporary, client-only "tending" presentation so the room and
 * status copy acknowledge what is happening without creating a score or
 * changing either person's ritual contribution.
 */
export function firePresentation(
  ritualState: RitualFireState,
  activeFireplace: boolean,
  readyCount = 0,
  completing = false,
): FirePresentation {
  if (!activeFireplace) {
    return {
      state: ritualState,
      label: ritualState,
      intensity: RITUAL_FIRE_LEVEL[ritualState],
      description: 'Today\'s shared sketch ritual keeps this fire going.',
    };
  }

  if (completing || readyCount >= 2) {
    return {
      state: 'tending',
      label: 'tending',
      intensity: 1,
      description: 'You are both tending this difficult moment together.',
    };
  }

  return {
    state: 'tending',
    label: 'tending',
    intensity: readyCount === 1 ? 0.52 : Math.min(RITUAL_FIRE_LEVEL[ritualState], 0.32),
    description: readyCount === 1
      ? 'One half of the reconnect heart is warm.'
      : 'This difficult moment is being held gently at the fire.',
  };
}
