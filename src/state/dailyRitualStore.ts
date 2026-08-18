import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { DailyRitualSnapshot, RitualFireState } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

const FIRE_STATES = new Set<RitualFireState>(['steady', 'low', 'warming', 'glowing']);
const MAX_TIMER_MS = 2_000_000_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let newestRequest = 0;
let timezoneAttemptedCouple: string | null = null;

function reminderKey(coupleId: string, userId: string, homeDate: string) {
  return `hearth.ritual-sketch-reminder.v1.${coupleId}.${userId}.${homeDate}`;
}

function normalizeSnapshot(value: unknown): DailyRitualSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<DailyRitualSnapshot>;
  if (
    typeof source.home_date !== 'string'
    || typeof source.home_timezone !== 'string'
    || typeof source.after_evening_check !== 'boolean'
    || typeof source.available_units !== 'number'
    || typeof source.completed_units !== 'number'
    || typeof source.fire_state !== 'string'
    || !FIRE_STATES.has(source.fire_state as RitualFireState)
    || typeof source.next_refresh_at !== 'string'
  ) return null;
  return source as DailyRitualSnapshot;
}

interface DailyRitualState {
  snapshot: DailyRitualSnapshot | null;
  loading: boolean;
  error: string | null;
  reminderVisible: boolean;
  mineSavedDay: string | null;
  mineSaved: boolean;
  refresh: () => Promise<void>;
  evaluateSketchReminder: (mineSaved: boolean) => Promise<void>;
  dismissSketchReminder: () => Promise<void>;
  reset: () => void;
}

/** Server-owned home day and aggregate ritual state. No per-person progress is
 * exposed here; the client only knows whether its own editor already saved. */
export const useDailyRitualStore = create<DailyRitualState>((set, get) => ({
  snapshot: null,
  loading: false,
  error: null,
  reminderVisible: false,
  mineSavedDay: null,
  mineSaved: false,

  refresh: async () => {
    const requestId = ++newestRequest;
    const auth = useAuthStore.getState();
    const couple = auth.couple;
    if (!couple || !auth.userId) return;
    set({ loading: get().snapshot == null, error: null });

    if (auth.userId === couple.member_a && !couple.home_timezone && timezoneAttemptedCouple !== couple.id) {
      timezoneAttemptedCouple = couple.id;
      const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const initialized = await supabase.rpc('initialize_home_timezone', {
        p_timezone: deviceZone,
      });
      if (initialized.error) {
        // A simultaneous first launch may have initialized it already. The
        // snapshot remains authoritative and safely falls back to UTC.
        console.warn('[hearth] home timezone initialization failed:', initialized.error);
      }
    }

    const { data, error } = await supabase.rpc('get_daily_ritual_snapshot');
    if (requestId !== newestRequest) return;
    if (error) {
      set({ loading: false, error: 'Couldn\u2019t refresh today\u2019s fire.' });
      return;
    }
    const snapshot = normalizeSnapshot(data);
    if (!snapshot) {
      set({ loading: false, error: 'Today\u2019s fire returned an invalid state.' });
      return;
    }
    set((current) => ({
      snapshot,
      loading: false,
      error: null,
      reminderVisible: current.snapshot?.home_date === snapshot.home_date
        ? current.reminderVisible
        : false,
    }));
    const current = get();
    // On first hydration or a new home date, the drawing query establishes
    // whether this person has contributed. Reusing an unknown/previous-day
    // value here could briefly show a false reminder.
    if (current.mineSavedDay === snapshot.home_date) {
      await current.evaluateSketchReminder(current.mineSaved);
    }

    if (refreshTimer) clearTimeout(refreshTimer);
    const delay = Math.max(250, Math.min(
      MAX_TIMER_MS,
      Date.parse(snapshot.next_refresh_at) - Date.now() + 250,
    ));
    refreshTimer = setTimeout(() => void get().refresh(), delay);
  },

  evaluateSketchReminder: async (mineSaved) => {
    const snapshot = get().snapshot;
    const auth = useAuthStore.getState();
    if (!snapshot || !auth.couple?.id || !auth.userId) return;
    set({ mineSavedDay: snapshot.home_date, mineSaved });
    if (!snapshot.after_evening_check || mineSaved) {
      set({ reminderVisible: false });
      return;
    }
    const dismissed = await AsyncStorage.getItem(
      reminderKey(auth.couple.id, auth.userId, snapshot.home_date),
    );
    set({ reminderVisible: dismissed !== 'dismissed' });
  },

  dismissSketchReminder: async () => {
    const snapshot = get().snapshot;
    const auth = useAuthStore.getState();
    set({ reminderVisible: false });
    if (!snapshot || !auth.couple?.id || !auth.userId) return;
    await AsyncStorage.setItem(
      reminderKey(auth.couple.id, auth.userId, snapshot.home_date),
      'dismissed',
    );
  },

  reset: () => {
    newestRequest += 1;
    timezoneAttemptedCouple = null;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    set({ snapshot: null, loading: false, error: null, reminderVisible: false, mineSavedDay: null, mineSaved: false });
  },
}));

export function currentHomeDate(): string {
  return useDailyRitualStore.getState().snapshot?.home_date
    ?? new Date().toISOString().slice(0, 10);
}
