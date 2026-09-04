import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migration = readFileSync(join(
  root,
  'supabase/migrations/20260817120000_moments_owner_review_revision.sql',
), 'utf8');

const functionBody = (name) => migration.match(new RegExp(
  `create(?: or replace)? function public\\.${name}\\([^]*?\\n\\$\\$;`,
  'i',
))?.[0] ?? '';

test('home timezone initialization is member-A-only, IANA validated, and immutable after first write', () => {
  assert.match(migration, /add column if not exists home_timezone text/);
  assert.match(migration, /pg_catalog\.pg_timezone_names/);
  const initialize = functionBody('initialize_home_timezone');
  assert.match(initialize, /where c\.member_a = uid/);
  assert.match(initialize, /home\.home_timezone is null/);
  assert.match(initialize, /already initialized/);
  assert.match(migration, /grant execute on function public\.initialize_home_timezone\(text\) to authenticated/);
});

test('daily ritual snapshot derives a no-blame aggregate and both local refresh boundaries', () => {
  const ritual = functionBody('get_daily_ritual_snapshot');
  assert.match(ritual, /coalesce\(home\.home_timezone, 'UTC'\)/);
  assert.match(ritual, /local_now::time >= time '19:00'/);
  assert.match(ritual, /count\(distinct d\.from_user\)/);
  assert.match(ritual, /when completed >= available then 'glowing'/);
  assert.match(ritual, /when completed > 0 then 'warming'/);
  assert.match(ritual, /when after_evening then 'low'/);
  assert.match(ritual, /else 'steady'/);
  assert.match(ritual, /home_day::timestamp \+ time '19:00'/);
  assert.match(ritual, /\(home_day \+ 1\)::timestamp/);
  assert.doesNotMatch(ritual, /streak|failure|score|penalty/i);
});

test('ritual fire transition table covers 18:59 and 19:00 without identifying a person', () => {
  const state = ({ hour, completed, available = 2 }) => {
    if (completed >= available) return 'glowing';
    if (completed > 0) return 'warming';
    return hour >= 19 ? 'low' : 'steady';
  };
  assert.equal(state({ hour: 18.983, completed: 0 }), 'steady');
  assert.equal(state({ hour: 19, completed: 0 }), 'low');
  assert.equal(state({ hour: 8, completed: 1 }), 'warming');
  assert.equal(state({ hour: 23, completed: 1 }), 'warming');
  assert.equal(state({ hour: 8, completed: 2 }), 'glowing');
});

test('readiness history is couple-scoped, immutable, public to both members, and change-only', () => {
  assert.match(migration, /create table if not exists public\.moment_readiness_events/);
  assert.match(migration, /before update or delete on public\.moment_readiness_events/);
  assert.match(migration, /public\.is_couple_member\(couple_id\)/);
  const readiness = functionBody('set_moment_readiness');
  assert.match(readiness, /for update of ms/);
  assert.match(readiness, /for update;/);
  assert.match(readiness, /participant\.readiness is not distinct from p_ready then return null/);
  assert.match(readiness, /insert into public\.moment_readiness_events/);
  assert.match(readiness, /ready_count = 2/);
  const snapshot = functionBody('get_moment_snapshot_v2');
  assert.match(snapshot, /'readiness', mp\.readiness/);
  assert.match(snapshot, /'readiness_updated_at', mp\.readiness_updated_at/);
  assert.doesNotMatch(snapshot, /case when mp\.user_id = uid then mp\.readiness/);
  assert.match(snapshot, /\{readiness_events\}/);
});

test('Rest responses require exact versioned doodle, visitor, and hug payload shapes', () => {
  const validator = functionBody('rest_moment_payload_is_valid');
  assert.match(validator, /when 'make_doodle'/);
  assert.match(validator, /'width' = '12'::jsonb/);
  assert.match(validator, /'height' = '12'::jsonb/);
  assert.match(validator, /palette_id' = 'hearth-rest-v1'/);
  assert.match(validator, /char_length\(p_payload ->> 'cells'\) = 144/);
  assert.match(validator, /\^\[\.0-5\]\{144\}\$/);
  assert.match(validator, /'duck', 'frog', 'toast'/);
  assert.match(validator, /when 'send_hug'/);
  const respond = functionBody('respond_to_rest_moment');
  assert.match(respond, /Only the invited partner can respond/);
  assert.match(respond, /existing_payload = p_payload then return event_id/);
  assert.match(respond, /when 'make_doodle' then 'rest_doodle'/);
  assert.match(respond, /canonical_action, prop_type, payload/);
  assert.match(migration, /grant execute on function public\.respond_to_rest_moment\(uuid, text, jsonb\) to authenticated/);
});

test('old response and Moment RPC signatures remain present in the migration chain', () => {
  const previous = readFileSync(join(
    root,
    'supabase/migrations/20260814180000_moments_flow_correction.sql',
  ), 'utf8');
  assert.match(previous, /function public\.respond_to_moment\(\s*p_signal_id uuid,\s*p_action text,\s*p_note text default null,\s*p_scheduled_for timestamptz default null/s);
  assert.match(previous, /function public\.set_moment_completion_choice\(\s*p_signal_id uuid,\s*p_choice text/s);
  assert.match(migration, /rename to get_moment_snapshot_v2_owner_review_base/);
});
