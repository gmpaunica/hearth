import type { ResolvedHomeObject } from '@/home/types';
import { paletteColor } from '@/home/palettes';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

type GardenColors = ReturnType<typeof colorsFor>;

function colorsFor(style: Readonly<Record<string, unknown>>) {
  return {
    wood: paletteColor(style, 'wood', '#8c6444'),
    woodDark: '#574334',
    fabric: paletteColor(style, 'fabric', '#b87473'),
    metal: paletteColor(style, 'metal', '#81776a'),
    stone: paletteColor(style, 'stone', '#a49c8d'),
    stoneDark: '#77766e',
    flower: paletteColor(style, 'flower', '#d17c91'),
    foliage: paletteColor(style, 'foliage', '#58745a'),
    foliageLight: '#7f966b',
    terrain: paletteColor(style, 'terrain', '#7f966b'),
    water: paletteColor(style, 'water', '#6ba8b4'),
    glass: '#a8c7c5',
    light: '#f4cb72',
    dark: '#493d3a',
    cream: '#e8d5b2',
  };
}

function fourLegs(v: Vox, width: number, depth: number, height: number, color: string) {
  v.box(0, 0, 0, 1, height, 1, color).box(width - 1, 0, 0, 1, height, 1, color);
  v.box(0, 0, depth - 1, 1, height, 1, color).box(width - 1, 0, depth - 1, 1, height, 1, color);
}

function flowers(v: Vox, width: number, depth: number, c: GardenColors, startY = 1) {
  for (let x = 1; x < width; x += 3) {
    for (let z = 1; z < depth; z += 3) {
      v.box(x, startY, z, 1, 2, 1, c.foliage).set(x, startY + 2, z, (x + z) % 2 ? c.flower : c.cream);
    }
  }
}

function leafyTree(v: Vox, c: GardenColors, droop = false, fruit = false) {
  v.box(5, 0, 5, 3, 15, 3, c.wood).box(3, 8, 5, 7, 2, 3, c.woodDark);
  if (droop) {
    v.box(0, 10, 1, 13, 5, 11, c.foliage);
    v.box(0, 6, 1, 2, 7, 2, c.foliageLight).box(11, 5, 8, 2, 8, 2, c.foliage);
  } else {
    v.box(1, 10, 2, 11, 6, 9, c.foliage).box(3, 15, 4, 7, 3, 5, c.foliageLight);
  }
  if (fruit) for (const [x, y, z] of [[2, 13, 4], [9, 14, 7], [5, 16, 3], [7, 12, 9]]) v.set(x, y, z, c.flower);
}

function pond(v: Vox, width: number, depth: number, c: GardenColors) {
  v.box(0, 0, 0, width, 1, depth, c.stoneDark).box(1, 1, 1, width - 2, 1, depth - 2, c.water);
  for (let x = 0; x < width; x += 2) v.set(x, 1, 0, c.stone).set(x, 1, depth - 1, c.stone);
  for (let z = 1; z < depth - 1; z += 2) v.set(0, 1, z, c.stone).set(width - 1, 1, z, c.stone);
}

