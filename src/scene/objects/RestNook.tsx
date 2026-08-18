import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// A compact quiet mat for the resting signal. It stays low and distinct so the
// coral sofa remains the only couch-shaped destination in the living room.
const SAGE = '#8a9c6a';
const SAGE_DARK = '#75885a';
const SAGE_LIGHT = '#aeb995';
const CREAM = '#f4e4c4';
const WOVEN = '#d9b98a';

function buildRestNook(v: Vox) {
  // Woven border and a quiet checker retain the intentionally low floor mat
  // while giving it a finished, layered outline.
  v.box(0, 0, 0, 8, 1, 4, SAGE_DARK);
  for (let x = 0; x < 8; x++) {
    v.set(x, 0, 0, x % 2 === 0 ? WOVEN : '#caa676');
    v.set(x, 0, 3, x % 2 === 0 ? '#caa676' : WOVEN);
  }
  v.box(0, 0, 1, 1, 1, 2, '#687b50');
  v.box(7, 0, 1, 1, 1, 2, '#687b50');

  // Two distinct floor cushions, each with a rear bolster and central seam.
  // They remain one voxel high, preserving the existing rest poses.
  v.box(0, 1, 1, 3, 1, 2, CREAM);
  v.set(1, 1, 1, '#fff4df');
  v.box(5, 1, 1, 3, 1, 2, SAGE);
  v.set(6, 1, 1, SAGE_LIGHT);
  v.box(0, 1, 0, 3, 1, 1, '#e7d3b3');
  v.box(5, 1, 0, 3, 1, 1, '#7f9162');

  // A folded throw divides the cushions. A tiny closed book sits between the
  // two resting places without occupying either avatar footprint.
  v.box(3, 1, 0, 2, 1, 4, WOVEN);
  v.set(3, 1, 1, '#e5c99f');
  v.set(4, 1, 2, '#c99b70');
  v.box(3, 2, 1, 2, 1, 1, '#a95f54');
  v.set(4, 2, 1, '#e2bd7c');

  // Sparse coarse tassels stay visible after nearest-neighbor downsampling.
  for (const x of [0, 2, 5, 7]) {
    v.set(x, 0, -1, '#d8b47e');
    v.set(x, 0, 4, '#c89d69');
  }
}

/** Low rest mat tucked into the open front-left corner. */
export function RestNook({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildRestNook} scale={0.16} position={position} />;
}
