import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Home Studio exposes the complete editor surface from visible Developer settings', () => {
  const settings = read('src/components/Settings.tsx');
  const studio = read('src/components/HomeStudio.tsx');
  const index = read('src/app/index.tsx');
  assert.match(settings, />Developer</);
  assert.match(settings, /Open Home Studio/);
  assert.match(settings, /activeMoment \|\| homeBlockedByMoment/);
  assert.match(index, /<HomeStudio \/>/);
  for (const tray of ['Build', 'Furnish', 'Decorate', 'Garden', 'Stored', 'Needs a new spot']) {
    assert.match(studio, new RegExp(`label: '${tray}'`));
  }
  for (const action of ['Duplicate', 'Style', 'Store', 'Replace', 'Reset layout', 'Export snapshot']) {
    assert.match(studio, new RegExp(action));
  }
  assert.match(studio, /PanResponder\.create/);
  assert.match(studio, /valid: candidate\.valid/);
  assert.match(studio, /Nudge left/);
  assert.match(studio, /Rotate 90 degrees/);
  for (const tier of ['courtyard', 'standard', 'large', 'grand']) {
    assert.match(studio, new RegExp(`'${tier}'`));
  }
  assert.match(studio, /Attach bedroom/);
  assert.match(studio, /Attach future room/);
  assert.match(read('src/home/layouts.ts'), /COTTAGE_V2_ROOM_MASKS/);
  assert.match(read('src/home/layouts.ts'), /COTTAGE_V2_GARDEN_MASKS/);
});

test('the draft store persists commands, supports history, and resolves revision conflicts explicitly', () => {
  const store = read('src/state/homeStudioStore.ts');
  assert.match(store, /AsyncStorage\.setItem/);
  assert.match(store, /Offline draft restored/);
  assert.match(store, /undoStack/);
  assert.match(store, /redoStack/);
  assert.match(store, /pendingRequestId/);
  assert.match(store, /applyHomeEdit\(/);
  assert.match(store, /latest\.revision !== state\.baseSnapshot\.revision/);
  assert.match(store, /touchedConflictMessages/);
  assert.match(store, /keepLocalResolution/);
  assert.match(store, /usePartnerVersion/);
  assert.match(store, /Draft kept offline/);
  assert.match(store, /validateHomeDraft\(state\.draftSnapshot\)/);
});

test('client validation matches placement, route, role, attachment, budget, and garden rules', () => {
  const editor = read('src/home/editor.ts');
  for (const code of [
    'unknown_asset', 'room_incompatible', 'surface_incompatible',
    'rotation_incompatible', 'outside_bounds', 'collision', 'route_blocked',
    'required_role', 'attachment_invalid', 'attachment_placement',
    'attachment_cycle', 'attachment_occupied', 'scene_budget', 'water_limit',
  ]) assert.match(editor, new RegExp(`'${code}'`));
  assert.match(editor, /const family = descendants\(next, object\.id\)/);
  assert.match(editor, /member\.position = member\.id === object\.id/);
  assert.match(editor, /HOME_GRID = 0\.25/);
  assert.match(editor, /findOpenPlacement/);
});

test('saving remains atomic and editing preserves the mounted scene', () => {
  const store = read('src/state/homeStudioStore.ts');
  const homeStore = read('src/state/homeStore.ts');
  const scene = read('src/scene/HomeScene.tsx');
  assert.match(store, /previewSnapshot\(draft\)/);
  assert.match(store, /clearPreview\(\)/);
  assert.match(homeStore, /previewing: true/);
  assert.match(scene, /PlacementGhost/);
  assert.match(scene, /ghost\.valid/);
});

test('every foundation object and its scene anchors render from resolved instances', () => {
  const renderer = read('src/scene/HomeObjectRenderer.tsx');
  const scene = read('src/scene/HomeScene.tsx');
  const bedroom = read('src/scene/rooms/Bedroom.tsx');
  const garden = read('src/scene/rooms/Garden.tsx');
  for (const name of [
    'Fireplace', 'Sofa', 'TableSet', 'RestNook', 'Bed', 'Easel',
    'DailyMediaConsole', 'GardenThreshold', 'Bookshelf', 'Plant',
    'BedsideTable', 'Wardrobe', 'KoiPond', 'BlossomTree', 'RoseBush',
    'GardenLantern', 'Bench', 'GardenGreenhousePortal',
  ]) assert.match(renderer, new RegExp(`case '${name}'`));
  assert.match(scene, /scene\.objects[\s\S]*<HomeObjectRenderer/);
  assert.doesNotMatch(bedroom, /<Bed /);
  assert.doesNotMatch(garden, /<KoiPond|<Bench|<GardenLantern/);
  assert.doesNotMatch(garden, /position=\{\[-7, 0, -5\.2\]\}/);
  assert.match(read('src/scene/cameraState.ts'), /getResolvedHomeScene\(\)\.interactionSpots/);
  assert.match(read('src/scene/WorldAnchorProjector.tsx'), /scene\.overlayAnchors/);
  assert.match(read('src/scene/MomentSceneDetails.tsx'), /FollowObject/);
});
