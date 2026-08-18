import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type {
  DrawingRow,
  MomentActionEventV2,
  FireplacePathwayId,
  MomentCompletionEventV2,
  MomentDestination,
  MomentReadinessEventV2,
  RestMomentPayload,
  MomentSnapshotV2,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { consequenceFor } from '@/moments/consequenceCatalog';
import { requestMomentCameraFocus, restoreMomentCameraFocus } from '@/scene/cameraState';
import { latestPresenceForUser, normalizeMomentSnapshotV2, partnerParticipant } from './momentV2Model';
import { useMomentsSurfaceStore } from './momentsSurfaceStore';
import { useSceneStore, type AvatarKey } from './sceneStore';

export interface MomentSyncContext {
  coupleId: string;
  userId: string;
  partnerId: string;
  myAvatar: AvatarKey;
  partnerAvatar: AvatarKey;
}

export interface StartMomentInput {
  type: MomentDestination;
  intent?: FireplacePathwayId | null;
  note?: string | null;
}

export interface RespondMomentInput {
  action: string;
  note?: string | null;
}

export interface RestMomentResponseInput {
  action: 'make_doodle' | 'send_visitor' | 'send_hug';
  payload: RestMomentPayload;
}

export type SpatialReactionAnchor = MomentDestination | 'drawing';

export interface SpatialReactionEvent {
  id: string;
  signalId: string | null;
  anchor: SpatialReactionAnchor;
  copy: string;
  actionEvent: MomentActionEventV2 | null;
  showBubble: boolean;
}

interface MomentV2State {
  ctx: MomentSyncContext | null;
  snapshot: MomentSnapshotV2 | null;
  loading: boolean;
  busyAction: string | null;
  error: string | null;
  liveCompletion: MomentCompletionEventV2 | null;
  liveAction: MomentActionEventV2 | null;
  liveReaction: SpatialReactionEvent | null;
  setContext: (ctx: MomentSyncContext | null) => Promise<void>;
  hydrate: (snapshot: MomentSnapshotV2, snapScene?: boolean) => Promise<void>;
  refresh: (snapScene?: boolean) => Promise<void>;
  clearError: () => void;
  startMoment: (input: StartMomentInput) => Promise<boolean>;
  respondToMoment: (signalId: string, input: RespondMomentInput) => Promise<boolean>;
  respondToRestMoment: (signalId: string, input: RestMomentResponseInput) => Promise<boolean>;
  setReadiness: (signalId: string, ready: boolean) => Promise<boolean>;
  resolveMoment: (signalId: string) => Promise<boolean>;
  cancelMoment: (signalId: string) => Promise<boolean>;
  removeNote: (signalId: string) => Promise<boolean>;
  moveToMoment: (signalId: string) => Promise<boolean>;
  leaveMoment: (signalId: string) => Promise<boolean>;
  returnToMoment: (signalId: string) => Promise<boolean>;
  joinMoment: (signalId: string) => Promise<boolean>;
  enqueueDrawingReaction: (row: DrawingRow) => Promise<void>;
  resumePlayback: () => void;
  reset: () => void;
}

const seenCompletionIds = new Set<string>();
const completionQueue: MomentCompletionEventV2[] = [];
const seenActionIds = new Set<string>();
const seenReadinessIds = new Set<string>();
const seenDrawingIds = new Set<string>();
const reactionQueue: SpatialReactionEvent[] = [];
let completionContextKey: string | null = null;
let completionBaselinePending = true;
let actionBaselinePending = true;
let readinessBaselinePending = true;
let completionBeatTimer: ReturnType<typeof setTimeout> | null = null;
let reactionBeatTimer: ReturnType<typeof setTimeout> | null = null;
let newestRefresh = 0;
let newestAppliedRefresh = 0;

function completionStorageKey(ctx: MomentSyncContext): string {
  return `hearth.moment-completions.v2.${ctx.coupleId}.${ctx.userId}`;
}

function actionStorageKey(ctx: MomentSyncContext): string {
  return `hearth.moment-actions.v1.${ctx.coupleId}.${ctx.userId}`;
}

function spatialStorageKey(ctx: MomentSyncContext): string {
  return `hearth.spatial-reactions.v1.${ctx.coupleId}.${ctx.userId}`;
}

function reactionCopyForAction(event: MomentActionEventV2): string {
  switch (event.canonical_action) {
    case 'join_fireplace':
    case 'come_sit':
    case 'talk_by_fire':
    case 'listen_by_fire':
    case 'hear_them_out': return 'Your partner joined you by the fire.';
    case 'join_table':
    case 'talk_now': return 'Your partner joined you at the table.';
    case 'give_quiet': return 'Your partner gave you quiet.';
    case 'leave_rose': return 'A rose is waiting by the garden.';
    case 'sit_with_them': return 'Your partner joined you on the sofa.';
    case 'bring_tea': return 'A little tea tray arrived.';
    case 'send_hug': return 'A warm hug arrived at the sofa.';
    case 'rest_doodle': return 'A tiny doodle arrived.';
    case 'rest_visitor': {
      const visitor = event.payload && 'visitor' in event.payload ? event.payload.visitor : 'visitor';
      return `A silly ${visitor} came to visit.`;
    }
    case 'rest_hug': return 'A little hug-wave arrived.';
    case 'come_close': return 'Your partner came close.';
    case 'send_affection': return 'A little affection arrived.';
    case 'not_now': return 'Your partner needs more time.';
    default: return 'Something changed at home.';
  }
}

function reactionForAction(event: MomentActionEventV2): SpatialReactionEvent {
  return {
    id: `action:${event.id}`,
    signalId: event.signal_id,
    anchor: event.destination,
    copy: reactionCopyForAction(event),
    actionEvent: event,
    showBubble: true,
  };
}

function reactionForReadiness(event: MomentReadinessEventV2): SpatialReactionEvent {
  return {
    id: `readiness:${event.id}`,
    signalId: event.signal_id,
    anchor: 'fireplace',
    copy: event.readiness
      ? 'Your partner is ready to reconnect.'
      : 'Your partner needs more time.',
    actionEvent: null,
    showBubble: true,
  };
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Something changed before that action finished. Please try again.';
}

async function persistSeen(ctx: MomentSyncContext | null): Promise<void> {
  if (!ctx) return;
  await AsyncStorage.setItem(completionStorageKey(ctx), JSON.stringify([...seenCompletionIds]));
}

async function persistSeenActions(ctx: MomentSyncContext | null): Promise<void> {
  if (!ctx) return;
  await AsyncStorage.setItem(actionStorageKey(ctx), JSON.stringify([...seenActionIds]));
}

async function persistSeenSpatial(ctx: MomentSyncContext | null): Promise<void> {
  if (!ctx) return;
  await AsyncStorage.setItem(spatialStorageKey(ctx), JSON.stringify([
    ...[...seenReadinessIds].map((id) => `readiness:${id}`),
    ...[...seenDrawingIds].map((id) => `drawing:${id}`),
  ]));
}

function projectScene(
  snapshot: MomentSnapshotV2 | null,
  ctx: MomentSyncContext | null,
  snapScene: boolean,
): void {
  if (!ctx) return;
  const scene = useSceneStore.getState();
  const mine = latestPresenceForUser(snapshot?.presence ?? [], ctx.userId);
  const partner = latestPresenceForUser(snapshot?.presence ?? [], ctx.partnerId);
  scene.setSpot(ctx.myAvatar, mine?.destination ?? 'idle');
  scene.setSpot(ctx.partnerAvatar, partner?.destination ?? 'idle');

  const active = snapshot?.active ?? null;
  const partnerState = partnerParticipant(snapshot);
  const activePresence = active
    ? (snapshot?.presence ?? []).filter((row) => row.signal_id === active.signal_id && row.is_present)
    : [];
  scene.setMomentAtmosphere(active ? {
    destination: active.destination,
    intent: active.intent,
    responseAction: partnerState?.response_action ?? null,
    partnerResponded: partnerState?.response_action != null,
    bothPresent: activePresence.some((row) => row.user_id === ctx.userId)
      && activePresence.some((row) => row.user_id === ctx.partnerId),
  } : null);
  scene.setMomentActionEvents(
    snapshot?.current_action_events ?? [],
    snapshot?.today_action_events ?? [],
  );
  scene.setInteractionSpot(active?.destination ?? mine?.destination ?? partner?.destination ?? null);
  scene.setFireplaceWaiting(active != null);
  if (snapScene) scene.requestSnap();
}

export const useMomentV2Store = create<MomentV2State>((set, get) => {
  const beginNextCompletionBeat = () => {
    if (completionBeatTimer || reactionBeatTimer || reactionQueue.length > 0 || completionQueue.length === 0) return;
    const event = completionQueue.shift()!;
    const scene = useSceneStore.getState();
    set({ liveCompletion: event });
    // A live ending must never rewrite a character's world position. The
    // snapshot has already released its intentional presence; Avatar keeps
    // the current x/z, stands in place, then resumes ambient movement from
    // there. Instant snaps remain reserved for cold-launch hydration.
    scene.setInteractionSpot(event.destination);
    requestMomentCameraFocus(event.destination, scene.reduceMotion);
    const playPayoff = () => {
      scene.triggerMomentPayoff({
        eventId: event.id,
        destination: event.destination,
        kind: event.payoff_kind,
      });
      completionBeatTimer = setTimeout(() => {
        completionBeatTimer = null;
        scene.clearMomentPayoff();
        restoreMomentCameraFocus();
        if (reactionQueue.length > 0) {
          beginNextReactionBeat();
        } else if (completionQueue.length > 0) {
          beginNextCompletionBeat();
        } else {
          set({ liveCompletion: null });
          projectScene(get().snapshot, get().ctx, false);
        }
      }, scene.reduceMotion ? 500 : 800);
    };
    // Reduced motion focuses immediately. Otherwise give the camera one short
    // settle beat before the roughly 800 ms heart begins.
    if (scene.reduceMotion) playPayoff();
    else {
      completionBeatTimer = setTimeout(() => {
        completionBeatTimer = null;
        playPayoff();
      }, 220);
    }
  };

  const beginNextReactionBeat = () => {
    if (reactionBeatTimer || completionBeatTimer || reactionQueue.length === 0) return;
    const reaction = reactionQueue.shift()!;
    const event = reaction.actionEvent;
    const scene = useSceneStore.getState();
    const ctx = get().ctx;
    if (!ctx) return;
    set({ liveAction: event, liveReaction: reaction.showBubble ? reaction : null });
    if (event) {
      const actor = event.actor_id === ctx.userId ? ctx.myAvatar : ctx.partnerAvatar;
      const consequence = consequenceFor(event.canonical_action);
      scene.triggerMomentAction({
        eventId: event.id,
        actor,
        actionId: event.canonical_action,
        destination: event.destination,
      });
      if (consequence?.movement === 'arch_then_leave') {
        scene.setSpot(actor, 'garden_arch');
      }
    }
    // Incoming reactions never seize the camera. The spatial bubble is the
    // invitation; tapping it performs an intentional focus.
    reactionBeatTimer = setTimeout(() => {
      reactionBeatTimer = null;
      scene.clearMomentAction();
      projectScene(get().snapshot, get().ctx, false);
      set({ liveAction: null, liveReaction: null });
      if (reactionQueue.length > 0) beginNextReactionBeat();
      else if (completionQueue.length > 0) beginNextCompletionBeat();
    }, 3500);
  };

  const applySnapshot = async (snapshot: MomentSnapshotV2, snapScene = false) => {
    const { ctx } = get();
    const events = [...snapshot.completion_events]
      .sort((left, right) => Date.parse(left.occurred_at) - Date.parse(right.occurred_at));
    if (completionBaselinePending || !ctx) {
      for (const event of events) seenCompletionIds.add(event.id);
      completionBaselinePending = false;
      await persistSeen(ctx);
    } else {
      const unseen = events.filter((event) => !seenCompletionIds.has(event.id));
      for (const event of unseen) seenCompletionIds.add(event.id);
      if (unseen.length > 0) {
        // Persist before playback so a process death cannot replay the payoff.
        await persistSeen(ctx);
        completionQueue.push(...unseen);
      }
    }
    const actionEvents = [...snapshot.today_action_events]
      .sort((left, right) => Date.parse(left.occurred_at) - Date.parse(right.occurred_at));
    if (actionBaselinePending || !ctx) {
      for (const event of actionEvents) seenActionIds.add(event.id);
      actionBaselinePending = false;
      await persistSeenActions(ctx);
    } else {
      const unseenActions = actionEvents.filter((event) => !seenActionIds.has(event.id));
      for (const event of unseenActions) seenActionIds.add(event.id);
      if (unseenActions.length > 0) {
        await persistSeenActions(ctx);
        reactionQueue.push(...unseenActions.map((event) => ({
          ...reactionForAction(event),
          showBubble: event.actor_id !== ctx.userId,
        })));
      }
    }
    const readinessEvents = [...snapshot.readiness_events]
      .sort((left, right) => Date.parse(left.occurred_at) - Date.parse(right.occurred_at));
    if (readinessBaselinePending || !ctx) {
      for (const event of readinessEvents) seenReadinessIds.add(event.id);
      readinessBaselinePending = false;
      await persistSeenSpatial(ctx);
    } else {
      const unseenReadiness = readinessEvents.filter((event) => !seenReadinessIds.has(event.id));
      for (const event of unseenReadiness) seenReadinessIds.add(event.id);
      if (unseenReadiness.length > 0) {
        await persistSeenSpatial(ctx);
        reactionQueue.push(...unseenReadiness
          .filter((event) => event.actor_id !== ctx.userId)
          .map(reactionForReadiness));
      }
    }
    set({ snapshot, loading: false, error: null });
    projectScene(snapshot, ctx, snapScene);
    const surface = useMomentsSurfaceStore.getState();
    if (!surface.expanded && !surface.hearthOpen && !surface.settingsOpen && surface.appVisible) {
      if (reactionQueue.length > 0) beginNextReactionBeat();
      if (completionQueue.length > 0) beginNextCompletionBeat();
    }
  };

  const mutate = async (
    busyAction: string,
    rpc: string,
    args: Record<string, unknown>,
  ): Promise<boolean> => {
    if (get().busyAction) return false;
    set({ busyAction, error: null });
    try {
      const { error } = await supabase.rpc(rpc, args);
      if (error) throw error;
      await get().refresh(false);
      set({ busyAction: null });
      return true;
    } catch (error) {
      set({ busyAction: null, error: messageOf(error) });
      return false;
    }
  };

  return {
    ctx: null,
    snapshot: null,
    loading: false,
    busyAction: null,
    error: null,
    liveCompletion: null,
    liveAction: null,
    liveReaction: null,

    setContext: async (ctx) => {
      newestRefresh += 1;
      newestAppliedRefresh = newestRefresh;
      const nextKey = ctx ? `${ctx.coupleId}:${ctx.userId}` : null;
      if (nextKey !== completionContextKey) {
        completionContextKey = nextKey;
        completionBaselinePending = true;
        actionBaselinePending = true;
        readinessBaselinePending = true;
        seenCompletionIds.clear();
        seenActionIds.clear();
        seenReadinessIds.clear();
        seenDrawingIds.clear();
        completionQueue.length = 0;
        reactionQueue.length = 0;
        if (completionBeatTimer) clearTimeout(completionBeatTimer);
        if (reactionBeatTimer) clearTimeout(reactionBeatTimer);
        completionBeatTimer = null;
        reactionBeatTimer = null;
        useSceneStore.getState().clearMomentPayoff();
        if (ctx) {
          try {
            const stored = JSON.parse(await AsyncStorage.getItem(completionStorageKey(ctx)) ?? '[]');
            if (Array.isArray(stored)) {
              for (const id of stored) if (typeof id === 'string') seenCompletionIds.add(id);
            }
          } catch {
            // A malformed local cache only loses dedupe history; first hydration
            // still establishes a non-animating baseline.
          }
          try {
            const storedActions = JSON.parse(await AsyncStorage.getItem(actionStorageKey(ctx)) ?? '[]');
            if (Array.isArray(storedActions)) {
              for (const id of storedActions) if (typeof id === 'string') seenActionIds.add(id);
            }
          } catch {
            // Initial hydration still creates a non-animating baseline.
          }
          try {
            const storedSpatial = JSON.parse(await AsyncStorage.getItem(spatialStorageKey(ctx)) ?? '[]');
            if (Array.isArray(storedSpatial)) {
              for (const value of storedSpatial) {
                if (typeof value !== 'string') continue;
                if (value.startsWith('readiness:')) seenReadinessIds.add(value.slice(10));
                if (value.startsWith('drawing:')) seenDrawingIds.add(value.slice(8));
              }
            }
          } catch {
            // Snapshot hydration and live drawing delivery remain safe baselines.
          }
        }
      }
      set({ ctx });
    },

    hydrate: async (snapshot, snapScene = false) => {
      await applySnapshot(normalizeMomentSnapshotV2(snapshot), snapScene);
    },

    refresh: async (snapScene = false) => {
      if (!get().ctx) return;
      const requestId = ++newestRefresh;
      set({ loading: get().snapshot == null, error: null });
      const { data, error } = await supabase.rpc('get_moment_snapshot_v2');
      if (requestId < newestAppliedRefresh) return;
      newestAppliedRefresh = requestId;
      if (error) {
        set({ loading: false, error: messageOf(error) });
        return;
      }
      await applySnapshot(normalizeMomentSnapshotV2(data), snapScene);
    },

    clearError: () => set({ error: null }),
    startMoment: (input) => mutate('start', 'start_moment', {
      p_type: input.type,
      p_intent: input.intent ?? null,
      p_note: input.note?.trim() || null,
      p_scheduled_for: null,
    }),
    respondToMoment: (signalId, input) => mutate('respond', 'respond_to_moment', {
      p_signal_id: signalId,
      p_action: input.action,
      p_note: input.note?.trim() || null,
      p_scheduled_for: null,
    }),
    respondToRestMoment: (signalId, input) => mutate('respond-rest', 'respond_to_rest_moment', {
      p_signal_id: signalId,
      p_action: input.action,
      p_payload: input.payload,
    }),
    setReadiness: async (signalId, ready) => {
      if (get().busyAction) return false;
      set({ busyAction: 'readiness', error: null });
      try {
        const { data, error } = await supabase.rpc('set_moment_readiness', {
          p_signal_id: signalId,
          p_ready: ready,
        });
        if (error) throw error;
        if (data) useSceneStore.getState().triggerReadinessHeartComplete();
        await get().refresh(false);
        set({ busyAction: null });
        return true;
      } catch (error) {
        set({ busyAction: null, error: messageOf(error) });
        return false;
      }
    },
    resolveMoment: (signalId) => mutate('resolve', 'resolve_moment', { p_signal_id: signalId }),
    cancelMoment: (signalId) => mutate('cancel', 'cancel_moment', { p_signal_id: signalId }),
    removeNote: (signalId) => mutate('remove-note', 'remove_moment_note', { p_signal_id: signalId }),
    moveToMoment: (signalId) => mutate('move', 'move_to_moment', { p_signal_id: signalId }),
    leaveMoment: (signalId) => mutate('leave', 'leave_moment', { p_signal_id: signalId }),
    returnToMoment: (signalId) => mutate('return', 'return_to_moment', { p_signal_id: signalId }),
    joinMoment: (signalId) => mutate('join', 'join_moment', { p_signal_id: signalId }),
    enqueueDrawingReaction: async (row) => {
      const ctx = get().ctx;
      if (!ctx || row.from_user === ctx.userId || row.couple_id !== ctx.coupleId) return;
      const identity = `${row.id}:${row.updated_at}`;
      if (seenDrawingIds.has(identity)) return;
      seenDrawingIds.add(identity);
      await persistSeenSpatial(ctx);
      reactionQueue.push({
        id: `drawing:${identity}`,
        signalId: null,
        anchor: 'drawing',
        copy: 'A tiny doodle arrived.',
        actionEvent: null,
        showBubble: true,
      });
      const surface = useMomentsSurfaceStore.getState();
      if (!surface.expanded && !surface.hearthOpen && !surface.settingsOpen && surface.appVisible) {
        beginNextReactionBeat();
      }
    },
    resumePlayback: () => {
      const surface = useMomentsSurfaceStore.getState();
      if (surface.settingsOpen || surface.hearthOpen || surface.expanded || !surface.appVisible) return;
      if (reactionQueue.length > 0) beginNextReactionBeat();
      else if (completionQueue.length > 0) beginNextCompletionBeat();
    },

    reset: () => {
      newestRefresh += 1;
      newestAppliedRefresh = newestRefresh;
      completionContextKey = null;
      completionBaselinePending = true;
      actionBaselinePending = true;
      readinessBaselinePending = true;
      seenCompletionIds.clear();
      seenActionIds.clear();
      seenReadinessIds.clear();
      seenDrawingIds.clear();
      completionQueue.length = 0;
      reactionQueue.length = 0;
      if (completionBeatTimer) clearTimeout(completionBeatTimer);
      if (reactionBeatTimer) clearTimeout(reactionBeatTimer);
      completionBeatTimer = null;
      reactionBeatTimer = null;
      set({
        ctx: null,
        snapshot: null,
        loading: false,
        busyAction: null,
        error: null,
        liveCompletion: null,
        liveAction: null,
        liveReaction: null,
      });
      const scene = useSceneStore.getState();
      scene.setSpot('a', 'idle');
      scene.setSpot('b', 'idle');
      scene.setInteractionSpot(null);
      scene.setFireplaceWaiting(false);
      scene.setMomentAtmosphere(null);
      scene.setMomentActionEvents([], []);
      scene.clearMomentAction();
      scene.clearMomentPayoff();
      useMomentsSurfaceStore.getState().minimize();
    },
  };
});
