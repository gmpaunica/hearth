import type {
  FireplaceParticipantRow,
  FireplacePathwayId,
  FireplaceSessionRow,
  InteractionSnapshot,
  LegacyInteractionStateRow,
  SignalPresenceRow,
  SignalRow,
} from '../lib/db';

export interface LegacyInteractionState {
  need?: string;
  response?: string;
  responseAt?: number;
  authorReturnedAt?: number;
  authorLeftAt?: number;
  responderLeftAt?: number;
}

export interface InteractionThread {
  id: string;
  coupleId: string;
  fromUser: string;
  recipientUserId: string | null;
  type: SignalRow['type'];
  groupId: string;
  groupSize: number;
  createdAt: number;
  latestActivityAt: number;
  resolvedAt: number | null;
  presence: SignalPresenceRow[];
  session: FireplaceSessionRow | null;
  participants: FireplaceParticipantRow[];
  legacy: LegacyInteractionState | null;
}

const LEGACY_NEED_PREFIX = '__hearth_fireplace_need_v1__:';
const LEGACY_PRESENCE_PREFIX = '__hearth_signal_presence_v1__:';
const INTERNAL_RESPONSE_PREFIX = '__hearth_';
const LEGACY_NEEDS = new Set([
  'beside',
  'reassurance',
  'talk',
  'heard-first',
  'apology',
  'sorry',
  'more-time',
]);

const JOIN_RESPONSES: Partial<Record<SignalRow['type'], string>> = {
  fireplace: 'Sit beside them',
  sofa: 'Sit with them',
  table: "I'm ready",
  romantic: 'Come close',
};

