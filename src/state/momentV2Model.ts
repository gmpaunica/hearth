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

export function momentStatusCopy(snapshot: MomentSnapshotV2 | null): MomentStatusCopy {
  const active = snapshot?.active;
  if (!snapshot || !active) {
    return {
      headline: 'Fire: steady',
      subtitle: 'The shared atmosphere is calm.',
      minimized: 'New moment',
    };
  }
  const partnerName = snapshot.identity.partner_name || 'your partner';
  const invited = active.author_id !== snapshot.identity.user_id;
  const partner = partnerParticipant(snapshot);
  const headline = MOMENT_V2.destinations[active.destination].headline;

  if (invited && snapshot.personal_action.kind.startsWith('respond_')) {
    return { headline, subtitle: 'Your response matters.', minimized: `Reply to ${partnerName}` };
  }
  if (!invited && !partner?.response_action) {
    return { headline, subtitle: `Waiting for ${partnerName}.`, minimized: `Waiting for ${partnerName}` };
  }
  if (snapshot.personal_action.kind === 'join_fireplace') {
    return { headline, subtitle: 'The fire is still waiting.', minimized: 'Join them at the fire' };
  }
  if (snapshot.personal_action.kind === 'join_table') {
    return { headline, subtitle: 'The table is still waiting.', minimized: 'Join them at the table' };
  }
  if (snapshot.personal_action.kind === 'confirm_fireplace') {
    return { headline, subtitle: 'Your private check-in is ready.', minimized: 'Open moment' };
  }
  return { headline, subtitle: 'This shared moment is still open.', minimized: 'Open moment' };
}
