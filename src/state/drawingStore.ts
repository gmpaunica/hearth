import { create } from 'zustand';

import type { DrawingRow } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

/** Canvas is GRID×GRID pixels. Small enough to store as a short string. */
export const GRID = 24;

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

export const EMPTY_GRID = '.'.repeat(GRID * GRID);

/** UTC day, so both partners share the same daily boundary. */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DrawingState {
  /** Working copy of today's drawing (what the canvas edits). */
  myGrid: string;
  /** Whether today's drawing has been saved at least once. */
  mineSaved: boolean;
  /** Partner's drawing for today, or null if they haven't drawn. */
  partnerGrid: string | null;
  /** False when there's a partner drawing the user hasn't opened yet. */
  partnerSeen: boolean;
  loading: boolean;
  saving: boolean;
  /** Last save error (e.g. the drawings table isn't set up), or null. */
  error: string | null;
  /** Set by tapping the easel to ask the panel to open. */
  openRequested: boolean;

  setPixel: (index: number, ch: string) => void;
  clearMine: () => void;
  markSeen: () => void;
  requestOpen: () => void;
  clearOpenRequest: () => void;
  load: () => Promise<void>;
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
  mineSaved: false,
  partnerGrid: null,
  partnerSeen: true,
  loading: false,
  saving: false,
  error: null,
  openRequested: false,

  setPixel: (index, ch) => {
    if (index < 0 || index >= GRID * GRID) return;
    const g = get().myGrid;
    if (g[index] === ch) return;
    set({ myGrid: g.slice(0, index) + ch + g.slice(index + 1) });
  },

  clearMine: () => set({ myGrid: EMPTY_GRID }),

  markSeen: () => set({ partnerSeen: true }),
  requestOpen: () => set({ openRequested: true }),
  clearOpenRequest: () => set({ openRequested: false }),

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
    set({
      myGrid: mine?.grid ?? EMPTY_GRID,
      mineSaved: !!mine,
      partnerGrid: theirs?.grid ?? null,
      partnerSeen: !theirs,
      loading: false,
    });
  },

  save: async () => {
    const { coupleId, userId } = ctx();
    if (!coupleId || !userId || get().saving) return;
    if (get().myGrid === EMPTY_GRID) return; // nothing to send
    set({ saving: true, error: null });
    const grid = get().myGrid;
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
      error: error ? 'Couldn’t send your note. Please try again.' : null,
    });
  },

  ingest: (row) => {
    const { userId, partnerId } = ctx();
    if (row.day !== todayStr()) return;
    if (row.from_user === partnerId) {
      set({ partnerGrid: row.grid, partnerSeen: false });
    } else if (row.from_user === userId) {
      set({ mineSaved: true });
    }
  },

  reset: () =>
    set({
      myGrid: EMPTY_GRID,
      mineSaved: false,
      partnerGrid: null,
      partnerSeen: true,
      loading: false,
      saving: false,
      error: null,
      openRequested: false,
    }),
}));
