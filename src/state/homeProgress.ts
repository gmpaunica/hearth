import { useMemo } from 'react';

import type { SignalType } from '@/copy';
import { useAuthStore } from './authStore';
import { useHomeStore } from './homeStore';

export type HomeComponent =
  | 'fireplace'
  | 'restnook'
  | 'easel'
  | 'sofa'
  | 'table'
  | 'bookshelf'
  | 'plants'
  | 'bed'
  | 'garden';

export interface HomeStage {
  atDays: number;
  title: string;
  blurb: string;
  discoveries: string[];
  components: HomeComponent[];
  signals: SignalType[];
}

/** Production pacing is always enforced by the server. */
export const PREVIEW_UNLOCK_ALL = false;

export const HOME_STAGES: HomeStage[] = [
  {
    atDays: 0,
    title: 'Moving in',
    blurb: 'A small shared place is ready for your first ordinary days together.',
    discoveries: ['The living room', 'Moments by the fire', 'Your daily sketch'],
    components: ['fireplace', 'restnook', 'easel', 'sofa', 'table'],
    signals: ['fireplace', 'rest', 'sofa', 'table', 'romantic', 'garden'],
  },
  {
    atDays: 3,
    title: 'Signs of you',
    blurb: 'A few thoughtful details are ready whenever you feel like making the place yours.',
    discoveries: ['Room finishes', 'Gentle lighting and decor', 'Small indoor plants'],
    components: ['plants'],
    signals: [],
  },
  {
    atDays: 6,
    title: 'A little more room',
    blurb: 'The living room has opened up, with more breathing room for the things you keep here.',
    discoveries: ['A roomier living room', 'More space for shared pieces'],
    components: [],
    signals: [],
  },
  {
    atDays: 14,
    title: 'A warmer hearth',
    blurb: 'The heart of the room has gained a little more warmth and character.',
    discoveries: ['A new fireplace style', 'Bookshelf and architectural details'],
    components: ['bookshelf'],
    signals: [],
  },
  {
    atDays: 21,
    title: 'Growing closer',
    blurb: 'A quieter room is ready for rest, closeness, and the character of your shared home.',
    discoveries: ['The bedroom', 'Beds and bedside pieces', 'Wardrobes and bedroom seating'],
    components: ['bed', 'easel'],
    signals: [],
  },
  {
    atDays: 30,
    title: 'Room to grow',
    blurb: 'The garden gate has opened onto a calm place for space, memories, and fresh details.',
    discoveries: ['The garden', 'Paths, planting, and seating', 'The memory greenhouse'],
    components: ['garden'],
    signals: [],
  },
  {
    atDays: 60,
    title: 'Room to imagine',
    blurb: 'There is more room to shape each place in a way that feels like the two of you.',
    discoveries: ['Larger interior layouts', 'Garden structures', 'A future extra room'],
    components: [],
    signals: [],
  },
  {
    atDays: 90,
    title: 'A garden landmark',
    blurb: 'The garden has space for one meaningful landmark and a fuller gathering place.',
    discoveries: ['A larger garden', 'Ponds and fountains', 'A grander fireplace style'],
    components: [],
    signals: [],
  },
  {
    atDays: 180,
    title: 'A grand garden',
    blurb: 'The grounds have grown into their widest shape, ready for a few lasting landmarks.',
    discoveries: ['Grand garden grounds', 'Large trees and a gazebo', 'Monumental garden pieces'],
    components: [],
    signals: [],
  },
];

/** Fractional elapsed wall time, used only until the authoritative home loads. */
export function daysTogether(since: string | null | undefined): number {
  if (!since) return 0;
  const ms = Date.now() - Date.parse(since);
  return Number.isFinite(ms) ? Math.max(0, ms / 86_400_000) : 0;
}

export interface HomeProgress {
  days: number;
  components: Set<HomeComponent>;
  signals: Set<SignalType>;
  stageIndex: number;
  next: HomeStage | null;
}

export function progressForDays(days: number): HomeProgress {
  const components = new Set<HomeComponent>();
  const signals = new Set<SignalType>();
  let stageIndex = -1;
  HOME_STAGES.forEach((stage, index) => {
    if (days >= stage.atDays) {
      stage.components.forEach((component) => components.add(component));
      stage.signals.forEach((signal) => signals.add(signal));
      stageIndex = index;
    }
  });
  return {
    days,
    components,
    signals,
    stageIndex,
    next: HOME_STAGES[stageIndex + 1] ?? null,
  };
}

/** Reads server-owned active time after load, including future freeze pauses. */
export function useHomeProgress(): HomeProgress {
  const since = useAuthStore((state) => state.couple?.paired_at ?? null);
  const activeGrowthSeconds = useHomeStore((state) => state.snapshot.activeGrowthSeconds);
  const homeStatus = useHomeStore((state) => state.status);
  const activeDays = homeStatus === 'ready'
    ? activeGrowthSeconds / 86_400
    : daysTogether(since);
  return useMemo(
    () => progressForDays(PREVIEW_UNLOCK_ALL ? Infinity : activeDays),
    [activeDays],
  );
}
