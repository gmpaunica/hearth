import assert from 'node:assert/strict';

import { HOME_ASSETS } from '../src/home/catalog.ts';
import { LEGACY_COTTAGE_V2_SNAPSHOT } from '../src/home/layouts.ts';
import { resolveHomeScene } from '../src/home/resolver.ts';

const scene = resolveHomeScene(LEGACY_COTTAGE_V2_SNAPSHOT);
const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < 1e-9,
  `expected ${actual} to be near ${expected}`,
);
assert.equal(HOME_ASSETS.length, 95);
assert.equal(scene.rooms.length, 3);
assert.equal(scene.diagnostics.length, 0);
for (const role of [
  'fireplace', 'conversation_seating', 'shared_table', 'rest_location',
  'romantic_rest_location', 'drawing_portal', 'media_portal', 'garden_portal',
]) assert.ok(scene.roles[role], `missing resolved role ${role}`);
for (const spot of ['idle', 'fireplace', 'sofa', 'table', 'garden', 'garden_arch', 'rest', 'romantic']) {
  assert.ok(scene.interactionSpots[spot]?.a, `missing ${spot}.a`);
  assert.ok(scene.interactionSpots[spot]?.b, `missing ${spot}.b`);
}
near(scene.interactionSpots.sofa.a.x, 0.25);
near(scene.interactionSpots.sofa.a.z, -2.82);
near(scene.interactionSpots.romantic.b.x, 4.92);
near(scene.interactionSpots.romantic.b.z, -7.2);

const movedSnapshot = structuredClone(LEGACY_COTTAGE_V2_SNAPSHOT);
const movedSofa = movedSnapshot.objects.find((object) => object.assetId === 'cottage-sofa');
assert.ok(movedSofa);
movedSofa.position = [1.6, 0, -1.95];
const movedScene = resolveHomeScene(movedSnapshot);
near(movedScene.interactionSpots.sofa.a.x, 2.25);
near(movedScene.interactionSpots.sofa.a.z, -0.82);

const unknownSnapshot = structuredClone(LEGACY_COTTAGE_V2_SNAPSHOT);
unknownSnapshot.objects[0].assetId = 'retired-content-pack-piece';
const unknownScene = resolveHomeScene(unknownSnapshot);
assert.equal(unknownScene.objects[0].definition.renderer, 'UnknownHomeAsset');
assert.equal(unknownScene.objects[0].placeholder, true);
assert.equal(unknownScene.diagnostics.length, 1);

console.log('home foundation resolver verified');
