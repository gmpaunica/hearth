// The home grows with the relationship. A couple starts with almost nothing —
// just a fire to gather by — and rooms fill in as milestones pass. This module
// is the single source of truth for *what* is unlocked at a given age; the
// scene and the signal UI both read it, and new Higgsfield-designed components
// slot in by adding a stage entry here (no scene/logic rewrite needed).
import { useMemo } from 'react';

import type { SignalType } from '@/copy';
import { useAuthStore } from './authStore';

/** A placeable/visible piece of the home. New art registers as one of these. */
export type HomeComponent =
  | 'fireplace'
  | 'restnook'
  | 'easel'
  | 'sofa'
  | 'table'
  | 'bench'
  | 'bookshelf'
  | 'plants'
  | 'garden';

export interface HomeStage {
  /** Days together at which this stage unlocks. */
  atDays: number;
  /** Milestone title (for a future "your home grew" moment). */
  title: string;
  /** One-line description of what changed. */
  blurb: string;
  /** Components that appear at this stage. */
  components: HomeComponent[];
  /** Signal places that open up at this stage (empty = none new). */
  signals: SignalType[];
}

// The milestone ladder. Tunable — change the numbers or add rows freely.
// Day 0 is intentionally sparse ("quite empty except the essentials"); the
// garden opens at a month, per the product vision.
export const HOME_STAGES: HomeStage[] = [
  {
    atDays: 0,
    title: 'Moving in',
    blurb: 'Your home begins — a fire to gather by, and a little couch to rest on.',
    components: ['fireplace', 'restnook', 'easel'],
    signals: ['fireplace', 'rest'],
  },
  {
    atDays: 3,
    title: 'A place to rest',
    blurb: 'A sofa arrives, for the quiet evenings.',
    components: ['sofa'],
    signals: ['sofa'],
  },
  {
    atDays: 7,
    title: 'Somewhere to talk',
    blurb: 'A small table, for the harder conversations.',
    components: ['table'],
    signals: ['table'],
  },
  {
    atDays: 14,
    title: 'Signs of life',
    blurb: 'Shelves and plants — the room feels lived-in now.',
    components: ['bookshelf', 'bench', 'plants'],
    signals: [],
  },
  {
    atDays: 30,
    title: 'Room to grow',
    blurb: 'A garden opens up beyond the door.',
    components: ['garden'],
    signals: ['garden'],
  },
];

/** Fractional days since the home was created (the couple's "together" anchor). */
export function daysTogether(since: string | null | undefined): number {
  if (!since) return 0;
  const ms = Date.now() - Date.parse(since);
  return Number.isFinite(ms) ? Math.max(0, ms / 86_400_000) : 0;
}

export interface HomeProgress {
  /** Days together (fractional). */
  days: number;
  /** Every component unlocked so far. */
  components: Set<HomeComponent>;
  /** Every signal place unlocked so far. */
  signals: Set<SignalType>;
  /** Index of the latest reached stage in HOME_STAGES. */
  stageIndex: number;
  /** The next stage not yet reached, or null once everything is unlocked. */
  next: HomeStage | null;
}

/** Accumulate everything unlocked at or before `days`. */
export function progressForDays(days: number): HomeProgress {
  const components = new Set<HomeComponent>();
  const signals = new Set<SignalType>();
  let stageIndex = -1;
  HOME_STAGES.forEach((stage, i) => {
    if (days >= stage.atDays) {
      stage.components.forEach((c) => components.add(c));
      stage.signals.forEach((s) => signals.add(s));
      stageIndex = i;
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

/**
 * Live home progression for the current couple. Recomputes when the couple
 * changes; day-scale unlocks don't need to tick within a session (a relaunch
 * reflects the new day), which keeps the scene from re-rendering needlessly.
 */
export function useHomeProgress(): HomeProgress {
  const since = useAuthStore((s) => s.couple?.created_at ?? null);
  return useMemo(() => progressForDays(daysTogether(since)), [since]);
}
