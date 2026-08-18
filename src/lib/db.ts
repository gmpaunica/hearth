// Row shapes for the tables defined in supabase/schema.sql. Kept deliberately
// small — only the columns the client actually reads.
import type { SignalType } from '@/copy';

export interface Couple {
  id: string;
  invite_code: string;
  member_a: string;
  member_b: string | null;
  home_timezone?: string | null;
  created_at: string;
}

export interface ProfileAvatarRow {
  id: string;
  avatar_config: unknown;
}

export interface SignalRow {
  id: string;
  couple_id: string;
  from_user: string;
  recipient_user_id?: string;
  type: SignalType;
  group_id?: string;
  created_at: string;
  latest_activity_at?: string;
  resolved_at: string | null;
}

export interface ResponseRow {
  id: string;
  signal_id: string;
  from_user: string;
  choice: string;
  created_at: string;
}

export interface InteractionGroupRow {
  id: string;
  couple_id: string;
  created_by: string;
  created_at: string;
  signal_count?: number;
}

export interface SignalPresenceRow {
  signal_id: string;
  user_id: string;
  is_current: boolean;
  moved_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FireplacePathwayId =
  | 'stay_close'
  | 'talk_through'
  | 'hear_first'
  | 'acknowledge_hurt'
  | 'apologize'
  | 'more_time';

export type FireplacePhase = 'waiting' | 'responded' | 'continue' | 'completed' | 'closed';
export type FireplaceReadiness = 'reconnected' | 'talk_first' | 'more_time';

export interface FireplaceSessionRow {
  signal_id: string;
  pathway: FireplacePathwayId;
  phase: FireplacePhase;
  initiator_timezone: string;
  scheduled_for: string | null;
  scheduled_by_user_id: string | null;
  returned_at: string | null;
  outcome_key: FireplacePathwayId | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FireplaceParticipantRow {
  signal_id: string;
  user_id: string;
  participant_role: 'author' | 'partner';
  sentence: string | null;
  sentence_redacted_at: string | null;
  response_action: string | null;
  responded_at: string | null;
  /** Present only for the signed-in participant. */
  action_completed_at: string | null;
  /** Present only for the signed-in participant. */
  readiness: FireplaceReadiness | null;
  readiness_at: string | null;
  related_prompt_signal_id: string | null;
  related_settlement_decision: 'closed' | 'keep_open' | null;
}

export interface LegacyInteractionStateRow {
  signal_id: string;
  need: string | null;
  response: string | null;
  response_at: string | null;
  author_returned_at: string | null;
  author_left_at: string | null;
  responder_left_at: string | null;
}

export interface InteractionSnapshot {
  signals: SignalRow[];
  groups: InteractionGroupRow[];
  presence: SignalPresenceRow[];
  sessions: FireplaceSessionRow[];
  participants: FireplaceParticipantRow[];
  legacy_state: LegacyInteractionStateRow[];
  legacy_responses: ResponseRow[];
}

// Moments 1.0.3 is additive on the server. These shapes mirror only the typed
// v2 snapshot; legacy `__hearth_*` response strings never cross this boundary.
export type MomentDestination = SignalType;
export type MomentPhaseV2 = 'waiting' | 'responded' | 'shared';
export type MomentParticipantRole = 'author' | 'partner';
export type MomentPersonalActionKind =
  | 'none'
  | 'respond_fireplace'
  | 'respond_garden'
  | 'respond_sofa'
  | 'respond_table'
  | 'respond_rest'
  | 'respond_romantic'
  | 'join_fireplace'
  | 'join_table'
  | 'confirm_fireplace'
  | 'resolve_table'
  | 'resolve_garden'
  | 'resolve_sofa'
  | 'resolve_rest'
  | 'resolve_romantic'
  | 'wait';

export interface MomentIdentityV2 {
  user_id: string;
  partner_id: string;
  user_name: string;
  partner_name: string;
}

export interface ActiveMomentV2 {
  signal_id: string;
  couple_id: string;
  author_id: string;
  destination: MomentDestination;
  intent: FireplacePathwayId | null;
  phase: MomentPhaseV2;
  shared_started_at: string | null;
  shared_ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MomentParticipantV2 {
  user_id: string;
  role: MomentParticipantRole;
  note: string | null;
  note_removed: boolean;
  response_action: string | null;
  responded_at: string | null;
  joined_at: string | null;
  /** Owner-directed shared readiness: member A always owns the left half. */
  readiness: boolean | null;
  readiness_updated_at: string | null;
  returned_at: string | null;
}

export interface MomentPresenceV2 {
  user_id: string;
  signal_id: string;
  destination: MomentDestination;
  is_active_moment: boolean;
  is_present: boolean;
  moved_at: string | null;
  left_at: string | null;
}

export interface MomentOutcomeV2 {
  signal_id: string;
  destination: MomentDestination;
  intent: FireplacePathwayId | null;
  author_id: string;
  response_action: string | null;
  terminal_reason: string;
  completed_at: string;
  completion_event_id: string | null;
  notes: MomentOutcomeNoteV2[];
}

export interface MomentOutcomeNoteV2 {
  user_id: string;
  role: MomentParticipantRole;
  note: string | null;
  note_removed: boolean;
}

export interface MomentCompletionEventV2 {
  id: string;
  signal_id: string;
  author_id: string;
  destination: MomentDestination;
  terminal_reason: string;
  response_action: string | null;
  payoff_kind: 'heart' | 'mutual_heart' | 'destination';
  occurred_at: string;
}

export interface MomentActionEventV2 {
  id: string;
  signal_id: string;
  actor_id: string;
  destination: MomentDestination;
  canonical_action: string;
  prop_type: string | null;
  payload: RestMomentPayload | null;
  occurred_at: string;
}

export type RestVisitor = 'duck' | 'frog' | 'toast';

export interface RestDoodlePayload {
  version: 1;
  width: 12;
  height: 12;
  palette_id: 'hearth-rest-v1';
  cells: string;
}

export interface RestVisitorPayload {
  version: 1;
  visitor: RestVisitor;
}

export interface RestHugPayload {
  version: 1;
}

export type RestMomentPayload = RestDoodlePayload | RestVisitorPayload | RestHugPayload;

export interface MomentReadinessEventV2 {
  id: string;
  signal_id: string;
  actor_id: string;
  readiness: boolean;
  occurred_at: string;
}

export type RitualFireState = 'steady' | 'low' | 'warming' | 'glowing';

export interface DailyRitualSnapshot {
  home_date: string;
  home_timezone: string;
  after_evening_check: boolean;
  available_units: number;
  completed_units: number;
  fire_state: RitualFireState;
  next_refresh_at: string;
}

export interface EarlierMomentV2 {
  signal_id: string;
  destination: MomentDestination;
  author_id: string;
  created_at: string;
  state: 'earlier_unresolved';
}

export interface MomentSnapshotV2 {
  identity: MomentIdentityV2;
  active: ActiveMomentV2 | null;
  personal_action: { kind: MomentPersonalActionKind };
  participants: MomentParticipantV2[];
  presence: MomentPresenceV2[];
  today_outcomes: MomentOutcomeV2[];
  completion_events: MomentCompletionEventV2[];
  current_action_events: MomentActionEventV2[];
  today_action_events: MomentActionEventV2[];
  readiness_events: MomentReadinessEventV2[];
  earlier_moments: EarlierMomentV2[];
}

export interface DrawingRow {
  id: string;
  couple_id: string;
  from_user: string;
  day: string;
  grid: string;
  created_at: string;
  updated_at: string;
}
