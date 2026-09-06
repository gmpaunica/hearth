import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('daily media and greenhouse routes preserve the rendered home and close without a transition flash', () => {
  const layout = read('src/app/_layout.tsx');

  for (const route of ['daily-photo', 'daily-record', 'greenhouse']) {
    const screen = layout.match(
      new RegExp(`<Stack\\.Screen[\\s\\S]*?name=["']${route}["'][\\s\\S]*?\\/>`),
    )?.[0] ?? '';
    assert.match(screen, /presentation: ['"]transparentModal['"]/);
    assert.match(screen, /animation: ['"]none['"]/);
    assert.match(screen, /contentStyle: \{ backgroundColor: ['"]transparent['"] \}/);
  }
});

test('production home settings no longer expose developer filming controls', () => {
  const prefs = read('src/lib/prefs.ts');
  const settings = read('src/components/Settings.tsx');

  assert.doesNotMatch(prefs, /homeControlsHidden|getHomeControlsHidden|setHomeControlsHiddenPref/);
  assert.doesNotMatch(settings, /Hide home buttons|filming|controlsHidden/);
  assert.match(settings, /\{__DEV__ && \(/);
});

test('home uses minimal permanent chrome and one secondary drawer', () => {
  const home = read('src/app/index.tsx');
  const chrome = read('src/components/HomeChrome.tsx');
  const drawer = read('src/components/OurThingsDrawer.tsx');

  assert.match(home, /<HomeChrome togetherDay=\{togetherDay\}/);
  assert.match(home, /\{momentsVisible && <MomentsController \/>\}/);
  assert.match(home, /<OurThingsDrawer \/>/);
  assert.match(home, /<Settings \/>/);
  assert.match(home, /<DailyDrawing showTrigger=\{false\} \/>/);
  assert.match(chrome, />Our things</);
  assert.match(chrome, /<RoomRail \/>/);
  assert.match(drawer, /Today & rituals/);
  assert.match(drawer, /Keepsakes/);
  assert.match(drawer, /Make it ours/);
  assert.doesNotMatch(home, /CharacterButton|RitualsButton|GreenhouseButton|DecorateButton/);
});