function buildGarden(v: Vox, object: ResolvedHomeObject, c: GardenColors) {
  switch (object.assetId) {
    case 'straight-path':
      v.box(1, 0, 0, 6, 1, 8, c.stone).box(2, 1, 0, 4, 1, 8, c.stoneDark);
      break;
    case 'corner-path':
      v.box(1, 0, 0, 6, 1, 8, c.stone).box(1, 0, 2, 8, 1, 6, c.stone).box(2, 1, 1, 4, 1, 5, c.stoneDark);
      break;
    case 'junction-path':
      v.box(2, 0, 0, 5, 1, 9, c.stone).box(0, 0, 2, 9, 1, 5, c.stone).box(3, 1, 0, 3, 1, 9, c.stoneDark);
      break;
    case 'stepping-stones':
      v.box(2, 0, 0, 4, 1, 2, c.stone).box(1, 0, 3, 5, 1, 2, c.stoneDark).box(3, 0, 6, 4, 1, 2, c.stone);
      break;
    case 'gravel-patch':
      v.box(0, 0, 0, 10, 1, 10, c.terrain); for (let i = 0; i < 22; i++) v.set((i * 7) % 10, 1, (i * 3) % 10, i % 2 ? c.stone : c.stoneDark);
      break;
    case 'patio-tile':
      v.box(0, 0, 0, 10, 1, 10, c.stone); for (let x = 0; x < 10; x += 5) v.box(x, 1, 0, 1, 1, 10, c.stoneDark); for (let z = 0; z < 10; z += 5) v.box(0, 1, z, 10, 1, 1, c.stoneDark);
      break;
    case 'low-fence':
      v.box(0, 0, 1, 1, 6, 1, c.woodDark).box(11, 0, 1, 1, 6, 1, c.woodDark).box(0, 2, 1, 12, 1, 1, c.wood).box(0, 5, 1, 12, 1, 1, c.wood);
      break;
    case 'garden-gate':
      v.box(0, 0, 1, 1, 10, 1, c.woodDark).box(11, 0, 1, 1, 10, 1, c.woodDark).box(1, 1, 1, 10, 7, 1, c.wood).remove(2, 2, 1, 8, 4, 1).box(2, 3, 1, 8, 1, 1, c.metal);
      break;
    case 'round-flower-bed':
      v.box(2, 0, 0, 7, 2, 11, c.stone).box(0, 0, 2, 11, 2, 7, c.stone).box(2, 1, 2, 7, 2, 7, c.terrain); flowers(v, 10, 10, c, 2);
      break;
    case 'long-flower-bed':
      v.box(0, 0, 0, 16, 2, 6, c.stone).box(1, 1, 1, 14, 2, 4, c.terrain); flowers(v, 15, 5, c, 2);
      break;
    case 'hydrangea':
      v.box(3, 0, 3, 2, 5, 2, c.wood); v.box(0, 3, 0, 8, 5, 7, c.foliage); for (const p of [[1, 7, 1], [4, 8, 2], [6, 6, 5], [2, 5, 5]]) v.box(p[0], p[1], p[2], 2, 2, 2, c.flower);
      break;
    case 'lavender':
      for (let x = 0; x < 7; x += 2) for (let z = 0; z < 5; z += 2) v.box(x, 0, z, 1, 5 + ((x + z) % 2), 1, c.foliage).set(x, 5 + ((x + z) % 2), z, c.flower);
      break;
    case 'hedge':
      v.box(0, 0, 0, 13, 7, 4, c.foliage).box(1, 7, 1, 11, 2, 2, c.foliageLight);
      break;
    case 'topiary':
      v.box(2, 0, 2, 3, 4, 3, c.stone).box(3, 4, 3, 1, 7, 1, c.wood).box(0, 7, 0, 7, 6, 7, c.foliage).box(1, 13, 1, 5, 4, 5, c.foliageLight);
      break;
    case 'planter-pot':
      v.box(0, 0, 0, 5, 4, 5, c.stone).box(1, 3, 1, 3, 2, 3, c.terrain); flowers(v, 5, 5, c, 4);
      break;
    case 'planter-box':
      v.box(0, 0, 0, 11, 4, 4, c.wood).box(1, 3, 1, 9, 2, 2, c.terrain); flowers(v, 10, 4, c, 4);
      break;
    case 'fern-cluster':
      for (let x = 1; x < 8; x += 2) for (let z = 1; z < 7; z += 2) { v.box(x, 0, z, 1, 4, 1, c.foliage); v.set(x - 1, 3, z, c.foliageLight).set(x + 1, 2, z, c.foliage); }
      break;
    case 'fruit-tree': leafyTree(v, c, false, true); break;
    case 'willow': leafyTree(v, c, true, false); break;
    case 'small-evergreen':
      v.box(4, 0, 4, 2, 8, 2, c.wood); v.box(1, 3, 1, 8, 4, 8, c.foliage).box(2, 7, 2, 6, 4, 6, c.foliageLight).box(3, 11, 3, 4, 4, 4, c.foliage);
      break;
    case 'raised-vegetable-bed':
      v.box(0, 0, 0, 14, 4, 8, c.wood).box(1, 3, 1, 12, 2, 6, c.terrain); for (let x = 2; x < 13; x += 3) v.box(x, 5, 2, 1, 3, 4, c.foliage);
      break;
    case 'bistro-table':
      v.box(3, 0, 3, 2, 6, 2, c.metal).box(0, 6, 0, 8, 1, 8, c.wood).box(1, 0, 1, 6, 1, 6, c.metal);
      break;
    case 'bistro-chair':
      fourLegs(v, 5, 5, 3, c.metal); v.box(0, 3, 0, 5, 1, 5, c.wood).box(0, 4, 0, 5, 5, 1, c.metal).box(1, 5, 0, 3, 2, 1, c.fabric);
      break;
    case 'lounge-chair':
      v.box(0, 1, 0, 7, 2, 12, c.wood).box(1, 3, 1, 5, 1, 10, c.fabric).box(0, 3, 0, 7, 7, 2, c.wood).box(1, 4, 1, 5, 5, 1, c.fabric);
      break;
    case 'picnic-blanket':
      v.box(0, 0, 0, 13, 1, 11, c.fabric); for (let x = 1; x < 13; x += 4) v.box(x, 1, 0, 2, 1, 11, c.cream); for (let z = 2; z < 11; z += 4) v.box(0, 1, z, 13, 1, 2, c.cream);
      break;
    case 'swing-bench':
      v.box(0, 0, 1, 1, 16, 1, c.woodDark).box(14, 0, 1, 1, 16, 1, c.woodDark).box(0, 15, 1, 15, 1, 1, c.wood);
      v.box(3, 5, 1, 9, 2, 7, c.wood).box(4, 7, 1, 7, 5, 1, c.fabric).box(3, 7, 1, 1, 7, 1, c.metal).box(11, 7, 1, 1, 7, 1, c.metal);
      break;
    case 'garden-stool':
      fourLegs(v, 5, 5, 4, c.woodDark); v.box(0, 4, 0, 5, 2, 5, c.stone);
      break;
    case 'trellis-arch':
      v.box(0, 0, 1, 2, 16, 2, c.wood).box(11, 0, 1, 2, 16, 2, c.wood).box(0, 14, 1, 13, 2, 2, c.wood);
      for (let y = 3; y < 14; y += 4) v.box(0, y, 0, 2, 1, 4, c.foliage).box(11, y + 1, 0, 2, 1, 4, c.flower);
      break;
    case 'pergola':
      fourLegs(v, 20, 15, 16, c.woodDark); for (let x = 0; x < 20; x += 4) v.box(x, 15, 0, 2, 1, 15, c.wood); for (let z = 0; z < 15; z += 5) v.box(0, 16, z, 20, 1, 1, c.foliage);
      break;
    case 'gazebo':
      fourLegs(v, 22, 20, 16, c.woodDark); v.box(0, 0, 0, 22, 1, 20, c.stone);
      v.box(2, 16, 2, 18, 1, 16, c.wood).box(5, 17, 5, 12, 2, 10, c.fabric).box(8, 19, 7, 6, 2, 6, c.fabric);
      break;
    case 'potting-bench':
      fourLegs(v, 12, 6, 6, c.woodDark); v.box(0, 6, 0, 12, 2, 6, c.wood).box(0, 8, 0, 1, 5, 1, c.wood).box(11, 8, 0, 1, 5, 1, c.wood).box(0, 12, 0, 12, 1, 4, c.wood).set(3, 8, 2, c.stone).set(8, 8, 3, c.foliage);
      break;
    case 'tool-shed':
      v.box(0, 0, 0, 17, 15, 13, c.wood).box(-1, 15, -1, 19, 2, 15, c.woodDark).box(6, 0, 13, 6, 11, 1, c.woodDark).set(10, 5, 14, c.metal).box(1, 7, 13, 4, 4, 1, c.glass);
      break;
    case 'birdbath':
      v.box(2, 0, 2, 5, 2, 5, c.stoneDark).box(4, 2, 4, 1, 6, 1, c.stone).box(0, 8, 0, 9, 2, 9, c.stone).box(1, 9, 1, 7, 1, 7, c.water).set(4, 10, 4, c.dark);
      break;
    case 'small-pond': pond(v, 15, 10, c); break;
    case 'koi-pond-large':
      pond(v, 28, 19, c); v.box(6, 2, 7, 4, 1, 1, c.flower).box(18, 2, 11, 5, 1, 1, c.cream).box(13, 2, 4, 3, 1, 1, c.light);
      break;
    case 'fountain': {
      const tall = object.style.variant === 'tall';
      v.box(0, 0, 0, 15, 2, 15, c.stoneDark).box(1, 2, 1, 13, 1, 13, c.water).box(5, 2, 5, 5, tall ? 13 : 7, 5, c.stone);
      v.box(3, tall ? 13 : 7, 3, 9, 2, 9, c.stoneDark).box(4, tall ? 14 : 8, 4, 7, 1, 7, c.water).set(7, tall ? 18 : 12, 7, c.water);
      break;
    }
    case 'string-light-set':
      v.box(0, 0, 0, 1, 16, 1, c.wood).box(18, 0, 0, 1, 16, 1, c.wood).box(0, 15, 0, 19, 1, 1, c.metal); for (let x = 2; x < 18; x += 3) v.set(x, 14, 0, c.light);
      break;
    case 'ground-light':
      v.box(0, 0, 0, 4, 2, 4, c.stone).box(1, 2, 1, 2, 1, 2, c.light);
      break;
    case 'stone-statue':
      v.box(0, 0, 0, 7, 2, 6, c.stoneDark).box(2, 2, 2, 3, 8, 3, c.stone).box(1, 7, 2, 5, 2, 3, c.stone).set(2, 10, 2, c.stone).set(4, 10, 2, c.stone);
      break;
    case 'sundial':
      v.box(0, 0, 0, 7, 2, 7, c.stone).box(3, 2, 3, 1, 6, 1, c.stoneDark).box(0, 8, 0, 7, 1, 7, c.metal).box(3, 9, 1, 1, 4, 1, c.metal);
      break;
    case 'birdhouse':
      v.box(2, 0, 2, 1, 10, 1, c.woodDark).box(0, 9, 0, 5, 5, 5, c.wood).box(-1, 13, -1, 7, 2, 7, c.fabric).set(2, 11, 5, c.dark);
      break;
    case 'wind-chime':
      v.box(0, 10, 0, 7, 1, 7, c.wood).box(3, 11, 3, 1, 3, 1, c.metal); for (let x = 1; x < 7; x += 2) v.box(x, 2 + x % 3, 3, 1, 8, 1, c.metal); v.set(3, 0, 3, c.fabric);
      break;
    case 'watering-can':
      v.box(2, 0, 0, 6, 5, 5, c.metal).box(0, 2, 1, 3, 2, 2, c.metal).box(7, 4, 1, 4, 1, 3, c.metal).box(4, 5, 1, 3, 3, 1, c.flower);
      break;
    case 'wheelbarrow':
      v.box(3, 3, 0, 8, 4, 6, c.metal).box(0, 0, 1, 4, 4, 4, c.dark).box(10, 1, 1, 5, 1, 1, c.wood).box(10, 1, 4, 5, 1, 1, c.wood).box(5, 7, 2, 2, 2, 2, c.flower);
      break;
    case 'garden-gnome':
      v.box(1, 0, 1, 4, 4, 3, c.fabric).box(1, 4, 1, 4, 3, 3, c.cream).box(0, 6, 0, 6, 2, 5, c.fabric).box(2, 8, 1, 2, 3, 2, c.fabric).set(2, 6, 4, c.dark).set(3, 6, 4, c.dark);
      break;
    case 'scarecrow':
      v.box(5, 0, 2, 2, 16, 2, c.woodDark).box(0, 10, 2, 12, 2, 2, c.wood).box(2, 8, 1, 8, 6, 4, c.fabric).box(4, 14, 1, 4, 4, 4, c.cream).box(2, 17, 0, 8, 2, 6, c.fabric);
      break;
    default:
      v.box(0, 0, 0, 6, 6, 6, c.foliage).set(2, 6, 2, c.flower);
  }
}

export function GardenCatalogObject({ object }: { object: ResolvedHomeObject }) {
  const colors = colorsFor(object.style);
  const flat = ['straight-path', 'corner-path', 'junction-path', 'stepping-stones', 'gravel-patch', 'patio-tile', 'picnic-blanket'].includes(object.assetId);
  return (
    <VoxMesh
      build={(vox) => buildGarden(vox, object, colors)}
      cacheKey={`${object.assetId}:${JSON.stringify(object.style)}`}
      scale={0.12}
      position={[-object.definition.footprint.width / 2, flat ? 0.01 : 0, -object.definition.footprint.depth / 2]}
      meshScale={flat ? [1, 0.24, 1] : undefined}
    />
  );
}
