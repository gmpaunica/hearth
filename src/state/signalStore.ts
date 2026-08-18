import { create } from 'zustand';

import type {
  FireplacePathwayId,
  FireplaceReadiness,
  InteractionSnapshot,
} from '@/lib/db';
import type { SignalType } from '@/copy';
import { reconcileReturnNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import {
  buildInteractionThreads,
  currentThreadForUser,
  isOpenThread,
  outcomeThreads,
  sortInteractionThreads,
  threadNeedsAction,
  type InteractionThread,
} from './interactionModel';
import {
  liveCompletionTransitions,
  type LiveCompletionTransition,
} from './completionTransition';
import { useMomentsSurfaceStore } from './momentsSurfaceStore';
import { useSceneStore, type AvatarKey } from './sceneStore';

export type { InteractionThread } from './interactionModel';

export interface SyncContext {
  coupleId: string;
  userId: string;
  partnerId: string | null;
  myAvatar: AvatarKey;
  partnerAvatar: AvatarKey;
}

export interface StartInteractionInput {
  type: SignalType;
  pathway?: FireplacePathwayId;
  sentence?: string;
  returnAt?: Date | null;
  connectToSignalId?: string | null;
}

export interface RespondInteractionInput {
  action: string;
  returnAt?: Date | null;
}

interface SignalFlowState {
  threads: InteractionThread[];
  focusedId: string | null;
  outcomeFilter: FireplacePathwayId | null;
  ctx: SyncContext | null;
  loading: boolean;
  busyAction: string | null;
  error: string | null;
  liveCompletion: LiveCompletionTransition | null;

  setContext: (ctx: SyncContext | null) => void;
  hydrate: (snapshot: InteractionSnapshot, snapScene?: boolean) => void;
  refresh: (snapScene?: boolean) => Promise<void>;
  focus: (signalId: string) => void;
  focusOutcome: (pathway: FireplacePathwayId) => void;
  clearOutcomeFilter: () => void;
  clearError: () => void;
  startInteraction: (input: StartInteractionInput) => Promise<boolean>;
  moveToInteraction: (signalId: string) => Promise<boolean>;
  leaveInteraction: (signalId: string) => Promise<boolean>;
  returnToFireplace: (signalId: string) => Promise<boolean>;
  respondToInteraction: (
    signalId: string,
    input: RespondInteractionInput,
  ) => Promise<boolean>;
  continueFireplace: (signalId: string) => Promise<boolean>;
  setReadiness: (
    signalId: string,
    readiness: FireplaceReadiness,
  ) => Promise<boolean>;
  rescheduleReturn: (signalId: string, returnAt: Date) => Promise<boolean>;
  setFireplaceSentence: (signalId: string, sentence: string | null) => Promise<boolean>;
  redactSentence: (signalId: string) => Promise<boolean>;
  closeAuthoredInteraction: (signalId: string) => Promise<boolean>;
  answerRelatedSettlement: (
    signalId: string,
    completedSignalId: string,
    settled: boolean,
  ) => Promise<boolean>;
  reset: () => void;
}

let newestRefresh = 0;
let newestAppliedRefresh = 0;
let completionContextKey: string | null = null;
let completionBeatTimer: ReturnType<typeof setTimeout> | null = null;
const seenCompletionIds = new Set<string>();
const completionQueue: LiveCompletionTransition[] = [];

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Something changed before that action finished. Please try again.';
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function projectScene(
  threads: InteractionThread[],
  ctx: SyncContext | null,
  snapScene: boolean,
): void {
  if (!ctx) return;
  const mine = currentThreadForUser(threads, ctx.userId);
  const partner = ctx.partnerId
    ? currentThreadForUser(threads, ctx.partnerId)
    : null;
  const scene = useSceneStore.getState();
  scene.setSpot(ctx.myAvatar, mine?.thread.type ?? 'idle');
  scene.setSpot(ctx.partnerAvatar, partner?.thread.type ?? 'idle');
  const newestLocation = [mine, partner]
    .filter((location): location is NonNullable<typeof location> => location != null)
    .sort((left, right) => right.at - left.at)[0] ?? null;
  scene.setInteractionSpot(newestLocation?.thread.type ?? null);
  scene.setFireplaceWaiting(
    newestLocation?.thread.type === 'fireplace' &&
      newestLocation.thread.session?.phase !== 'completed',
  );
  if (snapScene) scene.requestSnap();
  void reconcileReturnNotifications(threads, ctx.userId);
}

function normalizeSnapshot(value: unknown): InteractionSnapshot {
  const source = value && typeof value === 'object' ? value as Partial<InteractionSnapshot> : {};
  return {
    signals: Array.isArray(source.signals) ? source.signals : [],
    groups: Array.isArray(source.groups) ? source.groups : [],
    presence: Array.isArray(source.presence) ? source.presence : [],
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    participants: Array.isArray(source.participants) ? source.participants : [],
    legacy_state: Array.isArray(source.legacy_state) ? source.legacy_state : [],
    legacy_responses: Array.isArray(source.legacy_responses)
      ? source.legacy_responses
      : [],
  };
}

async function invoke(
  name: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  const result = await supabase.rpc(name, args);
  return { data: result.data, error: result.error };
}

export const useSignalStore = create<SignalFlowState>((set, get) => {
  const beginNextCompletionBeat = () => {
    if (completionBeatTimer || completionQueue.length === 0) return;
    const transition = completionQueue.shift()!;
    set({ liveCompletion: transition });
    const scene = useSceneStore.getState();
    const { ctx } = get();
    if (ctx) {
      scene.setSpot(ctx.myAvatar, 'fireplace');
      scene.setSpot(ctx.partnerAvatar, 'fireplace');
      scene.setInteractionSpot('fireplace');
      scene.requestSnap();
    }
    scene.setFireplaceWaiting(false);
    scene.triggerGlow('fireplace');
    const duration = scene.reduceMotion ? 1250 : 2500;
    completionBeatTimer = setTimeout(() => {
      completionBeatTimer = null;
      const state = get();
      if (completionQueue.length > 0) {
        beginNextCompletionBeat();
      } else {
        set({ liveCompletion: null });
        projectScene(state.threads, state.ctx, false);
      }
    }, duration);
  };

  const applySnapshot = (snapshot: InteractionSnapshot, snapScene = false) => {
    const threads = buildInteractionThreads(snapshot);
    const { ctx, focusedId, outcomeFilter, threads: previous } = get();
    const contextKey = ctx ? `${ctx.coupleId}:${ctx.userId}` : null;
    const isBaseline = contextKey !== null && completionContextKey !== contextKey;
    if (isBaseline) {
      completionContextKey = contextKey;
      seenCompletionIds.clear();
      for (const thread of threads) {
        if (thread.session?.phase === 'completed') seenCompletionIds.add(thread.id);
      }
    }
    const transitions = liveCompletionTransitions(
      previous,
      threads,
      seenCompletionIds,
      isBaseline || contextKey === null,
    );
    for (const transition of transitions) {
      seenCompletionIds.add(transition.signalId);
      completionQueue.push(transition);
    }
    const sorted = ctx ? sortInteractionThreads(threads, ctx.userId) : threads;
    const matchingOutcome = outcomeFilter
      ? outcomeThreads(threads, outcomeFilter)[0]
      : null;
    const nextFocused = matchingOutcome?.id
      ?? (focusedId && threads.some((thread) => thread.id === focusedId)
        ? focusedId
        : sorted[0]?.id ?? null);
    set({ threads, focusedId: nextFocused, loading: false, error: null });
    if (transitions.length > 0) beginNextCompletionBeat();
    else if (!completionBeatTimer) projectScene(threads, ctx, snapScene);
  };

  const mutate = async (
    busyAction: string,
    rpc: string,
    args: Record<string, unknown>,
    focusId?: string,
  ): Promise<{ ok: boolean; data: unknown }> => {
    set({ busyAction, error: null });
    try {
      const { data, error } = await invoke(rpc, args);
      if (error) throw error;
      if (focusId) set({ focusedId: focusId, outcomeFilter: null });
      await get().refresh(false);
      set({ busyAction: null });
      return { ok: true, data };
    } catch (error) {
      set({ busyAction: null, error: messageOf(error) });
      return { ok: false, data: null };
    }
  };

  return {
    threads: [],
    focusedId: null,
    outcomeFilter: null,
    ctx: null,
    loading: false,
    busyAction: null,
    error: null,
    liveCompletion: null,

    setContext: (ctx) => {
      newestRefresh += 1;
      newestAppliedRefresh = newestRefresh;
      const previous = get().ctx;
      const changed =
        previous?.coupleId !== ctx?.coupleId || previous?.userId !== ctx?.userId;
      if (changed) {
        completionContextKey = null;
        seenCompletionIds.clear();
        completionQueue.length = 0;
        if (completionBeatTimer) clearTimeout(completionBeatTimer);
        completionBeatTimer = null;
        set({ liveCompletion: null });
      }
      set({ ctx });
    },

    hydrate: (snapshot, snapScene = false) => applySnapshot(snapshot, snapScene),

    refresh: async (snapScene = false) => {
      const { ctx } = get();
      if (!ctx) return;
      const requestId = ++newestRefresh;
      set({ loading: get().threads.length === 0, error: null });
      const { data, error } = await invoke('get_interaction_snapshot', {
        p_couple_id: ctx.coupleId,
      });
      if (requestId < newestAppliedRefresh) return;
      newestAppliedRefresh = requestId;
      if (error) {
        set({ loading: false, error: messageOf(error) });
        return;
      }
      applySnapshot(normalizeSnapshot(data), snapScene);
    },

    focus: (focusedId) => set({ focusedId, outcomeFilter: null }),

    focusOutcome: (outcomeFilter) => {
      const first = outcomeThreads(get().threads, outcomeFilter)[0];
      set({ outcomeFilter, focusedId: first?.id ?? get().focusedId });
    },

    clearOutcomeFilter: () => set({ outcomeFilter: null }),
    clearError: () => set({ error: null }),

    startInteraction: async (input) => {
      const ctx = get().ctx;
      if (!ctx) return false;
      if (get().busyAction) return false;
      set({ busyAction: 'start', error: null });
      try {
        const { data, error } = await invoke('start_interaction', {
          p_type: input.type,
          p_pathway: input.pathway ?? null,
          p_timezone: deviceTimezone(),
          p_sentence: input.sentence?.trim() || null,
          p_return_at: input.returnAt?.toISOString() ?? null,
          p_connect_to_signal_id: input.connectToSignalId ?? null,
        });
        if (error) throw error;
        const signalId = typeof data === 'string' ? data : null;
        set({ focusedId: signalId, outcomeFilter: null });
        await get().refresh(false);
        set({ busyAction: null });
        return true;
      } catch (error) {
        set({ error: messageOf(error), busyAction: null });
        return false;
      }
    },

    moveToInteraction: async (signalId) =>
      (await mutate('move', 'move_to_interaction', { p_signal_id: signalId }, signalId)).ok,

    leaveInteraction: async (signalId) =>
      (await mutate('leave', 'leave_interaction', { p_signal_id: signalId })).ok,

    returnToFireplace: async (signalId) =>
      (await mutate('return', 'return_to_fireplace', { p_signal_id: signalId }, signalId)).ok,

    respondToInteraction: async (signalId, input) =>
      (await mutate(
        'respond',
        'respond_to_interaction',
        {
          p_signal_id: signalId,
          p_action: input.action,
          p_return_at: input.returnAt?.toISOString() ?? null,
        },
        signalId,
      )).ok,

    continueFireplace: async (signalId) =>
      (await mutate('continue', 'complete_fireplace_action', { p_signal_id: signalId }, signalId)).ok,

    setReadiness: async (signalId, readiness) =>
      (await mutate(
        'readiness',
        'set_fireplace_readiness',
        { p_signal_id: signalId, p_readiness: readiness },
        signalId,
      )).ok,

    rescheduleReturn: async (signalId, returnAt) =>
      (await mutate(
        'reschedule',
        'reschedule_fireplace_return',
        { p_signal_id: signalId, p_return_at: returnAt.toISOString() },
        signalId,
      )).ok,

    setFireplaceSentence: async (signalId, sentence) =>
      (await mutate(
        'sentence',
        'set_fireplace_sentence',
        { p_signal_id: signalId, p_sentence: sentence?.trim() || null },
        signalId,
      )).ok,

    redactSentence: async (signalId) =>
      (await mutate('redact', 'redact_fireplace_sentence', { p_signal_id: signalId }, signalId)).ok,

    closeAuthoredInteraction: async (signalId) =>
      (await mutate('close', 'close_authored_interaction', { p_signal_id: signalId })).ok,

    answerRelatedSettlement: async (signalId, completedSignalId, settled) =>
      (await mutate(
        'related',
        'answer_related_settlement',
        {
          p_signal_id: signalId,
          p_completed_signal_id: completedSignalId,
          p_settled: settled,
        },
        signalId,
      )).ok,

    reset: () => {
      newestRefresh += 1;
      newestAppliedRefresh = newestRefresh;
      completionContextKey = null;
      seenCompletionIds.clear();
      completionQueue.length = 0;
      if (completionBeatTimer) clearTimeout(completionBeatTimer);
      completionBeatTimer = null;
      set({
        threads: [],
        focusedId: null,
        outcomeFilter: null,
        ctx: null,
        loading: false,
        busyAction: null,
        error: null,
        liveCompletion: null,
      });
      const scene = useSceneStore.getState();
      scene.setFireplaceWaiting(false);
      scene.setInteractionSpot(null);
      useMomentsSurfaceStore.getState().minimize();
      void reconcileReturnNotifications([], '');
    },
  };
});

export const selectSortedThreads = (state: SignalFlowState): InteractionThread[] =>
  state.ctx
    ? sortInteractionThreads(state.threads, state.ctx.userId)
    : state.threads;

export const selectFocusedThread = (state: SignalFlowState): InteractionThread | null =>
  state.threads.find((thread) => thread.id === state.focusedId) ?? null;

export const selectStableFocusedThread = (state: SignalFlowState): InteractionThread | null => {
  const sorted = selectSortedThreads(state);
  return sorted.find((thread) => thread.id === state.focusedId) ?? sorted[0] ?? null;
};

export const selectOpenMomentCount = (state: SignalFlowState): number =>
  state.threads.filter(isOpenThread).length;

export const selectNeedsActionCount = (state: SignalFlowState): number =>
  state.ctx
    ? state.threads.filter((thread) => threadNeedsAction(thread, state.ctx!.userId)).length
    : 0;

export const selectCurrentUserPresence = (state: SignalFlowState): InteractionThread | null =>
  state.ctx ? currentThreadForUser(state.threads, state.ctx.userId)?.thread ?? null : null;

export const selectLiveCompletionTransition = (
  state: SignalFlowState,
): LiveCompletionTransition | null => state.liveCompletion;

export const selectHasInteractions = (state: SignalFlowState): boolean =>
  state.threads.length > 0;
