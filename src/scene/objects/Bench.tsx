import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 3 deep (x), 6 long (z); sits against the left wall facing +x.
function buildBench(v: Vox) {
  const wood = room.doorWood;
  const woodLight = '#a86c3c';
  const sage = '#9daf88';
  const sageLight = '#b2bf9d';

  // Framed seat and four substantial feet. The cushion still occupies y=1,
  // preserving the garden spot's 0.5 world-unit seat surface.
  v.box(0, 1, 0, 3, 1, 6, wood);
  v.box(1, 1, 1, 2, 1, 2, sageLight);
  v.box(1, 1, 3, 2, 1, 2, sage);
  v.box(2, 1, 1, 1, 1, 4, '#899b77');
  for (const z of [0, 5]) {
    v.set(0, 0, z, room.woodDark);
    v.set(2, 0, z, room.woodDark);
  }

  // A classic slatted back gives the bench a clear silhouette at house scale.
  // Posts and arm rails stay at the ends, away from both avatar seats.
  v.box(0, 0, 0, 1, 6, 1, room.woodDark);
  v.box(0, 0, 5, 1, 6, 1, room.woodDark);
  v.box(0, 2, 0, 1, 1, 6, wood);
  v.box(0, 5, 0, 1, 1, 6, woodLight);
  for (const z of [1, 2, 3, 4]) {
    v.box(0, 3, z, 1, 2, 1, z % 2 === 0 ? woodLight : wood);
  }
  v.box(0, 3, 0, 3, 1, 1, woodLight);
  v.box(0, 3, 5, 3, 1, 1, woodLight);
  v.set(0, 6, 0, '#d6a85f');
  v.set(0, 6, 5, '#d6a85f');

  // Tiny carved-heart color chips personalize the shared garden destination.
  v.set(0, 4, 2, '#d88982');
  v.set(0, 4, 3, '#d88982');
  v.set(0, 3, 2, '#bd6e68');
}

/** Garden bench by the door; `position` is the min-corner of its local grid. */
export function Bench({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildBench} scale={0.25} position={position} />;
}
