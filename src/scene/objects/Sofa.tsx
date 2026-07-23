import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 11 wide (x), 5 deep (z), back against z=0, facing +z. A big,
// plush three-seater — the living room's hero couch.
function buildSofa(v: Vox) {
  // Base (deep seat platform).
  v.box(0, 0, 0, 11, 1, 5, room.sofa);
  // Tall backrest.
  v.box(0, 1, 0, 11, 5, 1, room.sofa);
  // Plump armrests, taller than the seat (hero F silhouette).
  v.box(0, 1, 0, 1, 4, 5, room.sofa);
  v.box(10, 1, 0, 1, 4, 5, room.sofa);
  v.box(0, 5, 0, 1, 1, 4, room.sofa);
  v.box(10, 5, 0, 1, 1, 4, room.sofa);
  // Three cream seat cushions.
  v.box(1, 1, 1, 3, 1, 4, room.sofaCushion);
  v.box(4, 1, 1, 3, 1, 4, '#efe0bd');
  v.box(7, 1, 1, 3, 1, 4, room.sofaCushion);
  // Cream back cushions.
  v.box(1, 2, 1, 3, 2, 1, '#efe0bd');
  v.box(4, 2, 1, 3, 2, 1, room.sofaCushion);
  v.box(7, 2, 1, 3, 2, 1, '#efe0bd');
  // Cream throw pillows leaning on each arm (hero F: no loud accent colors).
  v.box(1, 2, 2, 2, 2, 1, room.sofaCushion);
  v.box(8, 2, 2, 2, 2, 1, '#efe0bd');
}

/** Coral voxel sofa; `position` is the min-corner of its local grid. */
export function Sofa({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildSofa} scale={0.25} position={position} />;
}
