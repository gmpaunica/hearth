import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const supabase = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const pan = readFileSync(new URL('../src/scene/usePan.ts', import.meta.url), 'utf8');

test('web auth is isolated per Chrome tab without changing native storage', () => {
  assert.match(supabase, /window\.sessionStorage/);
  assert.match(supabase, /hearth\.auth\.tab-key/);
  assert.match(supabase, /storageKey: `hearth-auth-\$\{tabKey\}`/);
  assert.match(supabase, /webAuth\?\.storage.*AsyncStorage/s);
});

test('Chrome wheel and trackpad input pan and pinch-zoom the existing scene', () => {
  assert.match(pan, /addEventListener\('wheel', onWheel, \{ passive: false \}\)/);
  assert.match(pan, /wheel\.target instanceof HTMLCanvasElement/);
  assert.match(pan, /moveCameraByPixels\(-scrollX, -scrollY\)/);
  assert.match(pan, /wheel\.ctrlKey/);
  assert.match(pan, /Math\.exp\(-rawY \* WHEEL_ZOOM_SPEED\)/);
});
