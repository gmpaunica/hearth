import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';
import { room } from '@/theme/hearth';

// Rich, saturated spine colors — hero F's shelf is a wall of tiny color chips.
const BOOK_COLORS = [
  '#b8433a', '#3f6fa8', '#d9a84c', '#4f8a4a', '#8a5aa8', '#c96f4a',
  '#3d8a8a', '#d0564a', '#5b8bb0', '#c2703a', '#6a9b5e', '#9b6ab0',
];

// Local grid: 2 deep (x), 6 long (z), 13 high; against the left wall facing +x.
function buildShelf(v: Vox) {
  // Tall dark-wood frame: sides, top, and four shelf boards.
  v.box(0, 0, 0, 2, 13, 1, room.woodDark);
  v.box(0, 0, 5, 2, 13, 1, room.woodDark);
  v.box(0, 12, 0, 2, 1, 6, room.woodDark);
  for (const y of [0, 3, 6, 9]) v.box(0, y, 1, 2, 1, 4, room.tableWood);
  // Densely packed books: every slot filled, mostly full-height spines with
  // deterministic color variation and the odd shorter book for rhythm.
  let c = 0;
  for (const row of [1, 4, 7, 10]) {
    for (let z = 1; z <= 4; z++) {
      const short = (row + z) % 5 === 0;
      v.box(0, row, z, 2, short ? 1 : 2, 1, BOOK_COLORS[(c += 5) % BOOK_COLORS.length]);
    }
  }
}

/** Tall packed bookshelf against the left wall (finer 0.2 grid for thin spines). */
export function Bookshelf({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildShelf} scale={0.2} position={position} />;
}
