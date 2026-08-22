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
  components: HomeComponent[];
  signals: SignalType[];
}

/** Production pacing is active; Developer Home Studio owns the public bypass. */
export const PREVIEW_UNLOCK_ALL = false;

export const HOME_STAGES: HomeStage[] = [
  {
    atDays: 0,
    title: 'Moving in',
    blurb: 'Your compact home begins with every core emotional signal.',
    components: ['fireplace', 'restnook', 'easel', 'sofa', 'table'],
    signals: ['fireplace', 'rest', 'sofa', 'table', 'romantic', 'garden'],
  },
  {
    atDays: 3,
    title: 'Signs of you',
    blurb: 'Finishes, lighting, indoor decor, and small planters become yours to arrange.',
    components: ['plants'],
    signals: [],
  },
  {
    atDays: 6,
    title: 'A little more room',
    blurb: 'After 144 active hours, the standard living room is ready before day seven ends.',
    components: [],
    signals: [],
  },
  {
    atDays: 14,
    title: 'A warmer hearth',
    blurb: 'Fireplace tier II and its first architectural details unlock.',
    components: ['bookshelf'],
    signals: [],
  },
  {
    atDays: 21,
    title: 'Growing closer',
    blurb: 'A bedroom, bed, and wardrobe family become available.',
    components: ['bed', 'easel'],
    signals: [],
  },
  {
    atDays: 30,
    title: 'Room to grow',
    blurb: 'The standard garden opens with paths, planting, furniture, and small water features.',
    components: ['garden'],
    signals: [],
  },
  {
    atDays: 60,
    title: 'Room to imagine',
    blurb: 'Large interiors and garden structures become available.',
    components: [],
    signals: [],
  },
  {
    atDays: 90,
    title: 'A garden landmark',
    blurb: 'A large garden, major water features, and fireplace tier III unlock.',
    components: [],
    signals: [],
  },
  {
    atDays: 180,
    title: 'A grand garden',
    blurb: 'Grand grounds, large trees, a gazebo, and major statues become available.',
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
