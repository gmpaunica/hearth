import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Rich but warm spine colors: enough variation to read as a treasured, lived-in
// collection without fighting the room's coral/sage focal points.
const BOOK_COLORS = [
  '#b85043', '#4e7391', '#d1a250', '#668452', '#86647f', '#c9784e',
  '#4f8580', '#cf6758', '#718ca0', '#b86d3e', '#809667', '#9a728e',
];

// Local grid: 3 deep (x), 8 long (z), 18 high; against the left wall facing +x.
function buildShelf(v: Vox) {
  const back = '#4c2f20';
  const trim = '#a36a3d';

  // Shadowed back, substantial side stiles, and overhanging crown/base turn
  // the former flat book wall into a small piece of joinery.
  v.box(0, 0, 0, 1, 13, 6, back);
  v.box(0, 0, 0, 3, 13, 1, room.woodDark);
  v.box(0, 0, 5, 3, 13, 1, room.woodDark);
  v.box(0, 0, -1, 3, 1, 8, room.woodDark);
  v.box(0, 12, 0, 3, 1, 6, room.woodDark);
  v.box(0, 13, -1, 3, 1, 8, trim);
  v.box(1, 14, 0, 2, 1, 6, room.woodDark);
  for (const y of [0, 3, 6, 9]) {
    v.box(0, y, 0, 3, 1, 6, room.tableWood);
    v.box(2, y, 0, 1, 1, 6, trim);
  }
  v.box(2, 1, 0, 1, 11, 1, trim);
  v.box(2, 1, 5, 1, 11, 1, trim);

  // Densely packed books with varied height, depth, and light spine bands.
  let c = 0;
  for (const row of [1, 4, 7, 10]) {
    for (let z = 1; z <= 4; z++) {
      const short = (row + z) % 4 === 0;
      const color = BOOK_COLORS[(c += 5) % BOOK_COLORS.length];
      v.box(1, row, z, z % 3 === 0 ? 2 : 1, short ? 1 : 2, 1, color);
      if (!short && (row + z) % 3 === 0) v.set(2, row + 1, z, '#e2c58f');
    }
  }

  // A horizontal stack and a tiny framed keepsake interrupt the book rhythm.
  v.box(1, 7, 1, 2, 1, 2, '#cf8a59');
  v.box(1, 8, 1, 2, 1, 2, '#718b73');
  v.box(1, 10, 2, 2, 2, 2, '#d1a25d');
  v.set(2, 10, 2, '#f5dfc2');
  v.set(2, 11, 3, '#c96f68');

  // A broad, chunky trailing plant survives the main nearest-neighbor pass.
  v.box(1, 14, 1, 2, 2, 2, '#9d5938');
  v.box(0, 16, 0, 3, 1, 4, room.plantLeafDark);
  v.box(1, 17, 1, 2, 1, 2, room.plantLeaf);
  v.set(2, 15, 4, '#79ad63');
  v.set(2, 14, 5, '#648f54');
}

/** Tall packed bookshelf against the left wall (finer 0.2 grid for spines). */
export function Bookshelf({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildShelf} scale={0.2} position={position} />;
}
