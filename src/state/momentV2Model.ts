import { MOMENT_V2 } from '@/copy';
import type {
  ActiveMomentV2,
  MomentParticipantV2,
  MomentPresenceV2,
  MomentSnapshotV2,
} from '@/lib/db';
import { consequencesFor, type MomentConsequence } from '@/moments/consequenceCatalog';

const DESTINATIONS = new Set(['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic']);

export function normalizeMomentSnapshotV2(value: unknown): MomentSnapshotV2 {
  const source = value && typeof value === 'object'
    ? value as Partial<MomentSnapshotV2>
    : {};
  const identity = source.identity && typeof source.identity === 'object'
    ? source.identity
    : { user_id: '', partner_id: '', user_name: 'You', partner_name: 'your partner' };
  const active = source.active && DESTINATIONS.has(source.active.destination)
    ? source.active
    : null;
  return {
    identity,
    active,
    personal_action: source.personal_action ?? { kind: active ? 'wait' : 'none' },
    participants: Array.isArray(source.participants) ? source.participants : [],
    presence: Array.isArray(source.presence) ? source.presence : [],
    today_outcomes: Array.isArray(source.today_outcomes)
      ? source.today_outcomes.map((outcome) => ({
        ...outcome,
        notes: Array.isArray(outcome.notes) ? outcome.notes : [],
      }))
      : [],
    completion_events: Array.isArray(source.completion_events) ? source.completion_events : [],
    current_action_events: Array.isArray(source.current_action_events) ? source.current_action_events : [],
    today_action_events: Array.isArray(source.today_action_events) ? source.today_action_events : [],
    readiness_events: Array.isArray(source.readiness_events) ? source.readiness_events : [],
    earlier_moments: Array.isArray(source.earlier_moments) ? source.earlier_moments : [],
  };
}

export function participantFor(
  snapshot: MomentSnapshotV2 | null,
  userId: string | null,
): MomentParticipantV2 | null {
  if (!snapshot || !userId) return null;
  return snapshot.participants.find((participant) => participant.user_id === userId) ?? null;
}

export function partnerParticipant(snapshot: MomentSnapshotV2 | null): MomentParticipantV2 | null {
  return participantFor(snapshot, snapshot?.identity.partner_id ?? null);
}

export function responseActionsFor(active: ActiveMomentV2): MomentConsequence[] {
  return consequencesFor(active.destination, active.intent);
}

export function latestPresenceForUser(
  presence: MomentPresenceV2[],
  userId: string,
): MomentPresenceV2 | null {
  return presence
    .filter((row) => row.user_id === userId && row.is_present)
    .sort((left, right) => Date.parse(right.moved_at ?? '') - Date.parse(left.moved_at ?? ''))[0]
    ?? null;
}

export interface MomentStatusCopy {
  headline: string;
  subtitle: string;
  minimized: string;
}

export type MomentJourneyKind =
  | 'send'
  | 'waiting'
  | 'respond'
  | 'acknowledge'
  | 'meet'
  | 'return';

export interface MomentJourneyPresentation {
  kind: MomentJourneyKind;
  eyebrow: string;
  title: string;
  detail: string;
}

/**
 * One calm, user-facing next state for every server personal-action value.
 * Server enum names stay behind this boundary so they can never leak into UI.
 */
export function momentJourneyPresentation(
  snapshot: MomentSnapshotV2 | null,
): MomentJourneyPresentation {
  const active = snapshot?.active;
  if (!snapshot || !active) {
    return {
      kind: 'send',
      eyebrow: 'When words feel hard',
      title: 'Share one gentle signal',
      detail: 'Choose a place and an optional sentence. It stays between the two of you.',
    };
  }

  const action = snapshot.personal_action.kind;
  if (action.startsWith('respond_')) {
    const givingSpace = active.destination === 'garden';
    return {
      kind: givingSpace ? 'acknowledge' : 'respond',
      eyebrow: givingSpace ? 'Acknowledge' : 'Respond',
      title: givingSpace ? 'Help them have space without disappearing' : 'Choose the response that feels true',
      detail: givingSpace
        ? 'You can respect the quiet or leave a small sign of care. Reply only if and when you choose.'
        : 'Each choice says what happens next. A note is always optional.',
    };
  }

  if (action === 'join_fireplace' || action === 'join_table') {
    const atFire = action === 'join_fireplace';
    return {
      kind: 'meet',
      eyebrow: 'Meet when you choose',
      title: atFire ? 'The fire is still open to you' : 'The table is still open to you',
      detail: 'Join whenever it feels right, or leave the Moment open for later.',
    };
  }

  if (action === 'confirm_fireplace') {
    return {
      kind: 'meet',
      eyebrow: 'Mutually meet',
      title: 'Your half of the reconnect heart is yours',
      detail: 'Either of you can change your own readiness. Hearth closes this only when both halves are ready.',
    };
  }

  if (action.startsWith('resolve_')) {
    return {
      kind: 'return',
      eyebrow: active.destination === 'garden' ? 'Return in your own time' : 'Close when it feels true',
      title: active.destination === 'garden' ? 'You decide when your quiet is complete' : 'You decide when this Moment is complete',
      detail: 'Closing records only a gentle ending. It does not judge what happened between you.',
    };
  }

  const authoredByMe = active.author_id === snapshot.identity.user_id;
  return {
    kind: 'waiting',
    eyebrow: 'Nothing is required now',
    title: authoredByMe ? 'Your signal is waiting gently' : 'You have answered with care',
    detail: 'This Moment stays open until one of you chooses to close it. Nothing closes automatically or measures your relationship.',
  };
}

export function momentStatusCopy(snapshot: MomentSnapshotV2 | null): MomentStatusCopy {
  const active = snapshot?.active;
  if (!snapshot || !active) {
    return {
      headline: 'Fire: steady',
      subtitle: 'The shared atmosphere is calm.',
      minimized: 'New moment',
    };
  }
  const invited = active.author_id !== snapshot.identity.user_id;
  const partner = partnerParticipant(snapshot);
  const headline = MOMENT_V2.destinations[active.destination].headline;

  if (invited && snapshot.personal_action.kind.startsWith('respond_')) {
    return { headline, subtitle: 'Choose what feels true for you.', minimized: 'A response is waiting' };
  }
  if (!invited && !partner?.response_action) {
    return { headline, subtitle: 'Your signal is there when they return.', minimized: 'Waiting gently' };
  }
  if (snapshot.personal_action.kind === 'join_fireplace') {
    return { headline, subtitle: 'The fire is still waiting.', minimized: 'Join them at the fire' };
  }
  if (snapshot.personal_action.kind === 'join_table') {
    return { headline, subtitle: 'The table is still waiting.', minimized: 'Join them at the table' };
  }
  if (snapshot.personal_action.kind === 'confirm_fireplace') {
    return { headline, subtitle: 'Each heart half belongs to one person.', minimized: 'Meet by the fire' };
  }
  return { headline, subtitle: 'This shared moment is still open.', minimized: 'Open moment' };
}
