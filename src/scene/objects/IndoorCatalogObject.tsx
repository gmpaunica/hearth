import type { ResolvedHomeObject } from '@/home/types';
import { paletteColor } from '@/home/palettes';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

type Colors = ReturnType<typeof colorsFor>;

function colorsFor(style: Readonly<Record<string, unknown>>) {
  return {
    wood: paletteColor(style, 'wood', '#94613f'),
    woodDark: '#5d3d30',
    fabric: paletteColor(style, 'fabric', '#bd7b76'),
    fabricLight: '#dfb8aa',
    metal: paletteColor(style, 'metal', '#9b8059'),
    stone: paletteColor(style, 'stone', '#aaa397'),
    flower: paletteColor(style, 'flower', '#d27c92'),
    foliage: paletteColor(style, 'foliage', '#56735a'),
    glass: paletteColor(style, 'glass', '#a8c7c5'),
    paper: paletteColor(style, 'paper', '#ead9bd'),
    dark: '#493b38',
    light: '#f1d7ad',
  };
}

function legs(v: Vox, width: number, depth: number, height: number, color: string) {
  v.box(0, 0, 0, 1, height, 1, color);
  v.box(width - 1, 0, 0, 1, height, 1, color);
  v.box(0, 0, depth - 1, 1, height, 1, color);
  v.box(width - 1, 0, depth - 1, 1, height, 1, color);
}

function frame(v: Vox, width: number, height: number, c: Colors, art: string) {
  v.box(0, 0, 0, width, 1, 1, c.woodDark);
  v.box(0, height - 1, 0, width, 1, 1, c.wood);
  v.box(0, 0, 0, 1, height, 1, c.wood);
  v.box(width - 1, 0, 0, 1, height, 1, c.woodDark);
  v.box(1, 1, 0, width - 2, height - 2, 1, art);
}

