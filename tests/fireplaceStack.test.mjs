import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260811183000_fireplace_stack.sql',
  import.meta.url,
);

async function sql() {
  return (await readFile(migrationUrl, 'utf8')).toLowerCase();
}

test('F1 creates independent group, presence, session, and participant records', async () => {
  const source = await sql();
  for (const table of [
    'interaction_groups',
    'signal_presence',
    'fireplace_sessions',
    'fireplace_participants',
  ]) {
    assert.match(source, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.match(source, /update public\.signals set group_id = id where group_id is null/);
  assert.match(source, /signal_presence_one_current_per_user_idx[\s\S]{0,140}where is_current/);
  assert.match(source, /start_interaction[\s\S]{0,4400}p_connect_to_signal_id is null[\s\S]{0,1000}new_group_id := target\.group_id/);
  assert.doesNotMatch(source, /start_interaction[\s\S]{0,7000}resolved_at\s*=\s*now\(\)[\s\S]{0,400}insert into public\.signals/);
});

test('location mutations clear only the actor presence and never resolve another signal', async () => {
  const source = await sql();
  assert.match(source, /move_interaction_presence_internal[\s\S]{0,1800}p\.user_id = p_user_id[\s\S]{0,300}p\.signal_id <> p_signal_id/);
  assert.match(source, /create or replace function public\.leave_interaction[\s\S]{0,1500}user_id = uid and is_current/);
  const leaveBody = source.match(
    /create or replace function public\.leave_interaction[\s\S]+?\n\$\$;/,
  )?.[0] ?? '';
  assert.doesNotMatch(leaveBody, /resolved_at/);
});

test('all six pathways and ordered responses are enforced server-side', async () => {
  const source = await sql();
  for (const pathway of [
    'stay_close',
    'talk_through',
    'hear_first',
    'acknowledge_hurt',
    'apologize',
    'more_time',
  ]) {
    assert.match(source, new RegExp(`'${pathway}'`));
  }
  assert.match(source, /only the receiving partner may respond/);
  assert.match(source, /this moment already has a response/);
  assert.match(source, /the pathway action must happen before continuing/);
  assert.match(source, /scheduled_by_user_id = uid and session_row\.returned_at is null/);
  assert.match(source, /return to this moment before continuing/);
  assert.match(source, /continue before choosing readiness/);
  assert.match(source, /char_length\(clean_sentence\) > 240/);
});

test('private confirmations require two independent reconnect choices', async () => {
  const source = await sql();
  assert.match(source, /case when fp\.user_id = uid then fp\.readiness end/);
  assert.match(source, /count\(\*\) = 2 into all_reconnected[\s\S]{0,180}readiness = 'reconnected'/);
  assert.match(source, /if all_reconnected then[\s\S]{0,1000}phase = 'completed'/);
  assert.match(source, /next_midnight_in_timezone[\s\S]{0,800}at time zone p_timezone/);
  assert.match(source, /purge_expired_fireplace_content[\s\S]{0,700}fp\.sentence is not null/);
  assert.match(source, /touch each session once at expiry[\s\S]{0,350}updated_at < expires_at/);
});

test('RPC-only mutations, cross-couple RLS, Realtime, and unpair cleanup are explicit', async () => {
  const source = await sql();
  for (const rpc of [
    'start_interaction',
    'move_to_interaction',
    'leave_interaction',
    'respond_to_interaction',
    'complete_fireplace_action',
    'set_fireplace_readiness',
    'reschedule_fireplace_return',
    'redact_fireplace_sentence',
    'close_authored_interaction',
  ]) {
    assert.match(source, new RegExp(`(?:create function|create or replace function) public\\.${rpc}`));
  }
  assert.match(source, /drop policy if exists signals_insert/);
  assert.match(source, /revoke insert, update, delete on table public\.signals/);
  assert.match(source, /fireplace_participants intentionally has no select policy/);
  assert.match(source, /public\.is_couple_member\(s\.couple_id\)/);
  assert.match(source, /'interaction_groups', 'signal_presence', 'fireplace_sessions',[\s\S]{0,80}'fireplace_participants'[\s\S]{0,700}supabase_realtime/);
  assert.match(source, /purge_interaction_groups_before_membership_change/);
});

test('connected completion prompts never close a sibling without its author', async () => {
  const source = await sql();
  const answerBody = source.match(
    /create or replace function public\.answer_related_settlement[\s\S]+?\n\$\$;/,
  )?.[0] ?? '';
  assert.match(answerBody, /s\.from_user = uid and s\.resolved_at is null/);
  assert.match(answerBody, /completed_signal\.group_id = target\.group_id/);
  assert.match(answerBody, /if p_settled then/);
  assert.match(answerBody, /related_settlement_decision/);
});
