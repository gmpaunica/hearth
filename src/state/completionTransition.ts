import type { InteractionThread } from './interactionModel';

export interface LiveCompletionTransition {
  signalId: string;
  completedAt: number;
}

/**
 * Returns only newly observed open-to-completed transitions. Existing
 * completions on the first snapshot are a baseline, and seen ids fence
 * duplicate or out-of-order Realtime refreshes.
 */
export function liveCompletionTransitions(
  previous: InteractionThread[],
  current: InteractionThread[],
  seenIds: ReadonlySet<string>,
  isBaseline: boolean,
): LiveCompletionTransition[] {
  if (isBaseline) return [];
  const previousPhase = new Map(
    previous.map((thread) => [thread.id, thread.session?.phase ?? null]),
  );
  return current
    .filter(
      (thread) =>
        thread.session?.phase === 'completed' &&
        previousPhase.get(thread.id) !== 'completed' &&
        !seenIds.has(thread.id),
    )
    .map((thread) => ({
      signalId: thread.id,
      completedAt: thread.session?.completed_at
        ? Date.parse(thread.session.completed_at)
        : Date.now(),
    }))
    .sort((left, right) => left.completedAt - right.completedAt);
}
