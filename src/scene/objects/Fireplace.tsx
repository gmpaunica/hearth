import { room } from '@/theme/hearth';
import { Fire } from '../Fire';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Local grid: 8 wide (x), 3 deep (z), body 10 high + chimney to 13.
function buildFireplace(v: Vox) {
  // Brick body with alternating courses.
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 10; y++) {
      for (let z = 0; z < 3; z++) {
        const brick = (y + (x >> 1)) % 2 === 0 ? room.brick : room.brickDark;
        v.set(x, y, z, brick);
      }
    }
  }
  // Firebox cavity + dark interior.
  v.remove(1, 0, 1, 6, 5, 2);
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
  // Chimney breast up to the wall top.
  v.box(1, 11, 0, 6, 3, 3, room.brickDark);
  // Stone hearth slab in front.
  v.box(0, 0, 3, 8, 1, 2, '#9c9187');
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
    </group>
  );
}
