import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('the phone owns typed snapshot, operation, capability, registry, and resolved-scene contracts', () => {
  const types = read('src/home/types.ts');
  for (const contract of [
    'HomeAssetDefinition', 'HomeSnapshot', 'HomeOperation',
    'WorldCapabilities', 'ResolvedHomeScene',
  ]) assert.match(types, new RegExp(`interface ${contract}|type ${contract}`));
  for (const field of [
    'footprint', 'rotations', 'compatibleRooms', 'compatibleSurfaces',
    'collisionClearance', 'paletteSlots', 'attachmentSockets', 'renderCost',
    'progression', 'functional',
  ]) assert.match(types, new RegExp(`\\b${field}\\b`));
  for (const operation of [
    'add', 'move', 'rotate', 'restyle', 'attach', 'store', 'replace',
    'resize', 'change_terrain', 'change_finish', 'attach_module',
  ]) assert.match(types, new RegExp(`type: '${operation}'`));
});

test('the foundation catalog is stable, versioned, and preserves every visible 1.0.4 asset', () => {
  const catalog = read('src/home/catalog.ts');
  const ids = [...catalog.matchAll(/asset\(\{ id: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(ids.length, 18, 'the complete 1.0.4 foundation pack');
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [
    'core-fireplace', 'cottage-sofa', 'shared-table', 'rest-nook',
    'romantic-daybed', 'drawing-easel', 'daily-media-console',
    'garden-threshold', 'cottage-bookshelf', 'potted-fern',
    'koi-pond-medium', 'blossom-tree', 'rose-bush', 'garden-lantern',
    'garden-bench', 'greenhouse-portal',
  ]) assert.ok(ids.includes(id), `${id} must remain registered`);
  assert.match(catalog, /HOME_CATALOG_VERSION = 'home-catalog-v3'/);
  assert.match(catalog, /renderer: 'UnknownHomeAsset'/);
  assert.match(catalog, /FOUNDATION_COUPLE_RIGS/);
  for (const field of ['poses', 'approach', 'exit', 'cameraTarget', 'reactionAnchor', 'uiAnchor', 'clickBounds', 'effectSockets']) {
    assert.match(catalog, new RegExp(`\\b${field}\\b`));
  }
});

test('cottage-v2 fallback retains the complete installed scene during backend rollout', () => {
  const layout = read('src/home/layouts.ts');
  assert.match(layout, /COTTAGE_V2_LAYOUT_ID = 'cottage-v2'/);
  assert.match(layout, /gardenTier: 'large'/);
  assert.match(layout, /'fallback-room-bedroom'/);
  assert.match(layout, /'fallback-room-garden'/);
  for (const seed of [
    'fallback-fireplace', 'fallback-sofa', 'fallback-table', 'fallback-rest',
    'fallback-easel', 'fallback-bookshelf', 'fallback-fern', 'fallback-bed',
    'fallback-pond', 'fallback-tree', 'fallback-bench', 'fallback-greenhouse',
  ]) assert.match(layout, new RegExp(`'${seed}'`));
  assert.match(layout, /garden-greenhouse-approach/);
  assert.match(layout, /garden-pond-approach/);
});

test('one resolver supplies render positions, collisions, walking, roles, cameras, and overlays', () => {
  const resolver = read('src/home/resolver.ts');
  assert.match(resolver, /export function resolveHomeScene/);
  assert.match(resolver, /renderPosition:/);
  assert.match(resolver, /colliders:/);
  assert.match(resolver, /walkableZones:/);
  assert.match(resolver, /roles,/);
  assert.match(resolver, /cameraStops,/);
  assert.match(resolver, /overlayAnchors,/);
  assert.match(resolver, /interactionSpots,/);
  assert.match(resolver, /resolveRig\(object, rig\)/);
  assert.match(resolver, /UNKNOWN_HOME_ASSET/);

  const home = read('src/scene/HomeScene.tsx');
  const composition = read('src/scene/rooms/RoomComposition.tsx');
  assert.match(home, /useHomeStore\(\(state\) => state\.resolved\)/);
  assert.match(home, /fireplace\.renderPosition/);
  assert.match(home, /scene\.cameraStops/);
  assert.doesNotMatch(home, /useHomeProgress/);
  assert.match(composition, /state\.resolved\.rooms/);
  assert.match(composition, /state\.resolved\.gardenTier/);
  assert.match(read('src/scene/Avatar.tsx'), /getSpotPose\(spotId, avatar\)/);
});

test('snapshot refresh and realtime revision invalidation preserve a fallback on rollout errors', () => {
  const store = read('src/state/homeStore.ts');
  const sync = read('src/state/useHearthSync.ts');
  assert.match(store, /LEGACY_COTTAGE_V2_SNAPSHOT/);
  assert.match(store, /fetchHomeSnapshot\(\)/);
  assert.match(store, /status: state\.snapshot\.revision > 0 \? 'error' : 'fallback'/);
  assert.match(store, /invalidate: \(revision\)/);
  assert.match(sync, /table: 'home_states'/);
  assert.match(sync, /useHomeStore\.getState\(\)\.invalidate/);
  assert.match(sync, /useHomeStore\.getState\(\)\.refresh/);
});

test('relationship growth reads paired_at rather than couple-row creation time', () => {
  const db = read('src/lib/db.ts');
  const progress = read('src/state/homeProgress.ts');
  assert.match(db, /paired_at\?: string \| null/);
  assert.match(progress, /state\.couple\?\.paired_at/);
  assert.doesNotMatch(progress, /state\.couple\?\.created_at/);
  assert.match(progress, /state\.snapshot\.activeGrowthSeconds/);
});
