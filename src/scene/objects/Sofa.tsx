import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 10 wide (x), 4 deep (z), back against z=0, facing +z.
function buildSofa(v: Vox) {
  // Base.
  v.box(0, 0, 0, 10, 1, 4, room.sofa);
  // Backrest.
  v.box(0, 1, 0, 10, 4, 1, room.sofa);
  // Armrests.
  v.box(0, 1, 0, 1, 2, 4, room.sofa);
  v.box(9, 1, 0, 1, 2, 4, room.sofa);
  // Cream seat cushions.
  v.box(1, 1, 1, 4, 1, 3, room.sofaCushion);
  v.box(5, 1, 1, 4, 1, 3, room.sofaCushion);
  // Back cushions.
  v.box(1, 2, 1, 4, 2, 1, '#e8cfa4');
  v.box(5, 2, 1, 4, 2, 1, '#e8cfa4');
  // Mustard throw pillow.
  v.box(1, 2, 2, 2, 2, 1, '#e0a844');
}

/** Coral voxel sofa; `position` is the min-corner of its local grid. */
export function Sofa({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildSofa} scale={0.25} position={position} />;
}
