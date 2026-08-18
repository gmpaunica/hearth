import { create } from 'zustand';

import type { DrawingRow } from '@/lib/db';
import { getSeenDrawing, setSeenDrawing } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import {
  decodeDrawingTitle,
  DRAWING_TITLE_MAX_LENGTH,
  EMPTY_PORTRAIT_GRID,
  encodeDrawingGrid,
  normalizeDrawingTitle,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
} from './drawingCodec';
import { drawingFingerprint, drawingWasSeen } from './drawingReceipt';
import { type DrawingPoint, paintRasterStroke } from './drawingStroke';
import { currentHomeDate, useDailyRitualStore } from './dailyRitualStore';
import { useMomentV2Store } from './momentV2Store';

/** Current editor resolution. Stored with a compact square compatibility raster. */
export const GRID_WIDTH = PORTRAIT_WIDTH;
export const GRID_HEIGHT = PORTRAIT_HEIGHT;

/** Soft, on-brand palette. Index into this array; '.' means an empty pixel. */
export const PALETTE = [
  '#e8a35c', // amber
  '#c96f5a', // coral
  '#d98cae', // pink
  '#8fb7d8', // sky
  '#7bb47a', // sage
  '#f2d06b', // butter
  '#f5e6d8', // cream
  '#3a2a1e', // ink
] as const;

export const EMPTY_GRID = EMPTY_PORTRAIT_GRID;

export interface SketchbookDay {
  day: string;
  memberAGrid: string | null;
  memberATitle: string;
  memberBGrid: string | null;
  memberBTitle: string;
}

export interface SketchbookDayIndex {
  day: string;
  memberAHasDrawing: boolean;
  memberBHasDrawing: boolean;
}

type DrawingIndexRow = Pick<DrawingRow, 'day' | 'from_user'>;

