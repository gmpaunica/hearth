import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// A cosy double bed for the bedroom nook. Local grid: 7 wide (x), 9 long (z),
// head against z=0 (the back wall), foot toward +z. Scale 0.25 -> 1.75 x 2.25
// world units, mattress surface at y=0.75 (matches SPOTS.romantic seatY).
const FRAME = room.woodDark;
const HEADBOARD = room.doorWood;
const WOOD_LIGHT = '#a96d3d';
const SHEET = '#f4e4c4';
const SHEET_SHADOW = '#e7d3b3';
const BLANKET = '#cf9aa6';
const BLANKET_FOLD = '#bd8792';
const BLANKET_LIGHT = '#dfaab3';
const PILLOW = '#fbf3e6';

function buildBed(v: Vox) {
  // Dark platform with warmer exposed side rails and block feet. Keeping the
  // original top height is important because the romantic avatar poses sit on
  // the uncovered sheet near the headboard.
  v.box(0, 0, 0, 7, 1, 9, FRAME);
  v.box(0, 0, 1, 1, 1, 7, HEADBOARD);
  v.box(6, 0, 1, 1, 1, 7, HEADBOARD);
  v.box(0, 0, 8, 7, 1, 1, WOOD_LIGHT);
  for (const [x, z] of [[0, 0], [6, 0], [0, 8], [6, 8]] as const) {
    v.set(x, 0, z, FRAME);
  }

  // A two-layer mattress with clipped upper corners reads softer at overview
  // scale while staying on the coarse furniture grid.
  v.box(0, 1, 0, 7, 2, 9, SHEET);
  v.box(0, 1, 8, 7, 1, 1, SHEET_SHADOW);
  v.remove(0, 2, 8);
  v.remove(6, 2, 8);

  // Chunky posts, a stepped crown, and a rose inlay make the headboard feel
  // crafted rather than like a flat slab.
  v.box(0, 1, 0, 7, 5, 1, HEADBOARD);
  v.box(0, 1, 0, 1, 6, 1, FRAME);
  v.box(6, 1, 0, 1, 6, 1, FRAME);
  v.box(1, 5, 0, 5, 1, 1, WOOD_LIGHT);
  v.box(2, 6, 0, 3, 1, 1, HEADBOARD);
  v.set(0, 7, 0, WOOD_LIGHT);
  v.set(6, 7, 0, WOOD_LIGHT);
  v.box(1, 3, 1, 5, 2, 1, FRAME);
  v.box(2, 3, 1, 3, 1, 1, HEADBOARD);
  v.set(2, 4, 1, BLANKET_FOLD);
  v.set(3, 4, 1, BLANKET_LIGHT);
  v.set(4, 4, 1, BLANKET_FOLD);

  // Two plump pillows with a warm shadow seam at the head.
  v.box(0, 3, 1, 3, 1, 2, PILLOW);
  v.box(4, 3, 1, 3, 1, 2, PILLOW);
  v.box(0, 3, 2, 3, 1, 1, SHEET_SHADOW);
  v.box(4, 3, 2, 3, 1, 1, SHEET_SHADOW);
  v.set(1, 3, 1, '#fff8eb');
  v.set(5, 3, 1, '#fff8eb');

  // The quilt covers only the foot. Side drapes, a folded edge, and a quiet
  // checker highlight create textile depth without changing the seat area.
  v.box(0, 3, 3, 7, 1, 6, BLANKET);
  v.box(0, 3, 3, 7, 1, 1, BLANKET_FOLD);
  v.box(0, 2, 4, 1, 1, 4, BLANKET_FOLD);
  v.box(6, 2, 4, 1, 1, 4, '#b97c89');
  for (let x = 1; x < 6; x += 2) {
    for (let z = 5; z < 9; z += 2) v.set(x, 3, z, BLANKET_LIGHT);
  }
  v.box(0, 3, 8, 7, 1, 1, '#c38b97');
}

/** Voxel double bed; `position` is the min-corner of its local grid. */
export function Bed({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildBed} scale={0.25} position={position} />;
}
