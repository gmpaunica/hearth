import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('catalog v4 adds reviewed fireplace and bedroom upgrade silhouettes', () => {
  const catalog = read('src/home/catalog.ts');
  const renderer = read('src/scene/objects/BedroomCatalogObject.tsx');
  const ids = [
    'carved-stone-fireplace', 'grand-hearth-fireplace',
    'cottage-double-bed', 'four-poster-bed', 'bedroom-settee',
    'slipper-chair', 'bedroom-writing-table', 'oak-double-wardrobe', 'linen-press',
  ];
  for (const id of ids) assert.match(catalog, new RegExp(`['"]${id}['"]`));
  for (const id of ids.slice(2)) assert.match(renderer, new RegExp(`['"]${id}['"]`));
  assert.match(catalog, /HOME_CATALOG_VERSION = 'home-catalog-v4'/);
  assert.match(catalog, /HOME_UPGRADE_ASSETS/);
});

test('replacement beds, seating, tables, and hearths preserve required roles and rigs', () => {
  const catalog = read('src/home/catalog.ts');
  assert.match(catalog, /carved-stone-fireplace[\s\S]*role: 'fireplace'/);
  assert.match(catalog, /cottage-double-bed[\s\S]*role: 'romantic_rest_location'/);
  assert.match(catalog, /bedroom-settee[\s\S]*role: 'conversation_seating'/);
  assert.match(catalog, /bedroom-writing-table[\s\S]*role: 'shared_table'/);
  assert.match(catalog, /CENTERED_BED_RIG/);
  assert.match(catalog, /CENTERED_SETTEE_RIG/);
  assert.match(catalog, /CENTERED_TABLE_RIG/);
});

test('fireplace body tiers and palettes do not own the emotional flame state', () => {
  const fireplace = read('src/scene/objects/Fireplace.tsx');
  const homeRenderer = read('src/scene/HomeObjectRenderer.tsx');
  assert.match(fireplace, /if \(tier >= 2\)/);
  assert.match(fireplace, /if \(tier >= 3\)/);
  assert.match(fireplace, /<Fire position=/);
  assert.match(fireplace, /<EmberColumn position=/);
  assert.match(fireplace, /paletteColor\(style, 'stone'/);
  assert.match(homeRenderer, /object\.definition\.progression\.tier/);
  assert.match(homeRenderer, /case 'BedroomCatalog'/);
});
