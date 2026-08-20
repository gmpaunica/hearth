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

test('film mode is a persistent device setting with clear accessible copy', () => {
  const prefs = read('src/lib/prefs.ts');
  const store = read('src/state/homeUiStore.ts');
  const settings = read('src/components/Settings.tsx');

  assert.match(prefs, /hearth\.homeControlsHidden/);
  assert.match(prefs, /getHomeControlsHidden/);
  assert.match(prefs, /setHomeControlsHiddenPref/);
  assert.match(store, /controlsHidden: false/);
  assert.match(store, /await getHomeControlsHidden\(\)/);
  assert.match(store, /setHomeControlsHiddenPref\(controlsHidden\)/);
  assert.match(settings, />Hide home buttons</);
  assert.match(settings, /A clean view for filming/);
  assert.match(settings, /value=\{controlsHidden\}/);
  assert.match(settings, /onValueChange=\{setControlsHidden\}/);
  assert.match(settings, /accessibilityHint="Hide the lower home controls while keeping the top controls visible"/);
});

test('film mode hides only lower controls and retains the top home interface', () => {
  const home = read('src/app/index.tsx');

  assert.match(home, /controlsHidden && styles\.lowerControlsHidden/);
  assert.match(home, /pointerEvents=\{controlsHidden \? ['"]none['"] : ['"]box-none['"]\}/);
  assert.match(home, /importantForAccessibility=\{controlsHidden \? ['"]no-hide-descendants['"] : ['"]auto['"]\}/);
  assert.match(home, /lowerControlsHidden: \{ display: ['"]none['"] \}/);
  for (const component of ['MomentsController', 'CharacterButton', 'RitualsButton', 'GreenhouseButton']) {
    assert.match(home, new RegExp(`!settingsOpen && <${component}`));
  }
  assert.match(home, /<Settings \/>/);
  assert.match(home, /!settingsOpen && <DailyDrawing \/>/);
  assert.match(home, /styles\.titleWrap/);
  assert.doesNotMatch(home, /showLowerControls && <Settings/);
  assert.doesNotMatch(home, /showLowerControls && <DailyDrawing/);
});
