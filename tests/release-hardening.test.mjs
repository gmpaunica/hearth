import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('release verification enforces the milestone-one bundle and hydration budgets', () => {
  const script = read('scripts/verify-release.mjs');
  assert.match(script, /const maxRegression = 1\.1/);
  assert.match(script, /android: \{ bundleBytes: 7_686_640/);
  assert.match(script, /ios: \{ bundleBytes: 7_484_193/);
  assert.match(script, /web: \{ bundleBytes: 4_302_251/);
  assert.match(script, /unfinished Suspense boundary/);
  assert.match(script, /bundle exceeds the 10% release budget/);
});

test('production web starts from a stable loading shell before native or WebGL work', () => {
  const layout = read('src/app/_layout.tsx');
  const canvas = read('src/scene/SceneCanvas.web.tsx');
  assert.match(layout, /Platform\.OS === 'web' && !hydrated/);
  assert.match(layout, /return <AppLoadingScreen \/>/);
  assert.match(canvas, /\{hydrated \? \(/);
});