function buildIndoor(v: Vox, id: string, c: Colors) {
  switch (id) {
    case 'cottage-wardrobe':
      v.box(0, 0, 0, 7, 12, 4, c.wood).box(-1, 12, -1, 9, 1, 6, c.woodDark);
      v.box(1, 1, 4, 2, 9, 1, '#b68159').box(4, 1, 4, 2, 9, 1, '#b68159');
      v.set(2, 6, 5, c.metal).set(4, 6, 5, c.metal);
      break;
    case 'paneled-armoire':
      v.box(0, 1, 0, 8, 11, 5, c.woodDark).box(-1, 0, -1, 10, 1, 7, c.wood);
      v.box(-1, 12, -1, 10, 1, 7, c.wood);
      v.box(1, 2, 5, 2, 8, 1, c.wood).box(5, 2, 5, 2, 8, 1, c.wood);
      v.box(3, 2, 5, 2, 8, 1, '#744a36').set(2, 6, 6, c.metal).set(5, 6, 6, c.metal);
      break;
    case 'clothes-rail':
      v.box(0, 0, 1, 1, 11, 1, c.metal).box(8, 0, 1, 1, 11, 1, c.metal).box(0, 10, 1, 9, 1, 1, c.metal);
      v.box(-1, 0, 0, 3, 1, 4, c.wood).box(7, 0, 0, 3, 1, 4, c.wood);
      v.box(2, 7, 1, 2, 3, 1, c.fabric).box(4, 6, 1, 2, 4, 1, c.fabricLight).box(6, 7, 1, 2, 3, 1, c.fabric);
      break;
    case 'low-cubby':
      v.box(0, 0, 0, 9, 5, 4, c.wood).remove(1, 1, 3, 3, 3, 2).remove(5, 1, 3, 3, 3, 2);
      v.box(1, 1, 2, 3, 2, 2, c.fabric).box(5, 1, 2, 3, 2, 2, c.fabricLight);
      break;
    case 'blanket-chest':
      v.box(0, 0, 0, 7, 4, 4, c.woodDark).box(-1, 4, -1, 9, 1, 6, c.wood);
      v.box(1, 1, 4, 5, 2, 1, c.wood).set(3, 2, 5, c.metal);
      break;
    case 'reading-chair':
      legs(v, 6, 6, 2, c.woodDark); v.box(0, 2, 0, 6, 2, 6, c.fabric);
      v.box(0, 4, 0, 1, 5, 6, c.wood).box(5, 4, 0, 1, 5, 6, c.woodDark).box(1, 4, 0, 4, 5, 2, c.fabricLight);
      break;
    case 'rocking-chair':
      v.box(-1, 0, 0, 8, 1, 1, c.woodDark).box(-1, 0, 6, 8, 1, 1, c.woodDark);
      v.box(0, 1, 1, 1, 8, 1, c.wood).box(5, 1, 1, 1, 8, 1, c.wood);
      v.box(0, 3, 1, 6, 2, 5, c.fabric).box(1, 5, 1, 4, 5, 1, c.fabricLight);
      break;
    case 'pouf':
      v.box(1, 0, 0, 4, 3, 6, c.fabric).box(0, 0, 1, 6, 3, 4, c.fabric);
      v.box(1, 3, 1, 4, 1, 4, c.fabricLight);
      break;
    case 'side-table':
      legs(v, 5, 5, 4, c.woodDark); v.box(-1, 4, -1, 7, 1, 7, c.wood).set(2, 5, 2, c.metal);
      break;
    case 'narrow-bench':
      legs(v, 9, 4, 3, c.woodDark); v.box(0, 3, 0, 9, 2, 4, c.wood).box(1, 5, 0, 7, 1, 4, c.fabric);
      break;
    case 'teddy-bear':
      v.box(1, 0, 1, 2, 3, 2, c.fabric).box(0, 1, 1, 1, 2, 2, c.fabric).box(3, 1, 1, 1, 2, 2, c.fabric);
      v.box(1, 3, 1, 2, 2, 2, c.fabricLight).set(0, 4, 1, c.fabric).set(3, 4, 1, c.fabric);
      v.set(1, 4, 3, c.dark).set(2, 4, 3, c.dark).set(1, 0, 0, c.fabric).set(2, 0, 0, c.fabric);
      break;
    case 'trophy-cup':
      v.box(1, 0, 1, 3, 1, 3, c.woodDark).box(2, 1, 2, 1, 3, 1, c.metal).box(1, 4, 1, 3, 2, 3, c.metal);
      v.box(0, 4, 1, 1, 1, 3, c.metal).box(4, 4, 1, 1, 1, 3, c.metal).remove(2, 5, 2);
      break;
    case 'rosette':
      v.box(1, 0, 0, 1, 4, 1, c.fabric).box(3, 0, 0, 1, 4, 1, c.fabricLight);
      v.box(0, 3, 0, 5, 3, 1, c.fabric).set(2, 4, 1, c.metal);
      break;
    case 'couple-statuette':
      v.box(0, 0, 0, 5, 1, 3, c.woodDark).box(1, 1, 1, 1, 4, 1, c.stone).box(3, 1, 1, 1, 4, 1, c.stone);
      v.set(1, 5, 1, c.light).set(3, 5, 1, c.light).set(2, 3, 1, c.metal);
      break;
    case 'animal-figurine':
      v.box(1, 1, 0, 4, 2, 2, c.stone).box(4, 2, 0, 2, 2, 2, c.stone);
      v.set(4, 4, 0, c.stone).set(5, 4, 0, c.stone).set(5, 3, 2, c.dark);
      v.set(1, 0, 0, c.woodDark).set(4, 0, 0, c.woodDark);
      break;
    case 'snow-globe':
      v.box(0, 0, 0, 5, 2, 5, c.woodDark).box(1, 2, 1, 3, 3, 3, c.glass);
      v.set(2, 3, 2, c.flower).set(2, 5, 2, c.glass).set(1, 4, 2, c.glass).set(3, 4, 2, c.glass);
      break;
    case 'travel-trunk':
      v.box(0, 0, 0, 8, 4, 5, c.wood).box(0, 3, 0, 8, 2, 5, c.fabric);
      v.box(1, 0, 5, 1, 5, 1, c.metal).box(6, 0, 5, 1, 5, 1, c.metal).set(3, 2, 6, c.metal).set(4, 2, 6, c.metal);
      break;
    case 'shell-jar':
      v.box(1, 0, 1, 3, 1, 3, c.stone).box(0, 1, 0, 5, 4, 5, c.glass).box(1, 5, 1, 3, 1, 3, c.woodDark);
      v.set(1, 2, 2, c.paper).set(3, 2, 1, c.paper).set(2, 3, 3, c.paper);
      break;
    case 'book-stack':
      v.box(0, 0, 0, 6, 1, 4, c.fabric).box(1, 1, 0, 5, 1, 4, c.paper).box(0, 2, 1, 6, 1, 3, c.woodDark);
      break;
    case 'botanical-print':
      frame(v, 7, 9, c, c.paper); v.box(3, 2, 1, 1, 5, 1, c.foliage).set(2, 4, 1, c.foliage).set(4, 5, 1, c.foliage);
      break;
    case 'landscape-print':
      frame(v, 10, 7, c, '#9db4b0'); v.box(1, 1, 1, 8, 2, 1, c.foliage).box(5, 3, 1, 3, 2, 1, c.stone).set(2, 5, 1, c.light);
      break;
    case 'heart-print':
      frame(v, 6, 8, c, c.paper); v.box(2, 3, 1, 2, 3, 1, c.fabric).set(1, 5, 1, c.fabric).set(4, 5, 1, c.fabric).set(2, 2, 1, c.fabric);
      break;
    case 'memory-frame':
      frame(v, 6, 7, c, c.paper); v.box(2, 2, 1, 2, 3, 1, c.fabricLight).set(4, 1, 1, c.metal);
      break;
    case 'tall-mirror':
      frame(v, 6, 13, c, c.glass); v.box(2, 2, 1, 2, 9, 1, '#c9dcda').set(1, 11, 1, c.light);
      break;
    case 'table-lamp':
      v.box(1, 0, 1, 3, 1, 3, c.metal).box(2, 1, 2, 1, 4, 1, c.metal);
      v.box(0, 4, 0, 5, 3, 5, c.fabric).remove(0, 4, 0).remove(4, 4, 4);
      break;
    case 'floor-lamp':
      v.box(0, 0, 0, 5, 1, 5, c.metal).box(2, 1, 2, 1, 9, 1, c.metal);
      v.box(0, 9, 0, 5, 4, 5, c.fabric).remove(0, 9, 0).remove(4, 9, 4);
      break;
    case 'lantern':
      v.box(0, 0, 0, 5, 1, 5, c.metal).box(0, 5, 0, 5, 1, 5, c.metal);
      v.box(0, 1, 0, 1, 4, 1, c.metal).box(4, 1, 4, 1, 4, 1, c.metal).box(1, 1, 1, 3, 4, 3, c.glass);
      v.set(2, 2, 2, c.light).box(1, 6, 2, 3, 1, 1, c.metal);
      break;
    case 'round-rug':
      v.box(2, 0, 0, 7, 1, 11, c.fabric).box(0, 0, 2, 11, 1, 7, c.fabric);
      v.box(2, 1, 2, 7, 1, 7, c.fabricLight).box(4, 1, 0, 3, 1, 11, c.fabricLight);
      break;
    case 'runner':
      v.box(0, 0, 0, 6, 1, 16, c.fabric).box(1, 1, 1, 4, 1, 14, c.fabricLight);
      for (let z = 2; z < 15; z += 4) v.box(1, 1, z, 4, 1, 1, c.fabric);
      break;
    case 'cushion-basket':
      v.box(0, 0, 0, 6, 4, 5, c.wood).remove(1, 2, 1, 4, 3, 3);
      v.box(1, 2, 1, 2, 3, 3, c.fabric).box(3, 2, 1, 2, 2, 3, c.fabricLight);
      break;
    case 'flower-vase':
      v.box(1, 0, 1, 3, 4, 3, c.stone).box(2, 4, 2, 1, 3, 1, c.foliage);
      v.set(0, 6, 2, c.flower).set(2, 7, 2, c.flower).set(4, 6, 2, c.flower).set(2, 6, 0, c.flower).set(2, 6, 4, c.flower);
      break;
    default:
      v.box(0, 0, 0, 4, 4, 4, c.fabric).set(1, 4, 1, c.light).set(2, 4, 2, c.light);
  }
}

