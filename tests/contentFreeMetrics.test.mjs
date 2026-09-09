import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migration = readFileSync(join(
  root,
  'supabase/migrations/20260909120000_content_free_metrics.sql',
), 'utf8');

test('daily activity is private, content-free, and bounded to one home row per user per day', () => {
  const table = migration.match(/create table if not exists private\.home_user_activity_days \(([\s\S]*?)\n\);/i)?.[1] ?? '';
  assert.match(table, /activity_day date not null/);
  assert.match(table, /user_id uuid not null/);
  assert.match(table, /couple_id uuid not null/);
  assert.match(table, /primary key \(activity_day, user_id, couple_id\)/);
  for (const forbidden of ['name', 'note', 'media', 'invite', 'destination', 'screen_time', 'navigation']) {
    assert.doesNotMatch(table, new RegExp(forbidden, 'i'));
  }
  assert.match(migration, /revoke all on table private\.home_user_activity_days from public, anon, authenticated/);
});

test('record_active_home_day derives identity and home day on the server', () => {
  assert.match(migration, /create or replace function public\.record_active_home_day\(\)/);
  assert.match(migration, /uid uuid := auth\.uid\(\)/);
  assert.match(migration, /private\.home_context\(uid\)/);
  assert.match(migration, /on conflict \(activity_day, user_id, couple_id\) do nothing/);
  assert.match(migration, /grant execute on function public\.record_active_home_day\(\) to authenticated/);
});

test('raw activity has automatic ninety-day retention', () => {
  assert.match(migration, /activity_day < \(\(statement_timestamp\(\) at time zone 'UTC'\)::date - 89\)/);
  assert.match(migration, /hearth-content-free-metrics-retention/);
  assert.match(migration, /private\.purge_home_user_activity_days\(\)/);
});

test('aggregates are service-only and derived from content-free domain counts', () => {
  assert.match(migration, /private\.get_content_free_product_metrics/);
  for (const source of ['public.couples', 'public.moment_sessions', 'public.drawings', 'public.daily_media']) {
    assert.match(migration, new RegExp(source.replace('.', '\\.')));
  }
  assert.match(migration, /revoke execute on function private\.get_content_free_product_metrics\(date,date\)[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function private\.get_content_free_product_metrics\(date,date\) to service_role/);
});
