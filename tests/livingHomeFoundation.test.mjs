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
const attachmentSafety = readFileSync(join(
  root,
  'supabase/migrations/20260822160000_home_attachment_safety.sql',
), 'utf8');
const indoorCatalog = readFileSync(join(
  root,
  'supabase/migrations/20260822170000_indoor_home_catalog.sql',
), 'utf8');
const gardenCatalog = readFileSync(join(
  root,
  'supabase/migrations/20260822180000_garden_home_catalog.sql',
), 'utf8');
const upgradeCatalog = readFileSync(join(
  root,
  'supabase/migrations/20260822190000_home_upgrade_catalog.sql',
), 'utf8');
const advancedGardenCatalog = readFileSync(join(
  root,
  'supabase/migrations/20260822200000_advanced_garden_catalog.sql',
), 'utf8');
const milestoneKeepsakes = readFileSync(join(
  root,
  'supabase/migrations/20260822210000_home_milestone_keepsakes.sql',
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
  assert.match(ensure, /"minX":-4\.75,"maxX":4\.25,"minZ":-4\.50,"maxZ":3\.75/);
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
  assert.match(apply, /private\.authored_home_bounds/);
  assert.match(apply, /garden_tier = requested_garden_tier/);
  assert.match(apply, /revision = revision \+ 1/);
  assert.match(apply, /at most 256 commands/);
  for (const operation of [
    'add', 'move', 'rotate', 'restyle', 'attach', 'store', 'replace',
    'resize', 'change_terrain', 'change_finish', 'attach_module',
  ]) assert.match(apply, new RegExp(`'${operation}'`));
});

test('attachment groups reject invalid graphs and move with their parent', () => {
  assert.match(attachmentSafety, /unique index if not exists home_objects_attachment_socket_key/);
  assert.match(attachmentSafety, /Attachment socket is not available on its parent/);
  assert.match(attachmentSafety, /Attachments cannot form a cycle/);
  assert.match(attachmentSafety, /Placed attachments must share their parent room/);
  assert.match(attachmentSafety, /position_x = child\.position_x \+ \(new\.position_x - old\.position_x\)/);
  assert.match(attachmentSafety, /where child\.parent_object_id = new\.id/);
  assert.match(attachmentSafety, /sync_home_attachment_placement/);
});

