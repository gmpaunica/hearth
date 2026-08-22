import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('the client registry contains the same 112-item delivery catalog without duplicate IDs', () => {
  const catalog = read('src/home/catalog.ts');
  const direct = [...catalog.matchAll(/asset\(\{ id: '([^']+)'/g)].map((match) => match[1]);
  const indoor = [...catalog.matchAll(/\bindoorAsset\('([^']+)'/g)].map((match) => match[1]);
  const garden = [...catalog.matchAll(/\bgardenAsset\('([^']+)'/g)].map((match) => match[1]);
  const ids = [...direct, ...indoor, ...garden];
  assert.deepEqual([direct.length, indoor.length, garden.length], [27, 31, 54]);
  assert.equal(ids.length, 112);
  assert.equal(new Set(ids).size, 112);
});

test('the release contract covers every editor and scene validation gate', () => {
  const editor = read('src/home/editor.ts');
  const studio = read('src/state/homeStudioStore.ts');
  const sync = read('src/state/useHearthSync.ts');
  const resolver = read('src/home/resolver.ts');
  const types = read('src/home/types.ts');

  // Rotations/surfaces, routes, canopy sightlines, roles, scene density, and
  // tier-specific water limits all run before an atomic Save.
  for (const gate of [
    'rotation_incompatible', 'surface_incompatible', 'path_disconnected',
    'canopy_occlusion', 'required_role', 'scene_budget', 'water_limit',
  ]) assert.match(editor, new RegExp(`'${gate}'`));
  assert.match(editor, /HOME_SCENE_BUDGET = 480/);
  assert.match(editor, /gardenTier === 'grand' \? 2/);

  // Downsizing keeps displaced groups, offline command logs survive, and
  // partner changes are replayed with explicit conflict choices.
  assert.match(editor, /placementState = 'needs_spot'/);
  assert.match(studio, /AsyncStorage\.setItem/);
  assert.match(studio, /Offline draft restored/);
  assert.match(studio, /latest\.revision !== state\.baseSnapshot\.revision/);
  assert.match(studio, /touchedConflictMessages/);
  assert.match(studio, /keepLocalResolution/);
  assert.match(studio, /usePartnerVersion/);
  assert.match(studio, /Draft kept offline/);

  // Realtime is revision-only, foregrounding refetches truth, and every
  // navigation/camera/interaction consumer shares the resolved scene.
  assert.match(sync, /table: 'home_states'/);
  assert.match(sync, /useHomeStore\.getState\(\)\.invalidate/);
  assert.match(sync, /if \(s === 'active'\)[\s\S]{0,180}useHomeStore\.getState\(\)\.refresh/);
  assert.match(resolver, /export function resolveHomeScene/);
  for (const field of ['colliders', 'walkableZones', 'interactionSpots', 'cameraStops', 'overlayAnchors']) {
    assert.match(types, new RegExp(`\\b${field}\\b`));
  }
});

test('active Moments, frozen worlds, and reduced motion retain their promised behavior', () => {
  const settings = read('src/components/Settings.tsx');
  const studio = read('src/components/HomeStudio.tsx');
  const gardenEffects = read('src/scene/objects/GardenCatalogObject.tsx');
  const pond = read('src/scene/rooms/Garden.tsx');
  const plant = read('src/scene/objects/Plant.tsx');

  assert.match(settings, /activeMoment \|\| homeBlockedByMoment/);
  assert.match(studio, /Finish the active Moment before saving the home/);
  assert.match(studio, /shared world is currently view-only/);
  assert.match(studio, /Frozen-world simulation/);
  assert.match(gardenEffects, /atmo\.reduceMotion/);
  assert.match(pond, /atmo\.reduceMotion \? 0/);
  assert.match(plant, /if \(atmo\.reduceMotion\)/);
});
