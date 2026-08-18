import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeRequire = createRequire(import.meta.url);
const read = (path) => readFileSync(join(root, path), 'utf8');

function compile(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', 'require', output)(module.exports, module, nodeRequire);
  return module.exports;
}

test('greenhouse grows one bay per four memories without a relationship score', () => {
  const model = compile('src/memories/greenhouseModel.ts');
  assert.equal(model.getGreenhouseBayCount(0), 1);
  assert.equal(model.getGreenhouseBayCount(4), 1);
  assert.equal(model.getGreenhouseBayCount(5), 2);
  assert.equal(model.getGreenhouseBayCount(8), 2);
  assert.equal(model.getGreenhouseBayCount(9), 3);
  assert.equal(model.getGreenhouseCapacity(5), 8);
  assert.doesNotMatch(read('src/memories/greenhouseModel.ts'), /score|rank|streak|failure/i);
});

test('preview memories remain unmistakably local media placeholders', () => {
  const model = compile('src/memories/greenhouseModel.ts');
  const first = model.createGreenhousePreviewMemory(0);
  const third = model.createGreenhousePreviewMemory(2);
  assert.equal(first.kind, 'image');
  assert.equal(third.kind, 'video');
  assert.equal(first.prototype, true);
  assert.equal(first.mediaUri, undefined);

  const surface = read('src/components/GreenhouseMemories.tsx');
  assert.match(surface, /Media adding comes in a later update/);
  assert.match(surface, /without saving anything/);
  assert.match(surface, /Layout preview/);
  assert.doesNotMatch(surface, /upload|picker|permission/i);
});

test('garden and accessible home controls both open the greenhouse route', () => {
  const portal = read('src/scene/objects/GardenGreenhousePortal.tsx');
  const button = read('src/components/GreenhouseButton.tsx');
  const home = read('src/scene/HomeScene.tsx');
  const index = read('src/app/index.tsx');
  assert.match(portal, /router\.push\('\/greenhouse'/);
  assert.match(portal, /GARDEN_OFFSET/);
  assert.match(button, /router\.push\('\/greenhouse'/);
  assert.match(button, /components\.has\('garden'\)/);
  assert.match(home, /<GardenGreenhousePortal/);
  assert.match(index, /<GreenhouseButton/);
});

test('greenhouse scene expansion is driven by the shared memory model', () => {
  const scene = read('src/scene/GreenhouseScene.tsx');
  const greenhouse = read('src/scene/objects/Greenhouse.tsx');
  const route = read('src/app/greenhouse.tsx');
  assert.match(scene, /getGreenhouseBayCount\(memoryCount\)/);
  assert.match(greenhouse, /key=\{`\$\{bayCount\}-\$\{memoryCount\}`\}/);
  assert.match(greenhouse, /for \(let index = 0; index < memoryCount/);
  assert.match(route, /createGreenhousePreviewMemory\(current\.length\)/);
  assert.match(route, /onAccessibilityActivate=\{null\}/);
});
