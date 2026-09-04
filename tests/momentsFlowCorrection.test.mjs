import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260814180000_moments_flow_correction.sql', import.meta.url),
  'utf8',
);

const functionBody = (name) => migration.match(
  new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\n\\$\\$;`),
)?.[0] ?? '';

test('the corrected API is authenticated and server-derived', () => {
  for (const signature of [
    'set_moment_readiness(p_signal_id uuid, p_ready boolean)',
    'resolve_moment(p_signal_id uuid)',
    'cancel_moment(p_signal_id uuid)',
  ]) assert.match(migration, new RegExp(signature.replace(/[()]/g, '\\$&')));

  assert.match(functionBody('set_moment_readiness'), /auth\.uid\(\)/);
  assert.match(functionBody('resolve_moment'), /Only the creator can resolve this moment/);
  assert.match(functionBody('cancel_moment'), /Only the creator can cancel this moment/);
  assert.match(migration, /grant execute on function public\.set_moment_readiness\(uuid, boolean\) to authenticated/);
  assert.match(migration, /grant execute on function public\.resolve_moment\(uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.cancel_moment\(uuid\) to authenticated/);
});

test('fireplace readiness is private, reversible, and resolves only at two ready states', () => {
  const readiness = functionBody('set_moment_readiness');
  assert.match(migration, /add column if not exists readiness boolean not null default false/);
  assert.match(readiness, /set readiness = p_ready/);
  assert.match(readiness, /where signal_id = target\.signal_id and readiness/);
  assert.match(readiness, /if ready_count = 2 then/);
  assert.match(readiness, /'fireplace_reconnected', true/);
  const snapshot = migration.match(/create function public\.get_moment_snapshot_v2\(\)[\s\S]*?\n\$\$;/)?.[0] ?? '';
  assert.match(snapshot, /'readiness', case when mp\.user_id = uid then mp\.readiness end/);
  assert.match(snapshot, /'readiness_updated_at', case when mp\.user_id = uid/);
  assert.match(snapshot, /'author_id', ms\.author_id/);
});

test('not now is timeless and leaves Fireplace and Table joinable', () => {
  assert.match(migration, /then 'not_now'/);
  assert.match(functionBody('join_moment'), /<> 'not_now'/);
  assert.match(migration, /scheduled_for = null/);
  assert.match(migration, /scheduled_by_user_id = null/);
  assert.match(migration, /shared_due_at = null/);
  assert.doesNotMatch(migration, /interval '20 minutes'/);
  assert.doesNotMatch(migration, /setTimeout|countdown/i);
});

test('every positive destination resolution emits heart and negative endings do not', () => {
  assert.match(functionBody('moment_payoff_kind'), /select 'heart'::text/);
  const resolve = functionBody('resolve_moment');
  for (const terminal of [
    'table_talked', 'garden_ready', 'sofa_care', 'rest_ready', 'romantic_remote_affection',
  ]) assert.match(resolve, new RegExp(`'${terminal}', true`));
  assert.match(functionBody('cancel_moment'), /'withdrawn', false/);
  assert.match(functionBody('respond_to_moment'), /'romantic_declined', false/);
});

test('legacy ending and Romantic finalizer calls are harmless compatibility surfaces', () => {
  assert.match(functionBody('set_moment_completion_choice'), /set_moment_readiness/);
  assert.match(functionBody('end_moment'), /cancel_moment/);
  assert.match(functionBody('end_moment'), /resolve_moment/);
  assert.doesNotMatch(functionBody('finalize_due_romantic_moment'), /finish_moment_internal/);
  assert.match(functionBody('finalize_all_due_romantic_moments'), /select 0/);
  assert.match(migration, /cron\.unschedule/);
});

test('every live state exposes an explicit action or wait state', () => {
  assert.match(migration, /action_kind := 'respond_' \|\| destination/);
  assert.match(migration, /action_kind := 'resolve_' \|\| destination/);
  for (const action of [
    'join_fireplace', 'join_table', 'confirm_fireplace', 'resolve_table', 'wait',
  ]) assert.match(migration, new RegExp(`'${action}'`));
});
