import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('the sketch ritual is explicitly optional and its reminder is private per person', () => {
  const daily = read('src/components/DailyDrawing.tsx');
  const preferences = read('src/state/ritualPreferencesStore.ts');
  const ritual = read('src/state/dailyRitualStore.ts');
  assert.match(daily, /Sketches are always optional/);
  assert.match(daily, /Your partner cannot see this choice/);
  assert.match(daily, /Skipping a day never creates a streak, score, warning/);
  assert.match(preferences, /hearth\.ritual-preferences\.\$\{STORAGE_VERSION\}\.\$\{coupleId\}\.\$\{userId\}/);
  assert.match(preferences, /sketchReminderEnabled: saved !== 'off'/);
  assert.match(ritual, /useRitualPreferencesStore\.getState\(\)\.sketchReminderEnabled/);
});

test('creation keeps the canvas primary and reveals titles and brush controls progressively', () => {
  const daily = read('src/components/DailyDrawing.tsx');
  const canvas = read('src/components/DrawingCanvas.tsx');
  assert.ok(daily.indexOf('<DrawingCanvas') < daily.indexOf('Add a title (optional)'));
  assert.match(daily, /accessibilityState=\{\{ expanded: titleOpen \}\}/);
  assert.match(canvas, /Brush & clear/);
  assert.match(canvas, /accessibilityState=\{\{ expanded: toolsOpen \}\}/);
  assert.match(canvas, /Clear every mark on this unsent sketch\?/);
  assert.match(canvas, /width: 48/);
  assert.doesNotMatch(`${daily}\n${canvas}`, /fontFamily: 'serif'|from '@\/theme\/hearth'.*editorial/);
});

test('sketch deletion is author-owned, confirmed, and preserves the closed daily slot', () => {
  const store = read('src/state/drawingStore.ts');
  const book = read('src/components/Sketchbook.tsx');
  assert.match(store, /deleteDailyArtifact\('sketch', id\)/);
  assert.match(store, /page\.memberAId === id && couple\.member_a === auth\.userId/);
  assert.match(store, /page\.memberBId === id && couple\.member_b === auth\.userId/);
  assert.match(store, /mySlotOpen: false/);
  assert.match(store, /drawing_slot_is_open/);
  assert.match(book, /It disappears for both of you and cannot be added again for that day/);
  assert.match(book, /Remove forever/);
  assert.doesNotMatch(book, /partner.*Remove forever/i);
});

test('the sketchbook offers direct date navigation and readable accessibility summaries', () => {
  const book = read('src/components/Sketchbook.tsx');
  assert.match(book, /accessibilityLabel="Sketchbook dates"/);
  assert.match(book, /accessibilityState=\{\{ selected: index === activePageIndex \}\}/);
  assert.match(book, /pageSummary/);
  assert.match(book, /Earlier/);
  assert.match(book, /Later/);
  assert.match(book, /HearthTheme\.touch\.minimum/);
  assert.doesNotMatch(book, /fontFamily: 'serif'/);
});

test('the hearth describes an optional ritual without a numeric relationship-like meter', () => {
  const presentation = read('src/state/firePresentation.ts');
  const card = read('src/components/HearthStatusCard.tsx');
  assert.match(presentation, /low: 'resting'/);
  assert.match(presentation, /welcomes any tiny sketch you choose to share/);
  assert.match(card, /Optional ritual/);
  assert.doesNotMatch(card, /Math\.round\(fire\.intensity \* 100\)|% warm/);
});

test('the deterministic review route covers empty, drawing, saved, preference, book, and deletion states', () => {
  const qa = read('src/app/daily-sketch-qa.tsx');
  assert.match(qa, /if \(!__DEV__\) return <Redirect/);
  for (const state of ['empty', 'drawing', 'saved', 'preferences', 'book', 'delete']) {
    assert.match(qa, new RegExp(`'${state}'`));
  }
  assert.match(qa, /reviewMode/);
  assert.doesNotMatch(qa, /supabase|\.rpc\(/);
});
