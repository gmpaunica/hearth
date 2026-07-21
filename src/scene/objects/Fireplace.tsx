import { room } from '@/theme/hearth';
import { EmberColumn, Fire } from '../Fire';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

/** Hero-F brick pattern: running-bond bricks with visible darker mortar joints. */
function brickAt(x: number, y: number): string {
  const offset = (y % 2) * 2; // half-brick offset every course
  const gx = (((x + offset) % 3) + 3) % 3; // bricks 2 long + 1 mortar joint
  if (gx === 2) return '#8e3d2c'; // mortar
  return (Math.floor((x + offset) / 3) + y) % 2 === 0 ? room.brick : room.brickDark;
}

// Local grid: 8 wide (x), 3 deep (z), body 10 high + brick chimney to 14.
function buildFireplace(v: Vox) {
  // Brick body, mortar-jointed courses.
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 10; y++) {
      for (let z = 0; z < 3; z++) v.set(x, y, z, brickAt(x, y));
    }
  }
  // Firebox cavity with stepped "arch" corners + dark interior.
  v.remove(1, 0, 1, 6, 5, 2);
  v.box(1, 4, 1, 1, 1, 2, brickAt(1, 4));
  v.box(6, 4, 1, 1, 1, 2, brickAt(6, 4));
  v.box(1, 0, 0, 6, 5, 1, room.fireplaceInner);
  // Glowing coals + logs on the cavity floor.
  v.set(2, 0, 1, room.ember);
  v.set(3, 0, 1, '#ffb95e');
  v.set(4, 0, 1, room.ember);
  v.set(5, 0, 1, '#e0763a');
  v.set(2, 0, 2, '#5a3c26');
  v.set(4, 0, 2, '#5a3c26');
  // Mantel shelf.
  v.box(-1, 10, 0, 10, 1, 4, room.mantel);
  // Brick chimney breast continuing up to the wall top.
  for (let x = 1; x < 7; x++) {
    for (let y = 11; y < 14; y++) {
      for (let z = 0; z < 3; z++) v.set(x, y, z, brickAt(x, y));
    }
  }
  // Dark charcoal hearth slab in front (hero F), not pale stone.
  v.box(0, 0, 3, 8, 1, 2, '#33291f');
  // Candles on the mantel.
  v.box(0, 11, 1, 1, 2, 1, room.frameWhite);
  v.set(0, 13, 1, room.ember);
  v.box(7, 11, 1, 1, 1, 1, '#e8d9c4');
  v.set(7, 12, 1, room.ember);
  // Two tiny hearts, center mantel.
  v.set(3, 11, 1, '#d0564a');
  v.set(4, 11, 1, '#d0564a');
}

/** Brick voxel fireplace; `position` is the min-corner of its local grid. */
export function Fireplace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <VoxMesh build={buildFireplace} scale={0.25} />
      {/* Pixel fire centered in the cavity */}
      <Fire position={[1.0, 0.14, 0.42]} />
      {/* Embers escaping the chimney into the night */}
      <EmberColumn position={[1.0, 3.55, 0.38]} />
    </group>
  );
}
