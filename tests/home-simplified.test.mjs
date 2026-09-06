import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function loadNavigation() {
  const source = read('src/scene/roomNavigation.ts');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', compiled)(module.exports, module);
  return module.exports;
}

test('one discriminated coordinator owns every major home surface', () => {
  const store = read('src/state/momentsSurfaceStore.ts');
  for (const kind of ['none', 'moments', 'hearth', 'settings', 'drawer', 'drawing', 'studio']) {
    assert.match(store, new RegExp(`kind: '${kind}'`));
  }
  assert.doesNotMatch(store, /settingsOpen: boolean|hearthOpen: boolean|expanded: boolean/);
  assert.match(store, /homeSurfaceAllowsPlayback/);
  assert.match(store, /state\.surface\.kind === 'none' && state\.appVisible/);
});

test('the action registry is the single drawer and scene navigation contract', () => {
  const registry = read('src/home/actionRegistry.ts');
  const drawer = read('src/components/OurThingsDrawer.tsx');
  for (const id of ['today-sketch', 'sketchbook', 'daily-voice', 'daily-photo', 'diary', 'memories', 'wardrobe', 'decorate']) {
    assert.match(registry, new RegExp(`id: '${id}'`));
  }
  for (const group of ['Today & rituals', 'Keepsakes', 'Make it ours']) {
    assert.match(registry, new RegExp(`drawerGroup: '${group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  }
  assert.match(registry, /accessibilityLabel/);
  assert.match(registry, /sceneEntry:/);
  assert.match(registry, /badge:/);
  assert.match(drawer, /useHomeActions\(\)/);
  assert.match(drawer, /performHomeAction\(action\.id\)/);
});

test('the home keeps only wordmark, account, room rail, Moments, and Our things in permanent chrome', () => {
  const home = read('src/app/index.tsx');
  const chrome = read('src/components/HomeChrome.tsx');
  assert.match(home, /<HomeChrome togetherDay=\{togetherDay\}/);
  assert.match(home, /<MomentsController \/>/);
  assert.match(home, /<OurThingsDrawer \/>/);
  assert.match(chrome, /<RoomRail \/>/);
  assert.match(chrome, />Account</);
  assert.match(chrome, />Our things</);
  assert.doesNotMatch(home, /CharacterButton|RitualsButton|GreenhouseButton|DecorateButton|DailyMediaHomeActions/);
});

test('room offsets stay on a bounded piecewise rail with exact endpoints', () => {
  const navigation = loadNavigation();
  const stops = navigation.ROOM_STOPS;
  const left = navigation.clampCameraOffset(-500, 500);
  const right = navigation.clampCameraOffset(500, -500);
  assert.deepEqual(left, { x: stops.garden.x, z: stops.garden.z });
  assert.deepEqual(right, { x: stops.bedroom.x, z: stops.bedroom.z });
  const middle = navigation.clampCameraOffset(1, 1);
  const ordered = [stops.garden, stops.living, stops.bedroom];
  const min = navigation.roomRailPosition(ordered[0].x, ordered[0].z);
  const max = navigation.roomRailPosition(ordered[2].x, ordered[2].z);
  const at = navigation.roomRailPosition(middle.x, middle.z);
  assert.ok(at >= min && at <= max);
});

test('room and drawer controls remain safe-area aware, scrollable, and at least 44 points', () => {
  const rail = read('src/components/RoomRail.tsx');
  const drawer = read('src/components/OurThingsDrawer.tsx');
  assert.match(rail, /useSafeAreaInsets\(\)/);
  assert.match(rail, /minHeight: HearthTheme\.touch\.minimum/);
  assert.match(rail, /accessibilityRole="tab"/);
  assert.match(drawer, /<SafeAreaView/);
  assert.match(drawer, /<ScrollView/);
  assert.match(drawer, /AccessibilityInfo\.setAccessibilityFocus/);
  assert.match(drawer, /minHeight: 68/);
  assert.match(drawer, /width: HearthTheme\.touch\.minimum/);
});
