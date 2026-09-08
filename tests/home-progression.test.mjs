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

test('normal editing gates expansions and no client operation can declare a bypass', () => {
  const progression = read('src/home/progression.ts');
  const studio = read('src/components/HomeStudio.tsx');
  const store = read('src/state/homeStudioStore.ts');
  const types = read('src/home/types.ts');

  assert.match(progression, /room === 'living'\) return 6/);
  assert.match(progression, /room === 'bedroom'\) return 21/);
  assert.match(progression, /tier === 'standard'\) return 30/);
  assert.match(progression, /tier === 'large'\) return 90/);
  assert.match(progression, /return 180/);
  assert.match(studio, /moduleUnlockDay\(moduleId\)/);
  assert.match(studio, /growthDays >= roomSizeUnlockDay/);
  assert.match(studio, /growthDays >= gardenTierUnlockDay/);
  assert.doesNotMatch(store, /operation, developer: true/);
  assert.doesNotMatch(types, /developer\?: boolean/);
  assert.match(store, /mode === 'developer' && !__DEV__/);
  assert.match(store, /stored\.mode === mode/);
});

test('progression never hides the current authored room or garden tier', () => {
  const studio = read('src/components/HomeStudio.tsx');
  assert.match(studio, /size === room\.sizeTier[\s\S]*growthDays >= roomSizeUnlockDay/);
  assert.match(studio, /tier === draft\.gardenTier \|\| growthDays >= gardenTierUnlockDay/);
});

test('home growth is explained as shared chapters without pressure or scorekeeping', () => {
  const progressStore = read('src/state/homeProgress.ts');
  const card = read('src/components/HomeGrewCard.tsx');
  const notice = read('src/scene/LockedRoomNotice.tsx');
  const rail = read('src/components/RoomRail.tsx');
  const qa = read('src/app/home-growth-qa.tsx');
  assert.match(progressStore, /discoveries: string\[\]/);
  assert.doesNotMatch(progressStore, /tier II|tier III|144 active hours/);
  assert.match(card, /Nothing needs to be earned or rushed/);
  assert.match(card, /Now at home/);
  assert.match(card, /HearthTheme/);
  assert.doesNotMatch(card, /import \{ editorial \}/);
  assert.match(notice, /A FUTURE CHAPTER/);
  assert.doesNotMatch(notice, /LOCKED ROOM/);
  assert.match(rail, /grows into view after/);
  assert.match(qa, /if \(!__DEV__\) return <Redirect href="\/"/);
  for (const state of ['moving', 'details', 'bedroom', 'garden', 'landmark', 'grand']) {
    assert.match(qa, new RegExp(`'${state}'`));
  }
});
