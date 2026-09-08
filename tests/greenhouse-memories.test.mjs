import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeRequire = createRequire(import.meta.url);
const read = (path) => readFileSync(join(root, path), 'utf8');

function compile(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', 'require', output)(module.exports, module, nodeRequire);
  return module.exports;
}

test('greenhouse grows one bay per four memories without a relationship score', () => {
  const model = compile('src/memories/greenhouseModel.ts');
  assert.equal(model.getGreenhouseBayCount(0), 1);
  assert.equal(model.getGreenhouseBayCount(4), 1);
  assert.equal(model.getGreenhouseBayCount(5), 2);
  assert.equal(model.getGreenhouseBayCount(8), 2);
  assert.equal(model.getGreenhouseBayCount(9), 3);
  assert.equal(model.getGreenhouseCapacity(5), 8);
  assert.doesNotMatch(read('src/memories/greenhouseModel.ts'), /score|rank|streak|failure/i);
});

test('persisted memories are sliced into four-item bays', () => {
  const model = compile('src/memories/greenhouseModel.ts');
  const memories = Array.from({ length: 9 }, (_, index) => ({ id: String(index) }));
  assert.deepEqual(model.memoriesForBay(memories, 0).map((item) => item.id), ['0', '1', '2', '3']);
  assert.deepEqual(model.memoriesForBay(memories, 2).map((item) => item.id), ['8']);

  const surface = read('src/components/GreenhouseMemories.tsx');
  assert.match(surface, /PrivatePhoto/);
  assert.match(surface, /A paired memory/);
  assert.match(surface, /This is final for this photo-day/);
  assert.doesNotMatch(surface, /caption|video|preview memory/i);
});

test('garden and accessible home controls both open the greenhouse route', () => {
  const portal = read('src/scene/objects/GardenGreenhousePortal.tsx');
  const actions = read('src/home/actionRegistry.ts');
  const drawer = read('src/components/OurThingsDrawer.tsx');
  const home = read('src/scene/HomeScene.tsx');
  const renderer = read('src/scene/HomeObjectRenderer.tsx');
  const index = read('src/app/index.tsx');
  assert.match(portal, /performHomeAction\('memories'\)/);
  assert.match(portal, /position\?: \[number, number, number\]/);
  assert.match(actions, /id: 'memories'/);
  assert.match(actions, /router\.push\('\/greenhouse'/);
  assert.match(actions, /context\.gardenUnlocked/);
  assert.match(home, /<HomeObjectRenderer/);
  assert.match(renderer, /case 'GardenGreenhousePortal'/);
  assert.match(index, /<OurThingsDrawer/);
  assert.match(drawer, /performHomeAction\(action\.id\)/);
});

test('greenhouse uses horizontal bay navigation without shrinking the scene', () => {
  const scene = read('src/scene/GreenhouseScene.tsx');
  const greenhouse = read('src/scene/objects/Greenhouse.tsx');
  const route = read('src/app/greenhouse.tsx');
  assert.match(scene, /const frameWidth = 7\.6/);
  assert.doesNotMatch(scene, /bayCount - 1/);
  assert.match(greenhouse, /key=\{`persisted-bay-\$\{memoryCount\}`\}/);
  assert.match(greenhouse, /for \(let index = 0; index < memoryCount/);
  assert.match(route, /load\(true\)/);
  assert.match(route, /memoriesForBay\(memories, visibleBay\)/);
  assert.match(read('src/components/GreenhouseMemories.tsx'), /Older greenhouse bay/);
  assert.match(route, /onAccessibilityActivate=\{null\}/);
});

test('greenhouse supports calm recovery, chronology, and direct date retrieval', () => {
  const surface = read('src/components/GreenhouseMemories.tsx');
  const route = read('src/app/greenhouse.tsx');
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const model = compile('src/memories/greenhouseModel.ts');
  const memories = [
    { home_date: '2026-09-08' }, { home_date: '2026-09-05' },
    { home_date: '2026-08-29' }, { home_date: '2026-08-22' },
    { home_date: '2026-08-14' },
  ];
  assert.equal(model.findBayForHomeDate(memories, '2026-08-14'), 1);
  assert.deepEqual(model.greenhouseBayDateRange(memories, 0), { newest: '2026-09-08', oldest: '2026-08-22' });
  assert.match(surface, /Return to newest greenhouse memories/);
  assert.match(surface, /Go to today’s photo/);
  assert.match(surface, /Try opening the greenhouse again/);
  assert.match(surface, /Remove forever/);
  assert.match(route, /useLocalSearchParams/);
  assert.match(route, /findBayForHomeDate/);
  assert.match(photo, /params: \{ date: snapshot\.home_date \}/);
});

test('greenhouse QA route exposes mutation-free empty, error, chronology, focus, and deletion states', () => {
  const qa = read('src/app/greenhouse-qa.tsx');
  for (const state of ['empty', 'error', 'chronology', 'focused', 'delete']) assert.match(qa, new RegExp(`'${state}'`));
  assert.match(qa, /onUnplant=\{async \(\) => false\}/);
  assert.match(qa, /localPhotoUri=\{PHOTO_URI\}/);
});

test('Our Diary is paginated by date and contains voice notes and sketches but no photos', () => {
  const route = read('src/app/diary.tsx');
  const diary = read('src/components/daily/OurDiaryScreen.tsx');
  const collections = read('src/daily/collectionStore.ts');
  assert.match(route, /OurDiaryScreen/);
  assert.match(diary, /VoiceNotePlayer/);
  assert.match(diary, /PixelArt/);
  assert.match(diary, /one page per date/i);
  assert.doesNotMatch(diary, /PrivatePhoto|GreenhousePhoto/);
  assert.match(collections, /fetchDiaryPage/);
  assert.match(collections, /p_before_date|current\.at\(-1\)/);
  assert.match(diary, /submission slot stays closed/);
});

test('Our things keeps both retained Sketchbook and Our Diary destinations', () => {
  const registry = read('src/home/actionRegistry.ts');
  const drawer = read('src/components/OurThingsDrawer.tsx');
  assert.match(registry, /id: 'sketchbook'/);
  assert.match(registry, /surfaces\.openDrawing\('sketchbook'\)/);
  assert.match(registry, /id: 'diary'/);
  assert.match(registry, /router\.push\('\/diary'/);
  assert.match(drawer, /Today & rituals/);
});
