import { create } from 'zustand';

import type { Couple } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/**
 * Where the user is in the sign-in → pairing journey.
 *  - loading:  still resolving the session / couple on launch
 *  - noHome:   authed but not in a couple yet (show create/join choices)
 *  - waiting:  created a home, partner hasn't joined (show the invite code)
 *  - paired:   both members present — the app proper is usable
 *  - error:    couldn't reach Supabase (offline / policy) — offer a retry
 */
export type AuthPhase = 'loading' | 'noHome' | 'waiting' | 'paired' | 'error';

function phaseFor(userId: string | null, couple: Couple | null): AuthPhase {
  if (!userId) return 'loading';
  if (!couple) return 'noHome';
  return couple.member_b ? 'paired' : 'waiting';
}

interface AuthState {
  phase: AuthPhase;
  userId: string | null;
  couple: Couple | null;
  /** The other member's id once paired (null while solo). */
  partnerId: string | null;
  /** The user's chosen name, or null before onboarding sets it. */
  displayName: string | null;
  /** True while a create/join/retry request is in flight. */
  busy: boolean;
  /** User-facing message for the last failure, or null. */
  error: string | null;

  /** Sign in anonymously (if needed) and load any existing couple + profile. */
  init: () => Promise<void>;
  createHome: () => Promise<void>;
  joinHome: (code: string) => Promise<void>;
  /** Save the user's display name to their profile (onboarding). */
  setDisplayName: (name: string) => Promise<void>;
  /** Re-fetch the couple row (e.g. after a partner-joined realtime event). */
  refreshCouple: () => Promise<void>;
  /** Sign out and start over with a fresh anonymous identity. */
  signOut: () => Promise<void>;
  /** Leave the current couple (keeps your identity, drops the pairing). */
  unpair: () => Promise<void>;
}

function partnerOf(couple: Couple | null, userId: string | null): string | null {
  if (!couple || !userId) return null;
  const other = couple.member_a === userId ? couple.member_b : couple.member_a;
  return other ?? null;
}

/** Load the caller's couple, if any. RLS guarantees we only see our own. */
async function fetchCouple(): Promise<Couple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as Couple | undefined) ?? null;
}

/** The caller's chosen display name, if they've set one. */
async function fetchDisplayName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();
  return (data?.display_name as string | null) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  phase: 'loading',
  userId: null,
  couple: null,
  partnerId: null,
  displayName: null,
  busy: false,
  error: null,

  init: async () => {
    set({ phase: 'loading', error: null });
    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        sessionData = (await supabase.auth.getSession()).data;
      }
      const userId = sessionData.session?.user.id ?? null;
      const [couple, displayName] = await Promise.all([
        fetchCouple(),
        fetchDisplayName(userId),
      ]);
      set({
        userId,
        couple,
        displayName,
        partnerId: partnerOf(couple, userId),
        phase: phaseFor(userId, couple),
      });
    } catch (e) {
      set({ phase: 'error', error: messageOf(e) });
    }
  },

  createHome: async () => {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_couple');
      if (error) throw error;
      const couple = data as Couple;
      const { userId } = get();
      set({
        couple,
        partnerId: partnerOf(couple, userId),
        phase: phaseFor(userId, couple),
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: messageOf(e) });
    }
  },

  joinHome: async (code: string) => {
    const trimmed = code.trim();
    if (get().busy || !trimmed) return;
    set({ busy: true, error: null });
    try {
      const { data, error } = await supabase.rpc('join_couple', { code: trimmed });
      if (error) throw error;
      const couple = data as Couple;
      const { userId } = get();
      set({
        couple,
        partnerId: partnerOf(couple, userId),
        phase: phaseFor(userId, couple),
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: messageOf(e) });
    }
  },

  setDisplayName: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || get().busy) return;
    set({ busy: true, error: null });
    try {
      const { userId } = get();
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', userId);
      if (error) throw error;
      set({ displayName: trimmed, busy: false });
    } catch (e) {
      set({ busy: false, error: messageOf(e) });
    }
  },

  refreshCouple: async () => {
    try {
      const couple = await fetchCouple();
      const { userId } = get();
      set({
        couple,
        partnerId: partnerOf(couple, userId),
        phase: phaseFor(userId, couple),
      });
    } catch (e) {
      set({ error: messageOf(e) });
    }
  },

  signOut: async () => {
    set({ busy: true, error: null });
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the network call fails, drop local state and start fresh.
    }
    // Clear everything, then re-init: with anonymous auth this mints a brand
    // new identity, landing the user back at the create/join gate.
    set({
      phase: 'loading',
      userId: null,
      couple: null,
      partnerId: null,
      displayName: null,
      busy: false,
      error: null,
    });
    await get().init();
  },

  unpair: async () => {
    set({ busy: true, error: null });
    try {
      const { error } = await supabase.rpc('leave_couple');
      if (error) throw error;
      const { userId } = get();
      set({
        couple: null,
        partnerId: null,
        phase: phaseFor(userId, null),
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: messageOf(e) });
    }
  },
}));

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}
