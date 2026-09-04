import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260813160000_meaningful_shared_moments_v2.sql', import.meta.url),
  'utf8',
);
const presencePurity = readFileSync(
  new URL('../supabase/migrations/20260813173000_moment_presence_purity.sql', import.meta.url),
  'utf8',
);
const returnGuard = readFileSync(
  new URL('../supabase/migrations/20260813174500_moment_return_terminal_guard.sql', import.meta.url),
  'utf8',
);
const outcomeNotes = readFileSync(
  new URL('../supabase/migrations/20260813180000_moment_outcome_notes.sql', import.meta.url),
  'utf8',
);

test('v2 moments are additive and enforce one active session per couple', () => {
  assert.match(migration, /create table if not exists public\.moment_sessions/);
  assert.match(migration, /create table if not exists public\.moment_participants/);
  assert.match(migration, /create unique index if not exists moment_sessions_one_active_per_couple_idx[\s\S]*where terminal_at is null/);
  assert.match(migration, /from public\.couples c[\s\S]*limit 1[\s\S]*for update/);
  assert.match(migration, /raise exception 'A shared moment is already open'/);
});

test('the six destinations have server-owned response and movement allowlists', () => {
  for (const destination of ['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic']) {
    assert.match(migration, new RegExp(`when '${destination}'`));
  }
  assert.match(migration, /when 'garden' then p_action in \('respect_space', 'reassure_from_home', 'leave_door_open'\)/);
  assert.match(migration, /when 'rest' then p_action in \('remove_pressure', 'encourage', 'offer_practical_help', 'send_affection'\)/);
  assert.match(migration, /when 'romantic' then p_action = 'come_close'/);
  assert.doesNotMatch(
    migration.match(/create or replace function public\.moment_response_moves_to_destination[\s\S]*?\$\$;/)?.[0] ?? '',
    /respect_space|reassure_from_home|leave_door_open|remove_pressure|encourage|send_affection/,
  );
});

test('destination endings and mutual choices are enforced transactionally', () => {
  assert.match(migration, /target\.destination = 'sofa' and p_action <> 'care_need_time'/);
  assert.match(migration, /target\.destination = 'garden' and p_reason = 'ready_to_come_back'/);
  assert.match(migration, /target\.destination = 'rest' and p_reason = 'feeling_ready'/);
  assert.match(migration, /target\.destination = 'fireplace' then 'reconnected'/);
  assert.match(migration, /else 'talked'/);
  assert.match(migration, /if ready_count = 2 then/);
  assert.match(migration, /target\.shared_due_at > now\(\)/);
  assert.match(migration, /interval '20 minutes'/);
});

test('presence-only calls are idempotent and clear only the terminal moment', () => {
  assert.match(migration, /create or replace function public\.move_to_moment/);
  assert.match(migration, /create or replace function public\.leave_moment/);
  assert.match(migration, /create or replace function public\.return_to_moment/);
  assert.match(migration, /where signal_id = target\.signal_id and user_id = uid and is_current/);
  assert.match(migration, /where signal_id = target\.signal_id[\s\S]*and is_current;/);
  assert.match(migration, /left_at = coalesce\(left_at, now\(\)\)/);
  assert.match(presencePurity, /create or replace function public\.move_to_moment/);
  assert.doesNotMatch(presencePurity, /maybe_start_romantic_shared_internal|update public\.moment_sessions/);
  assert.match(returnGuard, /moved := public\.move_to_moment\(p_signal_id\)/);
  assert.match(returnGuard, /if not moved then[\s\S]*return false/);
});

test('notes are bounded, immutable after confirmation, removable, and never notification payloads', () => {
  assert.match(migration, /char_length\(note\) between 1 and 240/);
  assert.match(migration, /A response cannot be replaced/);
  assert.match(migration, /note_removed_at = coalesce\(note_removed_at, now\(\)\)/);
  assert.match(migration, /and note is not null;/);
  assert.match(migration, /check \(note_removed_at is null or note is null\)/);
  assert.doesNotMatch(migration, /notification_outbox[\s\S]*p_note/);
  assert.match(outcomeNotes, /'notes', coalesce/);
  assert.match(outcomeNotes, /mp\.note_removed_at is not null/);
  assert.doesNotMatch(outcomeNotes, /completion_choice/);
});

test('snapshot masks private choices and keeps legacy rows typed and read-only', () => {
  assert.match(migration, /'completion_choice', case when mp\.user_id = uid then mp\.completion_choice end/);
  assert.match(migration, /'personal_action', jsonb_build_object\('kind', action_kind\)/);
  assert.match(migration, /'earlier_moments'/);
  assert.match(migration, /'state', 'earlier_unresolved'/);
  assert.match(migration, /not exists \(select 1 from public\.moment_sessions ms where ms\.signal_id = s\.id\)/);
  const v2Snapshot = migration.match(/create or replace function public\.get_moment_snapshot_v2\(\)[\s\S]*?\nend;\n\$\$;/)?.[0] ?? '';
  assert.doesNotMatch(v2Snapshot, /__hearth_/);
});

test('completion identities are immutable inputs to realtime playback', () => {
  assert.match(migration, /create table if not exists public\.moment_completion_events/);
  assert.match(migration, /completion_event_id\s+uuid unique/);
  assert.match(migration, /payoff_kind in \('mutual_heart', 'destination'\)/);
  assert.match(migration, /when p_destination in \('fireplace', 'table'\) then 'mutual_heart'/);
  assert.match(migration, /hearth-romantic-moment-expiry-v2/);
  assert.match(migration, /select public\.finalize_all_due_romantic_moments\(\);/);
});

test('legacy clients cannot see or resolve authoritative v2 rows', () => {
  assert.match(migration, /create or replace function public\.protect_v2_signal_resolution/);
  assert.match(migration, /create or replace function public\.reject_v2_legacy_response/);
  assert.match(migration, /create or replace function public\.move_to_interaction[\s\S]*not exists \([\s\S]*public\.moment_sessions/);
  assert.match(migration, /create or replace function public\.leave_interaction[\s\S]*not exists \([\s\S]*public\.moment_sessions/);
  assert.match(migration, /This moment requires the current client/);
  assert.match(migration, /hearth\.moment_v2_terminal/);
  assert.match(migration, /create or replace function public\.get_interaction_snapshot\(p_couple_id uuid\)/);
});
