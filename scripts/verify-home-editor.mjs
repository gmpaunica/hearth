import assert from 'node:assert/strict';

import {
  applyHomeOperation,
  cloneHomeSnapshot,
  findOpenPlacement,
  validateHomeDraft,
} from '../src/home/editor.ts';
import { LEGACY_COTTAGE_V2_SNAPSHOT } from '../src/home/layouts.ts';

const base = cloneHomeSnapshot(LEGACY_COTTAGE_V2_SNAPSHOT);
assert.deepEqual(validateHomeDraft(base), []);

const table = base.objects.find((object) => object.assetId === 'shared-table');
assert.ok(table?.roomId);
let grouped = applyHomeOperation(base, {
  type: 'add',
  objectId: 'editor-verification-child',
  roomId: table.roomId,
  assetId: 'potted-fern',
  surface: 'table',
  position: [...table.position],
  rotation: 0,
});
grouped = applyHomeOperation(grouped, {
  type: 'attach',
  objectId: 'editor-verification-child',
  parentObjectId: table.id,
  socket: 'table-north',
});
assert.deepEqual(validateHomeDraft(grouped), []);

const oldChild = grouped.objects.find((object) => object.id === 'editor-verification-child');
assert.ok(oldChild);
const moved = applyHomeOperation(grouped, {
  type: 'move',
  objectId: table.id,
  roomId: table.roomId,
  surface: table.surface,
  position: [table.position[0] + 0.25, table.position[1], table.position[2]],
});
const movedChild = moved.objects.find((object) => object.id === oldChild.id);
assert.equal(movedChild?.position[0], oldChild.position[0] + 0.25);

const stored = applyHomeOperation(grouped, { type: 'store', objectId: table.id });
assert.equal(stored.objects.find((object) => object.id === table.id)?.placementState, 'stored');
assert.equal(stored.objects.find((object) => object.id === oldChild.id)?.placementState, 'stored');
assert.ok(validateHomeDraft(stored).some((problem) => problem.code === 'required_role'));

const living = grouped.rooms.find((room) => room.moduleId === 'living');
assert.ok(living);
const resized = applyHomeOperation(grouped, {
  type: 'resize',
  roomId: living.id,
  sizeTier: 'compact',
  bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
});
assert.equal(resized.objects.find((object) => object.id === table.id)?.placementState, 'needs_spot');
assert.equal(resized.objects.find((object) => object.id === oldChild.id)?.placementState, 'needs_spot');

const open = findOpenPlacement(base, 'potted-fern', living.id);
assert.ok(open);

const courtyard = cloneHomeSnapshot(base);
courtyard.gardenTier = 'courtyard';
assert.ok(validateHomeDraft(courtyard).some((problem) => problem.code === 'water_limit'));

const compact = cloneHomeSnapshot(base);
compact.gardenTier = 'courtyard';
compact.rooms = compact.rooms.filter((room) => room.moduleId !== 'bedroom');
const compactLiving = compact.rooms.find((room) => room.moduleId === 'living');
const compactGarden = compact.rooms.find((room) => room.moduleId === 'garden');
assert.ok(compactLiving && compactGarden);
Object.assign(compactLiving, {
  sizeTier: 'compact',
  bounds: { minX: -4.75, maxX: 4.25, minZ: -4.5, maxZ: 3.75 },
});
Object.assign(compactGarden, {
  sizeTier: 'compact',
  bounds: { minX: -8.75, maxX: -4, minZ: 0, maxZ: 5 },
});
const compactAssets = new Set([
  'core-fireplace', 'cottage-sofa', 'shared-table', 'rest-nook',
  'drawing-easel', 'daily-media-console', 'garden-threshold', 'romantic-daybed',
]);
compact.objects = compact.objects.filter((object) => compactAssets.has(object.assetId));
const compactBed = compact.objects.find((object) => object.assetId === 'romantic-daybed');
assert.ok(compactBed);
Object.assign(compactBed, { roomId: compactLiving.id, position: [2.75, 0, -1.6], rotation: 1 });
compact.reservedRoutes = compact.reservedRoutes.filter((route) =>
  ['living-garden-door', 'living-bedroom-door', 'garden-entry'].includes(route.key));
assert.deepEqual(validateHomeDraft(compact), []);

console.log('Home Studio editor verified');
