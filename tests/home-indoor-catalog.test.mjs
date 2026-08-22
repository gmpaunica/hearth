import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('the first indoor pack registers all 32 authored silhouettes', () => {
  const catalog = read('src/home/catalog.ts');
  const renderer = read('src/scene/objects/IndoorCatalogObject.tsx');
  const ids = [
    'cottage-wardrobe', 'paneled-armoire', 'clothes-rail', 'low-cubby', 'blanket-chest',
    'reading-chair', 'rocking-chair', 'pouf', 'side-table', 'narrow-bench',
    'teddy-bear', 'trophy-cup', 'rosette', 'couple-statuette', 'animal-figurine',
    'snow-globe', 'travel-trunk', 'shell-jar', 'book-stack', 'botanical-print',
    'landscape-print', 'heart-print', 'memory-frame', 'tall-mirror', 'table-lamp',
    'floor-lamp', 'lantern', 'round-rug', 'runner', 'cushion-basket', 'flower-vase',
    'potted-fern',
  ];
  for (const id of ids) assert.match(catalog, new RegExp(`['"]${id}['"]`));
  for (const id of ids.filter((id) => id !== 'potted-fern')) {
    assert.match(renderer, new RegExp(`['"]${id}['"]`));
  }
  assert.match(catalog, /renderer: 'IndoorCatalog'/);
  assert.match(renderer, /cacheKey=/);
});

test('curated palettes and layered placement feed visible restyling', () => {
  const palettes = read('src/home/palettes.ts');
  const studio = read('src/components/HomeStudio.tsx');
  const editor = read('src/home/editor.ts');
  const resolver = read('src/home/resolver.ts');
  for (const slot of ['wood', 'fabric', 'wall', 'floor', 'metal', 'stone', 'flower', 'foliage', 'terrain']) {
    assert.match(palettes, new RegExp(`\\b${slot}: \\[`));
  }
  assert.match(studio, /paletteChoices\(slot\)/);
  assert.match(studio, /type: 'restyle'/);
  assert.match(editor, /attachmentSocket: placement|attachmentSocket/);
  assert.match(editor, /progression\.walkable === true/);
  assert.match(resolver, /object\.surface !== 'wall'/);
});

test('relationship-gated Decorate mode is distinct from public Developer Studio', () => {
  const button = read('src/components/DecorateButton.tsx');
  const studio = read('src/components/HomeStudio.tsx');
  const store = read('src/state/homeStudioStore.ts');
  const index = read('src/app/index.tsx');
  assert.match(index, /<DecorateButton \/>/);
  assert.match(button, /open\('decorate'\)/);
  assert.match(store, /HomeStudioMode = 'developer' \| 'decorate'/);
  assert.match(studio, /daysTogether\(draft\.pairedAt\)/);
  assert.match(studio, /Number\(asset\.progression\.day \?\? 0\) > unlockedDays/);
  assert.match(studio, /isDeveloper \? 'Every registered piece' : 'Unlocked pieces'/);
});