test('the complete indoor pack is registered and advances catalog v2 atomically', () => {
  const ids = [
    'cottage-wardrobe', 'paneled-armoire', 'clothes-rail', 'low-cubby', 'blanket-chest',
    'reading-chair', 'rocking-chair', 'pouf', 'side-table', 'narrow-bench',
    'teddy-bear', 'trophy-cup', 'rosette', 'couple-statuette', 'animal-figurine',
    'snow-globe', 'travel-trunk', 'shell-jar', 'book-stack', 'botanical-print',
    'landscape-print', 'heart-print', 'memory-frame', 'tall-mirror', 'table-lamp',
    'floor-lamp', 'lantern', 'round-rug', 'runner', 'cushion-basket', 'flower-vase',
  ];
  for (const id of ids) assert.match(indoorCatalog, new RegExp(`"id":"${id}"`));
  assert.equal((indoorCatalog.match(/"id":"/g) ?? []).length, 31);
  assert.match(indoorCatalog, /'IndoorCatalog'/);
  assert.match(indoorCatalog, /'home-catalog-v2'/);
  assert.match(indoorCatalog, /update public\.home_states/);
  assert.match(migration, /parent_object_id, attachment_socket/);
  assert.match(migration, /progression ->> 'walkable'/);
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
  assert.match(validate, /Garden paths must form one route from the house threshold/);
  assert.match(validate, /large tree hides a protected garden sightline/i);
});

test('the complete garden taxonomy advances catalog v3 without replacing installed IDs', () => {
  assert.equal((gardenCatalog.match(/"id":"/g) ?? []).length, 46);
  for (const id of [
    'straight-path', 'garden-gate', 'hydrangea', 'fruit-tree', 'bistro-table',
    'picnic-blanket', 'pergola', 'gazebo', 'small-pond', 'koi-pond-large',
    'fountain', 'string-light-set', 'wind-chime', 'garden-gnome', 'scarecrow',
  ]) assert.match(gardenCatalog, new RegExp(`"id":"${id}"`));
  assert.match(gardenCatalog, /'home-catalog-v3'/);
  assert.match(gardenCatalog, /"style_variants":"low,tall"/);
  assert.match(gardenCatalog, /"path_connector":true/);
});

test('catalog v4 adds functional fireplace and bedroom replacement families', () => {
  assert.equal((upgradeCatalog.match(/"id":"/g) ?? []).length, 9);
  for (const id of [
    'carved-stone-fireplace', 'grand-hearth-fireplace',
    'cottage-double-bed', 'four-poster-bed', 'bedroom-settee',
    'slipper-chair', 'bedroom-writing-table', 'oak-double-wardrobe', 'linen-press',
  ]) assert.match(upgradeCatalog, new RegExp(`"id":"${id}"`));
  assert.match(upgradeCatalog, /'home-catalog-v4'/);
  assert.match(upgradeCatalog, /"tier":2/);
  assert.match(upgradeCatalog, /"tier":3/);
  for (const role of ['fireplace', 'romantic_rest_location', 'conversation_seating', 'shared_table']) {
    assert.match(upgradeCatalog, new RegExp(`"role":"${role}"`));
  }
  assert.match(upgradeCatalog, /"effectSockets":\["fire","mantel","floor-glow"\]/);
});

test('catalog v5 adds grand landmarks and seasonal garden families', () => {
  assert.equal((advancedGardenCatalog.match(/"id":"/g) ?? []).length, 8);
  for (const id of [
    'rose-gazebo', 'stone-pergola', 'moon-gate-sculpture', 'dove-garden-sculpture',
    'spring-tulip-bed', 'summer-sunflower-bed', 'autumn-mum-bed', 'winter-holly-planter',
  ]) assert.match(advancedGardenCatalog, new RegExp(`"id":"${id}"`));
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    assert.match(advancedGardenCatalog, new RegExp(`"season":"${season}"`));
  }
  assert.match(advancedGardenCatalog, /'home-catalog-v5'/);
  assert.match(advancedGardenCatalog, /"interactionRig":"garden-couple"/);
  assert.match(advancedGardenCatalog, /"style_variants":"cottage,brass,forest"/);
});

test('the deployed catalog chain contains 112 stable IDs without server duplicates', () => {
  const baseIds = [...migration.matchAll(/\('([^']+)', 'home-catalog-v1'/g)]
    .map((match) => match[1]);
  const addedIds = [indoorCatalog, gardenCatalog, upgradeCatalog, advancedGardenCatalog]
    .flatMap((catalog) => [...catalog.matchAll(/"id":"([^"]+)"/g)].map((match) => match[1]));
  const ids = [...baseIds, ...addedIds];
  assert.equal(baseIds.length, 18);
  assert.equal(ids.length, 112);
  assert.equal(new Set(ids).size, 112);
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

test('active growth is authoritative, pauseable, irreversible, and gates normal edits', () => {
  const activeGrowth = functionBody('private', 'active_home_growth_seconds');
  const freeze = functionBody('private', 'set_home_world_frozen');
  const unlocks = functionBody('private', 'refresh_home_growth_unlocks');
  const snapshot = functionBody('private', 'home_snapshot');
  const apply = functionBody('public', 'apply_home_edit');

  assert.match(activeGrowth, /world_frozen_at is null/);
  assert.match(activeGrowth, /growth_resumed_at/);
  assert.match(freeze, /growth_seconds = active_seconds/);
  assert.match(freeze, /growth_resumed_at = null/);
  assert.match(freeze, /growth_resumed_at = now\(\)/);
  assert.match(migration, /revoke execute on function private\.set_home_world_frozen\(uuid,boolean\)/);
  for (const seconds of [259200, 518400, 1209600, 1814400, 2592000, 5184000, 7776000, 15552000]) {
    assert.match(unlocks, new RegExp(`${seconds}::bigint`));
  }
  assert.match(unlocks, /on conflict \(couple_id, unlock_id\) do nothing/);
  assert.match(snapshot, /'activeGrowthSeconds'/);
  assert.match(apply, /developer_bypass/);
  assert.match(apply, /state\.world_frozen_at is not null and not developer_bypass/);
  assert.match(apply, /growth < coalesce\(\(asset\.progression->>'day'\)::numeric, 0\) \* 86400/);
  assert.match(apply, /growth < case requested_garden_tier/);
});

test('positive shared milestones mint unique, placeable, irreversible keepsakes', () => {
  for (const milestone of [
    'first-planted-memory', 'first-shared-photo', 'first-diary-entry',
    'pairing-anniversary',
  ]) assert.match(milestoneKeepsakes, new RegExp(`'${milestone}'`));
  for (const asset of ['flower-vase', 'memory-frame', 'book-stack', 'couple-statuette']) {
    assert.match(milestoneKeepsakes, new RegExp(`'${asset}'`));
  }
  assert.match(milestoneKeepsakes, /pg_advisory_xact_lock/);
  assert.match(milestoneKeepsakes, /p_once_per_kind/);
  assert.match(milestoneKeepsakes, /'stored'/);
  assert.match(milestoneKeepsakes, /'sourceLinked', true/);
  assert.match(milestoneKeepsakes, /revision = revision \+ 1/);
  assert.match(milestoneKeepsakes, /world_frozen_at is not null/);
  assert.match(milestoneKeepsakes, /private\.active_home_growth_seconds/);
  assert.match(milestoneKeepsakes, /31536000/);
  assert.match(milestoneKeepsakes, /private\.refresh_home_milestone_keepsakes\(home\.id\)/);
  assert.match(milestoneKeepsakes, /to_regclass\('public\.drawings'\)/);
  assert.doesNotMatch(milestoneKeepsakes, /author_id|from_user/);
});