function at(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isInternalResponseChoice(choice: string | null | undefined): boolean {
  return !!choice?.startsWith(INTERNAL_RESPONSE_PREFIX);
}

function typedLegacyState(row: LegacyInteractionStateRow): LegacyInteractionState {
  const need = row.need && LEGACY_NEEDS.has(row.need) ? row.need : undefined;
  const response = !isInternalResponseChoice(row.response) ? row.response ?? undefined : undefined;
  return {
    need,
    response,
    responseAt: response ? at(row.response_at) : undefined,
    authorReturnedAt: at(row.author_returned_at) || undefined,
    authorLeftAt: at(row.author_left_at) || undefined,
    responderLeftAt: at(row.responder_left_at) || undefined,
  };
}

function legacyForSignal(
  signal: SignalRow,
  snapshot: InteractionSnapshot,
): LegacyInteractionState | null {
  if (snapshot.sessions.some((session) => session.signal_id === signal.id)) return null;
  const typed = snapshot.legacy_state?.find((row) => row.signal_id === signal.id);
  if (typed) return typedLegacyState(typed);
  const state: LegacyInteractionState = {};
  const responses = snapshot.legacy_responses
    .filter((response) => response.signal_id === signal.id)
    .sort((left, right) => at(left.created_at) - at(right.created_at));

  for (const response of responses) {
    const eventAt = at(response.created_at);
    if (response.choice.startsWith(LEGACY_NEED_PREFIX)) {
      const need = response.choice.slice(LEGACY_NEED_PREFIX.length);
      if (response.from_user === signal.from_user && LEGACY_NEEDS.has(need)) state.need = need;
      continue;
    }
    if (response.choice.startsWith(LEGACY_PRESENCE_PREFIX)) {
      const event = response.choice.slice(LEGACY_PRESENCE_PREFIX.length);
      const fromAuthor = response.from_user === signal.from_user;
      if (event === 'author-return' && fromAuthor) state.authorReturnedAt = eventAt;
      if (event === 'leave') {
        if (fromAuthor) state.authorLeftAt = eventAt;
        else state.responderLeftAt = eventAt;
      }
      continue;
    }
    if (isInternalResponseChoice(response.choice)) continue;
    if (response.from_user !== signal.from_user) {
      state.response = response.choice;
      state.responseAt = eventAt;
    }
  }
  return state;
}

export function buildInteractionThreads(snapshot: InteractionSnapshot): InteractionThread[] {
  const groupSizes = new Map<string, number>();
  for (const signal of snapshot.signals) {
    const groupId = signal.group_id ?? signal.id;
    groupSizes.set(groupId, (groupSizes.get(groupId) ?? 0) + 1);
  }
  for (const group of snapshot.groups) {
    if (group.signal_count) groupSizes.set(group.id, group.signal_count);
  }

  return snapshot.signals.map((signal) => ({
    id: signal.id,
    coupleId: signal.couple_id,
    fromUser: signal.from_user,
    recipientUserId: signal.recipient_user_id ?? null,
    type: signal.type,
    groupId: signal.group_id ?? signal.id,
    groupSize: groupSizes.get(signal.group_id ?? signal.id) ?? 1,
    createdAt: at(signal.created_at),
    latestActivityAt: at(signal.latest_activity_at) || at(signal.created_at),
    resolvedAt: signal.resolved_at ? at(signal.resolved_at) : null,
    presence: snapshot.presence.filter((row) => row.signal_id === signal.id),
    session: snapshot.sessions.find((row) => row.signal_id === signal.id) ?? null,
    participants: snapshot.participants.filter((row) => row.signal_id === signal.id),
    legacy: legacyForSignal(signal, snapshot),
  }));
}

export function isOpenThread(thread: InteractionThread): boolean {
  return thread.resolvedAt == null;
}

export function isCompletedToday(thread: InteractionThread, now = Date.now()): boolean {
  return !!(
    thread.session?.phase === 'completed' &&
    thread.session.expires_at &&
    at(thread.session.expires_at) > now
  );
}

export function participantFor(
  thread: InteractionThread,
  userId: string,
): FireplaceParticipantRow | null {
  return thread.participants.find((participant) => participant.user_id === userId) ?? null;
}

export function responseFor(thread: InteractionThread): string | null {
  if (thread.session) {
    return (
      thread.participants.find((participant) => participant.participant_role === 'partner')
        ?.response_action ?? null
    );
  }
  const response = thread.legacy?.response ?? null;
  return isInternalResponseChoice(response) ? null : response;
}

export function threadNeedsResponse(thread: InteractionThread, userId: string): boolean {
  return isOpenThread(thread) && thread.fromUser !== userId && !responseFor(thread);
}

export function threadNeedsAction(
  thread: InteractionThread,
  userId: string,
  now = Date.now(),
): boolean {
  if (threadNeedsResponse(thread, userId)) return true;
  if (!isOpenThread(thread) || !thread.session || !responseFor(thread)) return false;
  const mine = participantFor(thread, userId);
  const scheduledForMe = thread.session.scheduled_by_user_id === userId;
  if (scheduledForMe && !thread.session.returned_at) {
    const scheduled = at(thread.session.scheduled_for);
    return scheduled > 0 && scheduled <= now;
  }
  if (!mine?.action_completed_at) return true;
  return thread.session.phase === 'continue' && !mine.readiness;
}

export function threadIsPaused(
  thread: InteractionThread,
  userId: string,
  now = Date.now(),
): boolean {
  if (!isOpenThread(thread) || !thread.session) return false;
  const scheduled = at(thread.session.scheduled_for);
  if (!thread.session.returned_at && (scheduled > now || thread.session.pathway === 'more_time')) {
    return true;
  }
  return participantFor(thread, userId)?.readiness === 'more_time';
}

export function sortInteractionThreads(
  threads: InteractionThread[],
  userId: string,
  now = Date.now(),
): InteractionThread[] {
  const rank = (thread: InteractionThread) => {
    if (threadNeedsResponse(thread, userId)) return 0;
    if (threadIsPaused(thread, userId, now)) return 1;
    if (isOpenThread(thread)) return 2;
    if (isCompletedToday(thread, now)) return 3;
    return 4;
  };
  return [...threads]
    .filter((thread) => isOpenThread(thread) || isCompletedToday(thread, now))
    .sort((left, right) => {
      const rankDiff = rank(left) - rank(right);
      if (rankDiff) return rankDiff;
      const leftAt = left.session?.completed_at
        ? at(left.session.completed_at)
        : left.latestActivityAt;
      const rightAt = right.session?.completed_at
        ? at(right.session.completed_at)
        : right.latestActivityAt;
      return rightAt - leftAt || right.createdAt - left.createdAt;
    });
}

interface LocatedThread {
  thread: InteractionThread;
  at: number;
}

function legacyLocationForUser(
  thread: InteractionThread,
  userId: string,
): LocatedThread | null {
  const legacy = thread.legacy;
  if (!legacy || !isOpenThread(thread)) return null;
  if (thread.fromUser === userId) {
    const movedAt = Math.max(thread.createdAt, legacy.authorReturnedAt ?? 0);
    if ((legacy.authorLeftAt ?? 0) >= movedAt) return null;
    return { thread, at: movedAt };
  }
  if (
    legacy.response &&
    JOIN_RESPONSES[thread.type] === legacy.response &&
    legacy.responseAt &&
    (legacy.responderLeftAt ?? 0) < legacy.responseAt
  ) {
    return { thread, at: legacy.responseAt };
  }
  return null;
}

/** New structured presence wins permanently after the person's first move or
 * leave. This prevents leaving a current thread from reviving an older legacy
 * encoded location. */
export function currentThreadForUser(
  threads: InteractionThread[],
  userId: string,
): LocatedThread | null {
  const rows = threads.flatMap((thread) =>
    thread.presence
      .filter((presence) => presence.user_id === userId)
      .map((presence) => ({ thread, presence })),
  );
  const hasStructuredIntent = rows.some(
    ({ presence }) => !!presence.moved_at || !!presence.left_at,
  );
  if (hasStructuredIntent) {
    return rows
      .filter(({ presence, thread }) => presence.is_current && isOpenThread(thread))
      .map(({ thread, presence }) => ({ thread, at: at(presence.moved_at) }))
      .sort((left, right) => right.at - left.at)[0] ?? null;
  }
  return threads
    .map((thread) => legacyLocationForUser(thread, userId))
    .filter((candidate): candidate is LocatedThread => candidate != null)
    .sort((left, right) => right.at - left.at)[0] ?? null;
}

export function outcomePathways(
  threads: InteractionThread[],
  now = Date.now(),
): FireplacePathwayId[] {
  return [...new Set(
    threads
      .filter((thread) => isCompletedToday(thread, now))
      .map((thread) => thread.session!.pathway),
  )];
}

export function outcomeThreads(
  threads: InteractionThread[],
  pathway: FireplacePathwayId,
  now = Date.now(),
): InteractionThread[] {
  return threads
    .filter(
      (thread) =>
        thread.session?.pathway === pathway && isCompletedToday(thread, now),
    )
    .sort(
      (left, right) =>
        at(right.session?.completed_at) - at(left.session?.completed_at),
    );
}

export function relatedCompletedThread(
  threads: InteractionThread[],
  thread: InteractionThread,
  userId: string,
): InteractionThread | null {
  if (!isOpenThread(thread) || thread.fromUser !== userId || thread.groupSize < 2) return null;
  const ownParticipant = participantFor(thread, userId);
  return (
    threads.find(
      (candidate) =>
        candidate.id !== thread.id &&
        candidate.groupId === thread.groupId &&
        isCompletedToday(candidate) &&
        ownParticipant?.related_prompt_signal_id !== candidate.id,
    ) ?? null
  );
}
