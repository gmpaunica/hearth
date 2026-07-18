import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 3 deep (x), 6 long (z); sits against the left wall facing +x.
function buildBench(v: Vox) {
  v.box(0, 1, 0, 3, 1, 6, room.doorWood);
  // Sage cushion inset at the same level (keeps the seat height low).
  v.box(0, 1, 1, 3, 1, 4, '#9db08a');
  // Leg slabs.
  v.box(0, 0, 0, 3, 1, 1, room.woodDark);
  v.box(0, 0, 5, 3, 1, 1, room.woodDark);
}

/** Garden bench by the door; `position` is the min-corner of its local grid. */
export function Bench({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildBench} scale={0.25} position={position} />;
}
