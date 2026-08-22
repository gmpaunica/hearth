import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const GARDEN_IDS = [
  'straight-path', 'corner-path', 'junction-path', 'stepping-stones', 'gravel-patch', 'patio-tile', 'low-fence', 'garden-gate',
  'round-flower-bed', 'long-flower-bed', 'rose-bush', 'hydrangea', 'lavender', 'hedge', 'topiary', 'planter-pot', 'planter-box', 'fern-cluster',
  'fruit-tree', 'blossom-tree', 'willow', 'small-evergreen', 'raised-vegetable-bed',
  'garden-bench', 'bistro-table', 'bistro-chair', 'lounge-chair', 'picnic-blanket', 'swing-bench', 'garden-stool',
  'trellis-arch', 'pergola', 'gazebo', 'potting-bench', 'tool-shed', 'greenhouse-portal',
  'birdbath', 'small-pond', 'koi-pond-medium', 'koi-pond-large', 'fountain',
  'garden-lantern', 'string-light-set', 'ground-light', 'stone-statue', 'sundial', 'birdhouse', 'wind-chime', 'watering-can', 'wheelbarrow', 'garden-gnome', 'scarecrow',
];

test('the garden is a first-class 52-component catalog', () => {
  const catalog = read('src/home/catalog.ts');
  const renderer = read('src/scene/objects/GardenCatalogObject.tsx');
  assert.equal(GARDEN_IDS.length, 52);
  for (const id of GARDEN_IDS) assert.match(catalog, new RegExp(`['"]${id}['"]`));
  for (const id of GARDEN_IDS.filter((id) => ![
    'rose-bush', 'blossom-tree', 'garden-bench', 'greenhouse-portal',
    'koi-pond-medium', 'garden-lantern',
  ].includes(id))) assert.match(renderer, new RegExp(`['"]${id}['"]`));
  assert.match(catalog, /HOME_CATALOG_VERSION = 'home-catalog-v4'/);
  assert.match(catalog, /GARDEN_HOME_ASSETS/);
});

test('garden placement enforces connected paths, clear canopies, and water limits', () => {
  const editor = read('src/home/editor.ts');
  const catalog = read('src/home/catalog.ts');
  assert.match(editor, /path_disconnected/);
  assert.match(editor, /one route from the house threshold/);
  assert.match(editor, /canopy_occlusion/);
  assert.match(editor, /gardenTier === 'grand' \? 2/);
  assert.match(catalog, /path_connector: true/);
  assert.match(catalog, /major_water: true/);
  assert.match(catalog, /style_variants: 'low,tall'/);
});

test('normal Decorate mode reveals the Garden tray only at the garden milestone', () => {
  const studio = read('src/components/HomeStudio.tsx');
  assert.match(studio, /candidate\.id === 'garden'/);
  assert.match(studio, /growthDays >= 30/);
  assert.match(studio, /selectedVariants/);
});
