import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { ResponseRow, SignalRow } from '@/lib/db';
import { onNotificationTap, registerPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { useSignalStore } from './signalStore';

/**
 * The app's realtime spine. Mounted once at the root, it:
 *   1. signs in + loads the couple (Phase 4),
 *   2. watches the couple row so a waiting host advances the moment their
 *      partner joins,
 *   3. once paired, hydrates the current open signals and streams live
 *      signal/response changes into the signalStore (Phase 5).
 * The scene reacts purely through the store — no scene code changes here.
 */
export function useHearthSync() {
  const init = useAuthStore((s) => s.init);
  const refreshCouple = useAuthStore((s) => s.refreshCouple);
  const coupleId = useAuthStore((s) => s.couple?.id ?? null);
  const memberB = useAuthStore((s) => s.couple?.member_b ?? null);
  const userId = useAuthStore((s) => s.userId);
  const partnerId = useAuthStore((s) => s.partnerId);

  // Sign in + load couple once on mount.
  useEffect(() => {
    void init();
  }, [init]);

  // Register this device for push once signed in (native only; no-ops on web).
  useEffect(() => {
    if (!userId) return;
    void registerPushToken(userId);
  }, [userId]);

  // Tapping a signal notification deep-links straight into the room.
  useEffect(() => onNotificationTap(() => router.navigate('/')), []);

  // Watch the couple row for membership changes: a partner joining (waiting →
  // paired) or leaving/unpairing (paired → waiting or gone).
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        () => void refreshCouple(),
      )
      .subscribe();
    // Fallback only while waiting for a partner: if the realtime binding wasn't
    // ready the instant they joined, the UPDATE can be missed and the host
    // would wait forever. The interval tears down the moment memberB appears.
    const poll = memberB ? null : setInterval(() => void refreshCouple(), 4000);
    return () => {
      void supabase.removeChannel(channel);
      if (poll) clearInterval(poll);
    };
  }, [coupleId, memberB, refreshCouple]);

  // Once both members are present, sync signals + responses live.
  useEffect(() => {
    const store = useSignalStore.getState();
    if (!coupleId || !userId || !memberB) {
      store.reset();
      return;
    }
    store.setContext({ coupleId, userId, partnerId });

    // Late-join: reflect the current unresolved state, not just live deltas.
    const hydrateNow = async () => {
      const { data: signals } = await supabase
        .from('signals')
        .select('*')
        .eq('couple_id', coupleId)
        .is('resolved_at', null)
        .order('created_at', { ascending: true });
      const rows = (signals ?? []) as SignalRow[];
      let responses: ResponseRow[] = [];
      if (rows.length) {
        const { data: resp } = await supabase
          .from('responses')
          .select('*')
          .in(
            'signal_id',
            rows.map((r) => r.id),
          );
        responses = (resp ?? []) as ResponseRow[];
      }
      useSignalStore.getState().hydrate(rows, responses);
    };
    void hydrateNow();

    // Realtime events missed while backgrounded leave the room stale ("they're
    // at the fire" when they aren't). Re-fetch truth whenever the app returns
    // to the foreground.
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void refreshCouple();
        void hydrateNow();
      }
    });

    const channel = supabase
      .channel(`signals:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals', filter: `couple_id=eq.${coupleId}` },
        (payload) => useSignalStore.getState().ingestSignal(payload.new as SignalRow),
      )
      .on(
        // responses carry no couple_id; RLS ensures we only receive our own
        // couple's rows, and the store ignores any that don't match.
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        (payload) => useSignalStore.getState().ingestResponse(payload.new as ResponseRow),
      )
      .subscribe();

    return () => {
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [coupleId, userId, memberB, partnerId, refreshCouple]);
}
