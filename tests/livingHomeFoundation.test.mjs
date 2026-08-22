import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migration = readFileSync(join(
  root,
  'supabase/migrations/20260822120000_living_home_foundation.sql',
), 'utf8');

const functionBody = (schema, name) => migration.match(new RegExp(
  `create(?: or replace)? function ${schema}\\.${name}\\([^]*?\\n\\$\\$;`,
  'i',
))?.[0] ?? '';

test('home state is normalized, couple-scoped, revisioned, and readable only through RLS', () => {
  for (const table of [
    'home_states', 'home_rooms', 'home_reserved_routes', 'home_objects',
    'home_unlocks', 'home_keepsakes', 'home_edit_requests',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /revision\s+bigint not null default 1/);
  assert.match(migration, /unique \(couple_id, source_kind, source_id\)/);
  assert.match(migration, /unique \(couple_id, seed_key\)/);
  assert.match(migration, /alter publication supabase_realtime add table public\.home_states/);
  assert.match(migration, /revoke all on table public\.home_catalog_assets,[\s\S]{0,260}from public, anon, authenticated/);
});

test('the versioned registry carries renderer, placement, cost, progression, and functional metadata', () => {
  for (const column of [
    'catalog_version', 'renderer', 'footprint', 'rotations', 'compatible_rooms',
    'compatible_surfaces', 'collision_clearance', 'palette_slots',
    'attachment_sockets', 'render_cost', 'progression', 'functional',
  ]) assert.match(migration, new RegExp(`\\b${column}\\b`));
  for (const role of [
    'fireplace', 'conversation_seating', 'shared_table', 'rest_location',
    'romantic_rest_location', 'drawing_portal', 'media_portal', 'garden_portal',
  ]) assert.match(migration, new RegExp(`"role":"${role}"`));
  assert.match(migration, /coalesce\(a\.renderer, 'UnknownHomeAsset'\)/);
  for (const field of [
    'poses', 'approach', 'exit', 'cameraTarget', 'reactionAnchor',
    'uiAnchor', 'clickBounds', 'effectSockets',
  ]) assert.match(migration, new RegExp(`"${field}"`));
});

test('existing pairs receive cottage-v2 with their visible bedroom, garden, and KoiPond pieces', () => {
  const ensure = functionBody('private', 'ensure_home_state');
  assert.match(migration, /layout_id\s+text not null default 'cottage-v2'/);
  assert.match(ensure, /p_legacy_full then 'large' else 'courtyard'/);
  assert.match(ensure, /'bedroom', 'bedroom-north', 'standard'/);
  for (const seed of [
    'fireplace', 'sofa', 'table', 'rest', 'easel', 'bookshelf', 'fern', 'bed',
    'bedside', 'wardrobe', 'pond', 'tree', 'rose-west', 'rose-east',
    'lantern-west', 'lantern-east', 'bench', 'greenhouse',
  ]) assert.match(ensure, new RegExp(`'${seed}'`));
  assert.match(ensure, /'koi-pond-medium'/);
  assert.match(migration, /for home in select id from public\.couples where member_b is not null/);
});

test('snapshot and atomic edit RPCs enforce membership, moments, conflicts, and idempotency', () => {
  const snapshot = functionBody('public', 'get_home_snapshot');
  assert.match(snapshot, /auth\.uid\(\)/);
  assert.match(snapshot, /private\.ensure_home_state\(home\.id, false\)/);
  assert.match(snapshot, /private\.home_snapshot\(home\.id\)/);

  const apply = functionBody('public', 'apply_home_edit');
  assert.match(apply, /for update/);
  assert.match(apply, /operations_hash <> request_hash/);
  assert.match(apply, /'revision_conflict'/);
  assert.match(apply, /'catalog_version_mismatch'/);
  assert.match(apply, /private\.home_has_active_moment/);
  assert.match(apply, /private\.validate_home_scene/);
  assert.match(apply, /revision = revision \+ 1/);
  for (const operation of [
    'add', 'move', 'rotate', 'restyle', 'attach', 'store', 'replace',
    'resize', 'change_terrain', 'change_finish', 'attach_module',
  ]) assert.match(apply, new RegExp(`'${operation}'`));
});

test('server validation covers authored masks, collisions, routes, roles, water sockets, and budget', () => {
  const validate = functionBody('private', 'validate_home_scene');
  assert.match(validate, /Required home role is missing/);
  assert.match(validate, /outside its compatible room or surface/);
  assert.match(validate, /Objects overlap or do not have enough clearance/);
  assert.match(validate, /blocks a protected travel route/);
  assert.match(validate, /attachment does not match its parent socket/);
  assert.match(validate, /render budget/);
  assert.match(validate, /major water-feature socket/);
  assert.match(validate, /when tier = 'grand' then 2/);
});

test('paired_at is server-owned and every membership epoch purge clears all shared home state', () => {
  assert.match(migration, /add column if not exists paired_at timestamptz/);
  const maintain = functionBody('private', 'maintain_home_couple_epoch');
  assert.match(maintain, /old\.member_b is null and new\.member_b is not null/);
  assert.match(maintain, /new\.paired_at := now\(\)/);
  for (const table of [
    'home_edit_requests', 'home_keepsakes', 'home_unlocks', 'home_objects',
    'home_reserved_routes', 'home_rooms', 'home_states',
  ]) assert.match(maintain, new RegExp(`delete from public\\.${table}`));
  assert.match(maintain, /new\.paired_at := null/);
  assert.match(migration, /before delete on public\.couples[\s\S]{0,100}purge_home_on_couple_delete/);
});
