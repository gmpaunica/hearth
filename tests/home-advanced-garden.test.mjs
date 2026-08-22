import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('catalog v5 adds grand landmarks, architecture, sculpture, and seasonal planting', () => {
  const catalog = read('src/home/catalog.ts');
  const renderer = read('src/scene/objects/GardenCatalogObject.tsx');
  const ids = [
    'rose-gazebo', 'stone-pergola', 'moon-gate-sculpture', 'dove-garden-sculpture',
    'spring-tulip-bed', 'summer-sunflower-bed', 'autumn-mum-bed', 'winter-holly-planter',
  ];
  for (const id of ids) {
    assert.match(catalog, new RegExp(`['"]${id}['"]`));
    assert.match(renderer, new RegExp(`['"]${id}['"]`));
  }
  assert.match(catalog, /HOME_CATALOG_VERSION = 'home-catalog-v5'/);
  assert.match(catalog, /style_variants: 'cottage,brass,forest'/);
});

test('both KoiPond sizes use the specialized fish renderer and water palette', () => {
  const gardenCatalog = read('src/scene/objects/GardenCatalogObject.tsx');
  const homeRenderer = read('src/scene/HomeObjectRenderer.tsx');
  const garden = read('src/scene/rooms/Garden.tsx');
  assert.match(gardenCatalog, /object\.assetId === 'koi-pond-large'/);
  assert.match(gardenCatalog, /<KoiPond waterColor=\{colors\.water\}/);
  assert.match(homeRenderer, /case 'KoiPond'[\s\S]*waterColor=\{paletteColor/);
  assert.match(garden, /uWaterTint/);
  assert.match(garden, /const t = atmo\.reduceMotion \? 0/);
});

test('fountains, lights, foliage, chimes, and greenhouse styling respect accessibility', () => {
  const effects = read('src/scene/objects/GardenCatalogObject.tsx');
  const plant = read('src/scene/objects/Plant.tsx');
  const greenhouse = read('src/scene/objects/GardenGreenhousePortal.tsx');
  assert.match(effects, /function FountainSpray/);
  assert.match(effects, /function GardenLightGlow/);
  assert.match(effects, /object\.assetId === 'wind-chime'/);
  assert.match(effects, /atmo\.reduceMotion/);
  assert.match(plant, /if \(atmo\.reduceMotion\)/);
  assert.match(greenhouse, /style\.variant/);
  assert.match(greenhouse, /paletteColor\(style, 'wood'/);
  assert.match(greenhouse, /cacheKey=\{`greenhouse:/);
});

test('standard, large, and grand masks drive the visible platform, walking, and camera', () => {
  const garden = read('src/scene/rooms/Garden.tsx');
  const resolver = read('src/home/resolver.ts');
  assert.match(garden, /x0: -17, x1: 14, z0: -18, z1: 14/);
  assert.match(garden, /x0: -33, x1: 14, z0: -25, z1: 21/);
  assert.match(garden, /x0: -45, x1: 14, z0: -33, z1: 29/);
  assert.match(resolver, /zone\.id === 'garden-floor'/);
  assert.match(resolver, /room\.bounds\.minX \+ 0\.49/);
  assert.match(resolver, /\(room\.bounds\.minX \+ room\.bounds\.maxX\) \/ 2/);
});