/** Group the lightweight day/author index without downloading any raster. */
export function buildSketchbookIndex(
  rows: DrawingIndexRow[],
  memberA: string,
  memberB: string | null,
): SketchbookDayIndex[] {
  const byDay = new Map<string, SketchbookDayIndex>();
  for (const row of rows) {
    const spread = byDay.get(row.day) ?? {
      day: row.day,
      memberAHasDrawing: false,
      memberBHasDrawing: false,
    };
    if (row.from_user === memberA) spread.memberAHasDrawing = true;
    if (memberB && row.from_user === memberB) spread.memberBHasDrawing = true;
    byDay.set(row.day, spread);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function buildSketchbookDay(
  day: string,
  rows: DrawingRow[],
  memberA: string,
  memberB: string | null,
): SketchbookDay {
  const memberARow = rows.find((row) => row.from_user === memberA);
  const memberBRow = memberB
    ? rows.find((row) => row.from_user === memberB)
    : undefined;
  return {
    day,
    memberAGrid: memberARow?.grid ?? null,
    memberATitle: decodeDrawingTitle(memberARow?.grid ?? ''),
    memberBGrid: memberBRow?.grid ?? null,
    memberBTitle: decodeDrawingTitle(memberBRow?.grid ?? ''),
  };
}

/** Server-provided home day; UTC is the safe pre-hydration fallback. */
export function todayStr(): string {
  return currentHomeDate();
}

interface DrawingState {
  /** Working copy of today's drawing (what the canvas edits). */
  myGrid: string;
  /** Optional title sent with today's drawing. */
  myTitle: string;
  /** Whether today's drawing has been saved at least once. */
  mineSaved: boolean;
  /** Partner's drawing for today, or null if they haven't drawn. */
  partnerGrid: string | null;
  partnerTitle: string;
  /** False when there's a partner drawing the user hasn't opened yet. */
  partnerSeen: boolean;
  /** Identifies the exact partner drawing currently rendered. */
  partnerDrawingFingerprint: string | null;
  loading: boolean;
  saving: boolean;
  /** Last save error (e.g. the drawings table isn't set up), or null. */
  error: string | null;
  /** Set by tapping the easel to ask the panel to open. */
  openRequested: boolean;
  /** Set by the Rituals menu to open the archive. */
  sketchbookRequested: boolean;
  sketchbookDays: SketchbookDayIndex[];
  sketchbookPages: Record<string, SketchbookDay>;
  sketchbookLoadingDays: string[];
  sketchbookDayErrors: Record<string, string>;
  memberAName: string;
  memberBName: string;
  sketchbookLoading: boolean;
  sketchbookError: string | null;
  strokePoint: DrawingPoint | null;

  continueStroke: (points: DrawingPoint[], ch: string, radius: number) => void;
  finishStroke: () => void;
  clearMine: () => void;
  setMyTitle: (title: string) => void;
  markSeen: () => Promise<void>;
  requestOpen: () => void;
  clearOpenRequest: () => void;
  requestSketchbook: () => void;
  clearSketchbookRequest: () => void;
  load: () => Promise<void>;
  loadSketchbook: () => Promise<void>;
  loadSketchbookDay: (day: string, prefetch?: boolean) => Promise<void>;
  save: () => Promise<void>;
  ingest: (row: DrawingRow) => void;
  reset: () => void;
}

function ctx() {
  const s = useAuthStore.getState();
  return {
    coupleId: s.couple?.id ?? null,
    userId: s.userId,
    partnerId: s.partnerId,
  };
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  myGrid: EMPTY_GRID,
  myTitle: '',
  mineSaved: false,
  partnerGrid: null,
  partnerTitle: '',
  partnerSeen: true,
  partnerDrawingFingerprint: null,
  loading: false,
  saving: false,
  error: null,
  openRequested: false,
  sketchbookRequested: false,
  sketchbookDays: [],
  sketchbookPages: {},
  sketchbookLoadingDays: [],
  sketchbookDayErrors: {},
  memberAName: 'You',
  memberBName: 'Your person',
  sketchbookLoading: false,
  sketchbookError: null,
  strokePoint: null,

  continueStroke: (points, ch, radius) => {
    const current = get();
    const source = current.myGrid.length === GRID_WIDTH * GRID_HEIGHT
      ? current.myGrid
      : EMPTY_GRID;
    const painted = paintRasterStroke(
      source,
      GRID_WIDTH,
      GRID_HEIGHT,
      current.strokePoint,
      points,
      ch,
      radius,
    );
    set({ myGrid: painted.pixels, strokePoint: painted.lastPoint });
  },

  finishStroke: () => set({ strokePoint: null }),

  clearMine: () => set({ myGrid: EMPTY_GRID }),

  setMyTitle: (title) => set({ myTitle: title.slice(0, DRAWING_TITLE_MAX_LENGTH) }),

  markSeen: async () => {
    const { coupleId, userId } = ctx();
    const { partnerGrid, partnerDrawingFingerprint } = get();
    if (!partnerGrid || !partnerDrawingFingerprint || !coupleId || !userId) return;
    set({ partnerSeen: true });
    await setSeenDrawing(coupleId, userId, todayStr(), partnerDrawingFingerprint);
  },
  requestOpen: () => set({ openRequested: true }),
  clearOpenRequest: () => set({ openRequested: false }),
  requestSketchbook: () => set({ sketchbookRequested: true }),
  clearSketchbookRequest: () => set({ sketchbookRequested: false }),

  load: async () => {
    const { coupleId, userId, partnerId } = ctx();
    if (!coupleId || !userId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('drawings')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('day', todayStr());
    const rows = (data ?? []) as DrawingRow[];
    const mine = rows.find((r) => r.from_user === userId);
    const theirs = partnerId ? rows.find((r) => r.from_user === partnerId) : undefined;
    const savedFingerprint = await getSeenDrawing(coupleId, userId, todayStr());
    const partnerDrawingFingerprint = theirs ? drawingFingerprint(theirs) : null;
    const current = get();
    const alreadySeenInMemory = Boolean(
      partnerDrawingFingerprint &&
        current.partnerDrawingFingerprint === partnerDrawingFingerprint &&
        current.partnerSeen,
    );
    set({
      myGrid: mine?.grid ?? EMPTY_GRID,
      myTitle: decodeDrawingTitle(mine?.grid ?? ''),
      mineSaved: !!mine,
      partnerGrid: theirs?.grid ?? null,
      partnerTitle: decodeDrawingTitle(theirs?.grid ?? ''),
      partnerSeen: alreadySeenInMemory || drawingWasSeen(savedFingerprint, theirs ?? null),
      partnerDrawingFingerprint,
      loading: false,
    });
    await useDailyRitualStore.getState().evaluateSketchReminder(!!mine);
  },

  loadSketchbook: async () => {
    const auth = useAuthStore.getState();
    const couple = auth.couple;
    if (!couple?.member_b) return;
    set({ sketchbookLoading: true, sketchbookError: null });

    const profilePromise = supabase
      .from('profiles')
      .select('id,display_name')
      .in('id', [couple.member_a, couple.member_b]);

    // Fetch only the compact date/name index. High-resolution grids load one
    // selected day at a time and are cached below.
    const archiveRows: DrawingIndexRow[] = [];
    const pageSize = 1000;
    let drawingError: { message?: string } | null = null;
    for (let from = 0; ; from += pageSize) {
      const result = await supabase
        .from('drawings')
        .select('day,from_user')
        .eq('couple_id', couple.id)
        .order('day', { ascending: true })
        .range(from, from + pageSize - 1);
      if (result.error) {
        drawingError = result.error;
        break;
      }
      const page = (result.data ?? []) as DrawingIndexRow[];
      archiveRows.push(...page);
      if (page.length < pageSize) break;
    }
    const profileResult = await profilePromise;

    if (drawingError) {
      console.warn('[hearth] load sketchbook failed:', drawingError);
      set({
        sketchbookLoading: false,
        sketchbookError: 'Couldn\u2019t open your sketchbook. Please try again.',
      });
      return;
    }

    const profiles = (profileResult.data ?? []) as {
      id: string;
      display_name: string | null;
    }[];
    const nameOf = (id: string, fallback: string) =>
      profiles.find((profile) => profile.id === id)?.display_name?.trim() || fallback;

    set({
      sketchbookDays: buildSketchbookIndex(
        archiveRows,
        couple.member_a,
        couple.member_b,
      ),
      memberAName: nameOf(
        couple.member_a,
        couple.member_a === auth.userId ? auth.displayName || 'You' : 'Your person',
      ),
      memberBName: nameOf(
        couple.member_b,
        couple.member_b === auth.userId ? auth.displayName || 'You' : 'Your person',
      ),
      sketchbookLoading: false,
      sketchbookError: null,
    });
  },

  loadSketchbookDay: async (day) => {
    const couple = useAuthStore.getState().couple;
    if (!couple?.member_b) return;
    const current = get();
    if (current.sketchbookPages[day] || current.sketchbookLoadingDays.includes(day)) return;

    set({
      sketchbookLoadingDays: [...current.sketchbookLoadingDays, day],
      sketchbookDayErrors: { ...current.sketchbookDayErrors, [day]: '' },
    });
    const result = await supabase
      .from('drawings')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('day', day);

    const latest = get();
    const loadingDays = latest.sketchbookLoadingDays.filter((value) => value !== day);
    if (result.error) {
      console.warn('[hearth] load sketchbook day failed:', result.error);
      set({
        sketchbookLoadingDays: loadingDays,
        sketchbookDayErrors: {
          ...latest.sketchbookDayErrors,
          [day]: 'Couldn\u2019t open this day. Please try again.',
        },
      });
      return;
    }

    set({
      sketchbookLoadingDays: loadingDays,
      sketchbookPages: {
        ...latest.sketchbookPages,
        [day]: buildSketchbookDay(
          day,
          (result.data ?? []) as DrawingRow[],
          couple.member_a,
          couple.member_b,
        ),
      },
      sketchbookDayErrors: { ...latest.sketchbookDayErrors, [day]: '' },
    });
  },

  save: async () => {
    const { coupleId, userId } = ctx();
    if (!coupleId || !userId || get().saving) return;
    if (get().myGrid === EMPTY_GRID) return; // nothing to send
    set({ saving: true, error: null });
    const title = normalizeDrawingTitle(get().myTitle);
    const grid = encodeDrawingGrid(get().myGrid, title);
    const { error } = await supabase.from('drawings').upsert(
      {
        couple_id: coupleId,
        from_user: userId,
        day: todayStr(),
        grid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,from_user,day' },
    );
    if (error) console.warn('[hearth] save drawing failed:', error);
    set({
      saving: false,
      mineSaved: !error,
      myTitle: error ? get().myTitle : title,
      error: error ? 'Couldn’t send your sketch. Please try again.' : null,
    });
    if (!error) {
      await useDailyRitualStore.getState().dismissSketchReminder();
      await useDailyRitualStore.getState().refresh();
    }
  },

  ingest: (row) => {
    const couple = useAuthStore.getState().couple;
    const { userId, partnerId } = ctx();
    if (couple?.member_b && get().sketchbookDays.length > 0) {
      const current = get();
      const existingIndex = current.sketchbookDays.find((entry) => entry.day === row.day);
      const nextIndex: SketchbookDayIndex = existingIndex
        ? { ...existingIndex }
        : {
            day: row.day,
            memberAHasDrawing: false,
            memberBHasDrawing: false,
          };
      if (row.from_user === couple.member_a) nextIndex.memberAHasDrawing = true;
      if (row.from_user === couple.member_b) nextIndex.memberBHasDrawing = true;

      const cachedPage = current.sketchbookPages[row.day];
      set({
        sketchbookDays: existingIndex
          ? current.sketchbookDays.map((entry) =>
              entry.day === row.day ? { ...nextIndex } : entry,
            )
          : [...current.sketchbookDays, nextIndex].sort((a, b) => a.day.localeCompare(b.day)),
        sketchbookPages: cachedPage
          ? {
              ...current.sketchbookPages,
              [row.day]: {
                ...cachedPage,
                memberAGrid:
                  row.from_user === couple.member_a ? row.grid : cachedPage.memberAGrid,
                memberATitle:
                  row.from_user === couple.member_a
                    ? decodeDrawingTitle(row.grid)
                    : cachedPage.memberATitle,
                memberBGrid:
                  row.from_user === couple.member_b ? row.grid : cachedPage.memberBGrid,
                memberBTitle:
                  row.from_user === couple.member_b
                    ? decodeDrawingTitle(row.grid)
                    : cachedPage.memberBTitle,
              },
            }
          : current.sketchbookPages,
      });
    }
    void useDailyRitualStore.getState().refresh();
    if (row.day !== todayStr()) return;
    if (row.from_user === partnerId) {
      set({
        partnerGrid: row.grid,
        partnerTitle: decodeDrawingTitle(row.grid),
        partnerSeen: false,
        partnerDrawingFingerprint: drawingFingerprint(row),
      });
      void useMomentV2Store.getState().enqueueDrawingReaction(row);
    } else if (row.from_user === userId) {
      set({ mineSaved: true, myTitle: decodeDrawingTitle(row.grid) });
    }
  },

  reset: () =>
    set({
      myGrid: EMPTY_GRID,
      myTitle: '',
      mineSaved: false,
      partnerGrid: null,
      partnerTitle: '',
      partnerSeen: true,
      partnerDrawingFingerprint: null,
      loading: false,
      saving: false,
      error: null,
      openRequested: false,
      sketchbookRequested: false,
      sketchbookDays: [],
      sketchbookPages: {},
      sketchbookLoadingDays: [],
      sketchbookDayErrors: {},
      memberAName: 'You',
      memberBName: 'Your person',
      sketchbookLoading: false,
      sketchbookError: null,
      strokePoint: null,
    }),
}));
