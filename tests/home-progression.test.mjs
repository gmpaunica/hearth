import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('home progression uses server-owned active growth at the agreed milestones', () => {
  const progression = read('src/home/progression.ts');
  const progressStore = read('src/state/homeProgress.ts');
  const types = read('src/home/types.ts');

  assert.match(types, /activeGrowthSeconds: number/);
  assert.match(progression, /144 \* 3_600/);
  for (const day of [3, 14, 21, 30, 60, 90, 180]) {
    assert.match(progression, new RegExp(`${day} \\* 86_400`));
  }
  assert.match(progressStore, /state\.snapshot\.activeGrowthSeconds/);
  assert.match(progressStore, /homeStatus === 'ready'/);
  assert.match(progressStore, /PREVIEW_UNLOCK_ALL = false/);
});

test('normal editing gates expansions while Developer operations declare their bypass', () => {
  const progression = read('src/home/progression.ts');
  const studio = read('src/components/HomeStudio.tsx');
  const store = read('src/state/homeStudioStore.ts');

  assert.match(progression, /room === 'living'\) return 6/);
  assert.match(progression, /room === 'bedroom'\) return 21/);
  assert.match(progression, /tier === 'standard'\) return 30/);
  assert.match(progression, /tier === 'large'\) return 90/);
  assert.match(progression, /return 180/);
  assert.match(studio, /moduleUnlockDay\(moduleId\)/);
  assert.match(studio, /growthDays >= roomSizeUnlockDay/);
  assert.match(studio, /growthDays >= gardenTierUnlockDay/);
  assert.match(store, /operation, developer: true/);
  assert.match(store, /stored\.mode === mode/);
});

test('progression never hides the current authored room or garden tier', () => {
  const studio = read('src/components/HomeStudio.tsx');
  assert.match(studio, /size === room\.sizeTier[\s\S]*growthDays >= roomSizeUnlockDay/);
  assert.match(studio, /tier === draft\.gardenTier \|\| growthDays >= gardenTierUnlockDay/);
});
