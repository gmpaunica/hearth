import type { ResolvedHomeObject } from '@/home/types';
import { paletteColor } from '@/home/palettes';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

type BedroomColors = ReturnType<typeof colorsFor>;

function colorsFor(style: Readonly<Record<string, unknown>>) {
  return {
    wood: paletteColor(style, 'wood', '#94613f'),
    woodDark: '#59392d',
    fabric: paletteColor(style, 'fabric', '#bd7b76'),
    fabricLight: '#e1b8ac',
    metal: paletteColor(style, 'metal', '#a88755'),
    linen: '#f0dfc4',
    linenShade: '#d6c2a6',
  };
}

function feet(v: Vox, width: number, depth: number, color: string) {
  for (const [x, z] of [[0, 0], [width - 1, 0], [0, depth - 1], [width - 1, depth - 1]] as const) {
    v.box(x, 0, z, 1, 2, 1, color);
  }
}

function bedBase(v: Vox, c: BedroomColors) {
  feet(v, 10, 14, c.woodDark);
  v.box(0, 1, 0, 10, 2, 14, c.wood);
  v.box(0, 3, 0, 10, 2, 14, c.linen);
  v.box(0, 4, 0, 5, 1, 3, '#f8ead5').box(5, 4, 0, 5, 1, 3, '#f8ead5');
  v.box(0, 4, 5, 10, 1, 9, c.fabric).box(0, 4, 5, 10, 1, 1, c.fabricLight);
  v.box(0, 3, 8, 1, 1, 5, c.fabricLight).box(9, 3, 8, 1, 1, 5, c.fabricLight);
  for (let x = 1; x < 9; x += 2) v.set(x, 5, 11, c.linenShade);
}

function buildBedroom(v: Vox, id: string, c: BedroomColors) {
  switch (id) {
    case 'cottage-double-bed':
      bedBase(v, c);
      v.box(0, 2, 0, 10, 6, 1, c.woodDark).box(1, 3, 1, 8, 3, 1, c.wood);
      v.box(3, 5, 2, 4, 1, 1, c.fabricLight).set(4, 6, 2, c.metal).set(5, 6, 2, c.metal);
      break;
    case 'four-poster-bed':
      bedBase(v, c);
      for (const [x, z] of [[0, 0], [9, 0], [0, 13], [9, 13]] as const) {
        v.box(x, 2, z, 1, 13, 1, c.woodDark).set(x, 15, z, c.metal);
      }
      v.box(0, 14, 0, 10, 1, 1, c.wood).box(0, 14, 13, 10, 1, 1, c.wood);
      v.box(0, 14, 1, 1, 1, 12, c.wood).box(9, 14, 1, 1, 1, 12, c.wood);
      v.box(1, 12, 0, 8, 1, 1, c.fabricLight).box(0, 2, 0, 10, 6, 1, c.wood);
      break;
    case 'bedroom-settee':
      feet(v, 10, 6, c.woodDark);
      v.box(0, 2, 0, 10, 3, 6, c.fabric).box(1, 5, 0, 8, 4, 2, c.fabricLight);
      v.box(0, 4, 0, 1, 4, 6, c.wood).box(9, 4, 0, 1, 4, 6, c.woodDark);
      v.box(1, 5, 2, 4, 1, 3, c.linen).box(5, 5, 2, 4, 1, 3, c.linenShade);
      break;
    case 'slipper-chair':
      feet(v, 5, 6, c.woodDark);
      v.box(0, 2, 0, 5, 3, 6, c.fabric).box(0, 5, 0, 5, 4, 2, c.fabricLight);
      v.box(1, 5, 2, 3, 1, 3, c.linenShade);
      break;
    case 'bedroom-writing-table':
      v.box(0, 4, 2, 9, 2, 5, c.wood);
      for (const [x, z] of [[0, 2], [8, 2], [0, 6], [8, 6]] as const) v.box(x, 0, z, 1, 4, 1, c.woodDark);
      v.box(3, 5, 0, 3, 1, 2, c.fabric).box(3, 0, 0, 3, 3, 2, c.woodDark);
      v.box(3, 5, 7, 3, 1, 2, c.fabricLight).box(3, 0, 7, 3, 3, 2, c.woodDark);
      v.box(2, 6, 3, 5, 1, 3, c.linenShade).set(7, 6, 4, c.metal);
      break;
    case 'oak-double-wardrobe':
      v.box(0, 1, 0, 9, 13, 5, c.woodDark).box(-1, 0, -1, 11, 1, 7, c.wood);
      v.box(-1, 14, -1, 11, 1, 7, c.wood).box(1, 2, 5, 3, 10, 1, c.wood);
      v.box(5, 2, 5, 3, 10, 1, c.wood).box(4, 2, 5, 1, 10, 1, c.woodDark);
      v.set(3, 7, 6, c.metal).set(5, 7, 6, c.metal);
      break;
    case 'linen-press':
      v.box(0, 1, 0, 8, 11, 5, c.wood).box(-1, 0, -1, 10, 1, 7, c.woodDark);
      v.box(-1, 12, -1, 10, 1, 7, c.woodDark).box(1, 2, 5, 6, 4, 1, c.woodDark);
      v.box(1, 7, 5, 6, 4, 1, c.fabric).set(3, 4, 6, c.metal).set(4, 9, 6, c.metal);
      break;
    default:
      v.box(0, 0, 0, 5, 5, 5, c.wood).set(2, 5, 2, c.metal);
  }
}

const SCALE_BY_ASSET: Readonly<Record<string, number>> = {
  'cottage-double-bed': 0.16,
  'four-poster-bed': 0.145,
  'bedroom-settee': 0.15,
  'slipper-chair': 0.15,
  'bedroom-writing-table': 0.15,
  'oak-double-wardrobe': 0.15,
  'linen-press': 0.145,
};

export function BedroomCatalogObject({ object }: { object: ResolvedHomeObject }) {
  const colors = colorsFor(object.style);
  const cacheKey = `${object.assetId}:${JSON.stringify(object.style)}`;
  return (
    <VoxMesh
      build={(vox) => buildBedroom(vox, object.assetId, colors)}
      cacheKey={cacheKey}
      scale={SCALE_BY_ASSET[object.assetId] ?? 0.15}
      position={[-object.definition.footprint.width / 2, 0, -object.definition.footprint.depth / 2]}
    />
  );
}
