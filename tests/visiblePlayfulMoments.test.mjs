import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260814120000_visible_playful_moment_consequences.sql', import.meta.url),
  'utf8',
);

test('every visible consequence has one canonical server action', () => {
  for (const action of [
    'come_sit', 'talk_by_fire', 'listen_by_fire', 'hear_them_out', 'need_more_time',
    'give_quiet', 'leave_rose', 'sit_with_them', 'bring_tea', 'send_hug',
    'talk_now', 'quiet_room', 'leave_blanket', 'tiny_drawing',
    'come_close', 'send_affection', 'kindly_decline',
  ]) {
    assert.match(migration, new RegExp(`'${action}'`), action);
  }
  assert.match(migration, /create or replace function public\.canonical_moment_action/);
  assert.match(migration, /'talk_later'\) then 'need_more_time'/);
  assert.match(migration, /'return_affection'\) then 'send_affection'/);
});

test('new responses ignore schedules while preserving RPC signatures and columns', () => {
  assert.match(migration, /p_scheduled_for timestamptz default null/);
  assert.match(migration, /scheduled_for = null/);
  assert.match(migration, /scheduled_by_user_id = null/);
  const scheduleHelper = migration.match(
    /create or replace function public\.moment_response_needs_schedule[\s\S]*?\$\$;/,
  )?.[0] ?? '';
  assert.match(scheduleHelper, /select false/);
  assert.doesNotMatch(migration, /Choose a return time within/);
});

test('joined_at separates responding from joining and gates mutual completion', () => {
  assert.match(migration, /add column if not exists joined_at timestamptz/);
  assert.match(migration, /create or replace function public\.join_moment\(p_signal_id uuid\)/);
  assert.match(migration, /Choose more time before joining later/);
  assert.match(migration, /joined_count <> 2/);
  assert.match(migration, /Both people must join before choosing an ending/);
  assert.match(migration, /set joined_at = coalesce\(mp\.joined_at, mp\.responded_at, mp\.returned_at\)/);
  assert.match(migration, /'joined_at', mp\.joined_at/);
});

test('Sofa stays open until its author explicitly feels cared for', () => {
  const response = migration.match(
    /create or replace function public\.respond_to_moment[\s\S]*?\nend;\n\$\$;/,
  )?.[0] ?? '';
  assert.doesNotMatch(response, /sofa_care/);
  assert.match(migration, /target\.destination = 'sofa' and p_reason = 'feel_cared_for'/);
  assert.match(migration, /then action_kind := 'sofa_cared'/);
});

test('action events are append-only, couple-scoped, and idempotent', () => {
  assert.match(migration, /create table if not exists public\.moment_action_events/);
  assert.match(migration, /unique \(signal_id, actor_id, canonical_action\)/);
  assert.match(migration, /on conflict \(signal_id, actor_id, canonical_action\) do nothing/);
  assert.match(migration, /Moment action events are immutable/);
  assert.match(migration, /create policy moment_action_events_select[\s\S]*public\.is_couple_member\(couple_id\)/);
  assert.match(migration, /revoke all privileges on table public\.moment_action_events/);
  assert.match(migration, /alter publication supabase_realtime add table public\.moment_action_events/);
});

test('daily tangible props and active cues are exposed without synthetic playback', () => {
  for (const prop of [
    'rose', 'tea_tray', 'heart_cushion', 'folded_blanket',
    'tiny_drawing', 'paired_lanterns', 'waiting_mug', 'banked_embers',
  ]) {
    assert.match(migration, new RegExp(`'${prop}'`), prop);
  }
  assert.match(migration, /\{current_action_events\}/);
  assert.match(migration, /\{today_action_events\}/);
  assert.match(migration, /e\.occurred_at >= date_trunc\('day', now\(\)\)/);
});

test('author-only endings and legacy-compatible idempotent returns remain intact', () => {
  assert.match(migration, /Only the creator can end this moment/);
  assert.match(migration, /p_reason = 'close_without_resolved'/);
  assert.match(migration, /perform public\.join_moment\(p_signal_id\)/);
  assert.match(migration, /if target\.signal_id is null or target\.terminal_at is not null then return false/);
  assert.match(migration, /if target\.terminal_at is not null then[\s\S]*return target\.completion_event_id/);
});
