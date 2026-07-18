import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';
import { room } from '@/theme/hearth';

const BOOK_COLORS = ['#c95f4a', '#5b8bb0', '#d9a84c', '#6a9b5e', '#9b6ab0', '#d0806a'];

// Local grid: 2 deep (x), 6 long (z), 8 high; against the left wall facing +x.
function buildShelf(v: Vox) {
  // Frame: sides, top, bottom, shelves.
  v.box(0, 0, 0, 2, 8, 1, room.woodDark);
  v.box(0, 0, 5, 2, 8, 1, room.woodDark);
  v.box(0, 7, 0, 2, 1, 6, room.tableWood);
  v.box(0, 0, 1, 2, 1, 4, room.tableWood);
  v.box(0, 3, 1, 2, 1, 4, room.tableWood);
  // Books: deterministic pseudo-random heights/colors.
  let c = 0;
  for (const row of [1, 4]) {
    for (let z = 1; z <= 4; z++) {
      const h = 1 + ((z + row) % 2);
      v.box(0, row, z, 1, h, 1, BOOK_COLORS[c++ % BOOK_COLORS.length]);
    }
  }
  // A little plant on top.
  v.set(0, 8, 2, '#b06a3f');
  v.set(0, 9, 2, room.plantLeaf);
}

/** Small bookshelf against the left wall. */
export function Bookshelf({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildShelf} scale={0.25} position={position} />;
}
