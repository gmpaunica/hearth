import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 11 wide (x), 5 deep (z), back against z=0, facing +z.
function buildSofa(v: Vox) {
  const coralDark = '#aa493b';
  const coralLight = '#df7862';
  const creamAlt = '#efe0bd';

  // Shadow plinth and warm front rail ground the couch as crafted furniture.
  v.box(0, 0, 0, 11, 1, 5, coralDark);
  v.box(1, 0, 4, 9, 1, 1, '#8c3e34');
  for (const x of [0, 10]) {
    v.set(x, 0, 1, room.woodDark);
    v.set(x, 0, 4, room.woodDark);
  }

  // Tall backrest with a lighter stepped crown.
  v.box(0, 1, 0, 11, 4, 1, room.sofa);
  v.box(1, 5, 0, 9, 1, 1, coralLight);
  v.remove(1, 5, 0);
  v.remove(9, 5, 0);

  // Rolled, stepped arms remain clear of the two avatar seats.
  v.box(0, 1, 0, 1, 4, 5, room.sofa);
  v.box(10, 1, 0, 1, 4, 5, room.sofa);
  v.box(0, 4, 1, 2, 1, 4, coralLight);
  v.box(9, 4, 1, 2, 1, 4, coralLight);
  v.box(0, 5, 1, 1, 1, 3, room.sofa);
  v.box(10, 5, 1, 1, 1, 3, room.sofa);

  // Three piped seat cushions. Their top remains at 0.5 world units.
  v.box(1, 1, 1, 3, 1, 4, room.sofaCushion);
  v.box(4, 1, 1, 3, 1, 4, creamAlt);
  v.box(7, 1, 1, 3, 1, 4, room.sofaCushion);
  v.box(1, 1, 4, 3, 1, 1, '#e5d2ad');
  v.box(4, 1, 4, 3, 1, 1, '#ddc79f');
  v.box(7, 1, 4, 3, 1, 1, '#e5d2ad');

  // Three soft stepped back cushions stay distinct from the coral back slab.
  v.box(1, 2, 1, 3, 2, 1, creamAlt);
  v.box(4, 2, 1, 3, 2, 1, room.sofaCushion);
  v.box(7, 2, 1, 3, 2, 1, creamAlt);
  v.set(2, 4, 1, '#f8ecd3');
  v.set(5, 4, 1, '#fff1d8');
  v.set(8, 4, 1, '#f8ecd3');

  // Muted blush and gold pillows plus a short sage throw connect the couch to
  // the garden palette without introducing loud isolated accents.
  v.box(1, 2, 2, 2, 2, 1, '#e9b6aa');
  v.set(1, 3, 2, '#f5d6c8');
  v.box(8, 2, 2, 2, 2, 1, '#d9b879');
  v.set(9, 3, 2, '#f1d79e');
  v.box(9, 2, 3, 1, 2, 2, '#8f9e72');
  v.set(9, 2, 4, '#aab58d');
}

/** Coral voxel sofa; `position` is the min-corner of its local grid. */
export function Sofa({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildSofa} scale={0.25} position={position} />;
}
