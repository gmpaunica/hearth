import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// A small sage loveseat for the resting area — deliberately humbler and a
// different colour family than the coral sofa, so "resting" reads as its own
// place. Local grid: 8 wide (x), 4 deep (z), back at z=0, facing +z.
const SAGE = '#8a9c6a';
const SAGE_DARK = '#75885a';
const CREAM = '#f4e4c4';

function buildRestNook(v: Vox) {
  // Base.
  v.box(0, 0, 0, 8, 1, 4, SAGE_DARK);
  // Backrest.
  v.box(0, 1, 0, 8, 3, 1, SAGE);
  // Low arms.
  v.box(0, 1, 0, 1, 2, 4, SAGE);
  v.box(7, 1, 0, 1, 2, 4, SAGE);
  // Two cream seat cushions.
  v.box(1, 1, 1, 3, 1, 3, CREAM);
  v.box(4, 1, 1, 3, 1, 3, CREAM);
  // Soft back cushions.
  v.box(1, 2, 1, 3, 2, 1, '#efe0bd');
  v.box(4, 2, 1, 3, 2, 1, CREAM);
  // A folded blanket over one arm.
  v.box(0, 3, 1, 1, 1, 2, '#d9b98a');
}

/** Sage rest couch on the right side, rotated to face into the room (-x). */
export function RestNook({ position }: { position: [number, number, number] }) {
  return (
    <VoxMesh
      build={buildRestNook}
      scale={0.22}
      position={position}
      rotation={[0, -Math.PI / 2, 0]}
    />
  );
}
