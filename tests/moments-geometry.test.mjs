import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function loadTsModule(path) {
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', compiled)(module.exports, module);
  return module.exports;
}

test('every seated Moment owns walkable approach and egress anchors', () => {
  const { SPOTS } = loadTsModule('src/scene/spots.ts');
  const navigation = loadTsModule('src/scene/sceneNavigation.ts');
  const seatedSpots = ['fireplace', 'sofa', 'table', 'garden', 'rest', 'romantic'];

  for (const spot of seatedSpots) {
    for (const avatar of ['a', 'b']) {
      const pose = SPOTS[spot][avatar];
      assert.ok(pose.seatY > 0, `${spot}.${avatar} must be a seated pose`);
      assert.ok(pose.approach, `${spot}.${avatar} needs an approach point`);
      assert.ok(pose.egress, `${spot}.${avatar} needs an egress point`);
      assert.equal(
        navigation.isWalkable(pose.approach),
        true,
        `${spot}.${avatar} approach intersects ${navigation.pointHitsCollider(pose.approach)?.id ?? 'a wall'}`,
      );
      assert.equal(
        navigation.isWalkable(pose.egress),
        true,
        `${spot}.${avatar} egress intersects ${navigation.pointHitsCollider(pose.egress)?.id ?? 'a wall'}`,
      );
    }
  }
});

test('seat exit remains low until clear and reduced motion snaps to egress', () => {
  const avatar = read('src/scene/Avatar.tsx');
  assert.match(avatar, /previousPose\.seatY > 0 && previousPose\.egress/);
  assert.match(avatar, /a\.exitTarget = previousPose\.egress/);
  assert.match(avatar, /exitingSeat[\s\S]*approachRemaining > 0\.07 \? 1 : 0/);
  assert.match(avatar, /root\.position\.set\(a\.exitTarget\.x, 0, a\.exitTarget\.z\)/);
  assert.match(avatar, /approachRemaining < 0\.055 && a\.sit < 0\.08/);
});

test('garden-owned gateway frames a single clear threshold', () => {
  const garden = read('src/scene/rooms/Garden.tsx');
  const gateway = garden.slice(
    garden.indexOf('function buildGardenGateway'),
    garden.indexOf('const POND_ROWS'),
  );
  assert.match(garden, /const threshold = x >= 10 && z >= 0 && z <= 3/);
  assert.match(gateway, /v\.box\(10, 0, -2, 2, 11, 2, timber\)/);
  assert.match(gateway, /v\.box\(10, 0, 5, 2, 11, 2, timber\)/);
  assert.doesNotMatch(gateway, /v\.box\([^\n]+vine/);

  const navigation = loadTsModule('src/scene/sceneNavigation.ts');
  const corridor = [
    { x: -4.62, z: 2.8 },
    { x: -4.45, z: 3.1 },
    { x: -4.2, z: 3.4 },
  ];
  for (const point of corridor) {
    assert.equal(navigation.isWalkable(point), true, `gateway corridor blocked at ${JSON.stringify(point)}`);
  }
});