const SCALE_BY_ASSET: Readonly<Record<string, number>> = {
  'cottage-wardrobe': 0.17,
  'paneled-armoire': 0.17,
  'clothes-rail': 0.16,
  'low-cubby': 0.15,
  'blanket-chest': 0.15,
  'reading-chair': 0.14,
  'rocking-chair': 0.14,
  'pouf': 0.12,
  'side-table': 0.12,
  'narrow-bench': 0.14,
  'teddy-bear': 0.1,
  'trophy-cup': 0.075,
  rosette: 0.08,
  'couple-statuette': 0.09,
  'animal-figurine': 0.08,
  'snow-globe': 0.075,
  'travel-trunk': 0.13,
  'shell-jar': 0.07,
  'book-stack': 0.075,
  'botanical-print': 0.1,
  'landscape-print': 0.1,
  'heart-print': 0.1,
  'memory-frame': 0.1,
  'tall-mirror': 0.12,
  'table-lamp': 0.09,
  'floor-lamp': 0.13,
  lantern: 0.085,
  'round-rug': 0.16,
  runner: 0.14,
  'cushion-basket': 0.1,
  'flower-vase': 0.075,
};

export function IndoorCatalogObject({ object }: { object: ResolvedHomeObject }) {
  const colors = colorsFor(object.style);
  const scale = SCALE_BY_ASSET[object.assetId] ?? 0.1;
  const cacheKey = `${object.assetId}:${JSON.stringify(object.style)}`;
  const y = object.surface === 'wall' ? 0.55 : object.assetId === 'round-rug' || object.assetId === 'runner' ? 0.01 : 0;
  return (
    <VoxMesh
      build={(vox) => buildIndoor(vox, object.assetId, colors)}
      cacheKey={cacheKey}
      scale={scale}
      position={[-object.definition.footprint.width / 2, y, -object.definition.footprint.depth / 2]}
      meshScale={object.assetId === 'round-rug' || object.assetId === 'runner' ? [1, 0.22, 1] : undefined}
    />
  );
}
