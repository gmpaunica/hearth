import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// A cosy double bed for the bedroom nook. Local grid: 7 wide (x), 9 long (z),
// head against z=0 (the back wall), foot toward +z. Scale 0.25 → 1.75 × 2.25
// world units, mattress surface at y=0.75 (matches SPOTS.romantic seatY).
const FRAME = room.woodDark;
const HEADBOARD = room.doorWood;
const SHEET = '#f4e4c4'; // warm cream mattress/sheets
const BLANKET = '#cf9aa6'; // dusky blush rose — tasteful, not loud
const BLANKET_FOLD = '#bd8792';
const PILLOW = '#fbf3e6';

function buildBed(v: Vox) {
  // Platform frame.
  v.box(0, 0, 0, 7, 1, 9, FRAME);
  // Mattress.
  v.box(0, 1, 0, 7, 2, 9, SHEET);
  // Tall headboard slab against the wall.
  v.box(0, 1, 0, 7, 5, 1, HEADBOARD);
  // Two plump pillows at the head.
  v.box(0, 3, 1, 3, 1, 2, PILLOW);
  v.box(4, 3, 1, 3, 1, 2, PILLOW);
  // Blanket over the lower two-thirds, with a folded top edge.
  v.box(0, 3, 3, 7, 1, 6, BLANKET);
  v.box(0, 3, 3, 7, 1, 1, BLANKET_FOLD);
}

/** Voxel double bed; `position` is the min-corner of its local grid. */
export function Bed({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildBed} scale={0.25} position={position} />;
}
