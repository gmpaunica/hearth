import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { DrawingRow } from '@/lib/db';
import { onNotificationTap, registerPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { avatarIdentityFor } from './avatarIdentity';
import { useAuthStore } from './authStore';
import { useDrawingStore } from './drawingStore';
import { useDailyRitualStore } from './dailyRitualStore';
import { useMomentV2Store } from './momentV2Store';
import { useMomentsSurfaceStore } from './momentsSurfaceStore';
import { useAvatarStore } from './avatarStore';
import { useDailyMediaStore } from '@/daily/store';

/**
 * The app's realtime spine. Mounted once at the root, it:
 *   1. signs in + loads the couple (Phase 4),
 *   2. watches the couple row so a waiting host advances the moment their
 *      partner joins,
 *   3. once paired, hydrates the one typed v2 moment and streams public
 *      session/presence/completion changes into the moment store.
 * The scene reacts purely through the store — no scene code changes here.
 */
export function useHearthSync() {
  const init = useAuthStore((s) => s.init);
  const refreshCouple = useAuthStore((s) => s.refreshCouple);
  const coupleId = useAuthStore((s) => s.couple?.id ?? null);
  const memberA = useAuthStore((s) => s.couple?.member_a ?? null);
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
    let cancelled = false;
    void registerPushToken(userId).catch((error) => {
      if (!cancelled) console.warn('[hearth] push registration failed:', error);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Reject a notification left by a previous anonymous identity or home.
  useEffect(
    () => onNotificationTap(({ url, recipientUserId, coupleId: notificationCoupleId }) => {
      const auth = useAuthStore.getState();
      if (
        recipientUserId === auth.userId &&
        notificationCoupleId === auth.couple?.id
      ) router.navigate(url as never);
    }),
    [],
  );

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

  // Once both members are present, sync the single v2 moment live. Realtime
  // refreshes data only; it never expands the Moments surface.
  useEffect(() => {
    const store = useMomentV2Store.getState();
    if (!coupleId || !userId || !memberA || !memberB) {
      store.reset();
      useDrawingStore.getState().reset();
      useDailyRitualStore.getState().reset();
      useAvatarStore.getState().reset();
      useDailyMediaStore.getState().reset();
      return;
    }
    if (partnerId) void useAvatarStore.getState().load(userId, memberA, partnerId);
    const context = {
      coupleId,
      userId,
      partnerId: partnerId ?? memberB,
      ...avatarIdentityFor(userId, memberA),
    };
    // The server home day hydrates before the daily drawing query so both
    // phones use the same date across timezone and DST boundaries.
    void useDailyRitualStore.getState().refresh()
      .then(() => useDrawingStore.getState().load());
    void useDailyMediaStore.getState().refresh(false);

    const hydrateNow = (snapScene = false) => useMomentV2Store.getState().refresh(snapScene);
    let cancelled = false;
    void store.setContext(context).then(() => {
      if (!cancelled) void hydrateNow(true);
    });

    // Realtime events missed while backgrounded leave the room stale ("they're
    // at the fire" when they aren't). Re-fetch truth whenever the app returns
    // to the foreground.
    useMomentsSurfaceStore.getState().setAppVisible(AppState.currentState === 'active');
    const appState = AppState.addEventListener('change', (s) => {
      useMomentsSurfaceStore.getState().setAppVisible(s === 'active');
      if (s === 'active') {
        void refreshCouple();
        void hydrateNow(false);
        void useDailyRitualStore.getState().refresh()
          .then(() => useDrawingStore.getState().load())
          .then(() => useDailyMediaStore.getState().refresh(false))
          .then(() => useMomentV2Store.getState().resumePlayback());
      }
    });

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let postSubscribeHydrate: ReturnType<typeof setTimeout> | null = null;
    const queueHydrate = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void hydrateNow(false), 60);
    };
    const channel = supabase
      .channel(`moments-v2:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals', filter: `couple_id=eq.${coupleId}` },
        queueHydrate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signal_presence' },
        queueHydrate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moment_sessions', filter: `couple_id=eq.${coupleId}` },
        queueHydrate,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moment_completion_events', filter: `couple_id=eq.${coupleId}` },
        queueHydrate,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moment_action_events', filter: `couple_id=eq.${coupleId}` },
        queueHydrate,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moment_readiness_events', filter: `couple_id=eq.${coupleId}` },
        queueHydrate,
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        // The initial fetch can finish before every postgres_changes binding is
        // live. Re-read once just after subscription so a signal or need sent
        // during that narrow pairing window cannot disappear between the two.
        if (postSubscribeHydrate) clearTimeout(postSubscribeHydrate);
        postSubscribeHydrate = setTimeout(() => void hydrateNow(false), 350);
      });

    // Drawings live in their own channel so that, if a couple hasn't run
    // drawings.sql yet, a failed subscription can't take signal sync down too.
    const drawingChannel = supabase
      .channel(`drawings:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drawings', filter: `couple_id=eq.${coupleId}` },
        (payload) => useDrawingStore.getState().ingest(payload.new as DrawingRow),
      )
      .subscribe();

    const profileChannel = supabase
      .channel(`profiles:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => useAvatarStore.getState().ingest(payload.new as { id: string; avatar_config: unknown }),
      )
      .subscribe();

    const mediaChannel = supabase
      .channel(`daily-media:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_media', filter: `couple_id=eq.${coupleId}` },
        () => void useDailyMediaStore.getState().refresh(true),
      )
      .subscribe();

    return () => {
      cancelled = true;
      appState.remove();
      if (refreshTimer) clearTimeout(refreshTimer);
      if (postSubscribeHydrate) clearTimeout(postSubscribeHydrate);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(drawingChannel);
      void supabase.removeChannel(profileChannel);
      void supabase.removeChannel(mediaChannel);
    };
  }, [coupleId, userId, memberA, memberB, partnerId, refreshCouple]);
}
