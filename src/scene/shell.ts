import { room } from '@/theme/hearth';
import { ROOM_STOPS } from './roomNavigation';
import { Vox } from './voxel';

// Shared builders for the connected dollhouse modules. Each room keeps the
// fixed-isometric two-wall shell (back = -z, left = -x), while fixed sockets
// align its floor with the living-room hub.

export const S = 0.25;

/** Enlarged central island bounds, in voxel coordinates. */
export const LIVING_BOUNDS = {
  floorX0: -17,
  floorX1: 20,
  floorZ0: -17,
  floorZ1: 16,
  wallX: -18,
  wallZ: -18,
} as const;

/**
 * Stable connection points in the living shell's voxel grid. Future rooms
 * should attach through one of these sockets instead of adding an improvised
 * connector in open floor space.
 */
export const ROOM_SOCKETS = {
  bedroom: { wall: 'back', start: 11, width: 6 },
  garden: { wall: 'left', start: 9, width: 5 },
} as const;

// World origins of the connected modules. The bedroom meets the living back
// wall directly; the garden sits west of the living room beyond a wooden path.
export const LIVING_OFFSET: readonly [number, number, number] = [0, 0, 0];
export const BEDROOM_OFFSET: readonly [number, number, number] = [
  ROOM_STOPS.bedroom.x,
  0,
  ROOM_STOPS.bedroom.z,
];
export const GARDEN_OFFSET: readonly [number, number, number] = [
  -7.5,
  0,
  2.5,
];

/** Golden running-bond brick floor over the voxel range [x0..x1] × [z0..z1]. */
export function paintBrickFloor(v: Vox, x0: number, x1: number, z0: number, z1: number) {
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const course = Math.floor((z + 30) / 3);
      const gz = ((z % 3) + 3) % 3;
      const offset = (course % 2) * 2;
      const gx = (((x + offset) % 4) + 4) % 4;
      if (gz === 2 || gx === 3) {
        v.set(x, -1, z, room.floorGrout);
      } else {
        const brick = (Math.floor((x + offset + 30) / 4) + course) % 2 === 0;
        v.set(x, -1, z, brick ? room.floorA : room.floorB);
      }
    }
  }
}

/**
 * A floating corner shell: plinth, brick floor over [x0..x1] × [z0..z1], and
 * the back (z0‑1) + left (x0‑1) walls with baseboards. `wallH` in voxels.
 */
export function buildCornerShell(
  v: Vox,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  wallH = 14,
) {
  const wx = x0 - 1;
  const wz = z0 - 1;
  const spanX = x1 - wx + 1; // wall length along x
  const spanZ = z1 - wz + 1; // wall length along z
  // Plinth (diorama base) — one voxel proud of the walls on the open sides.
  v.box(wx, -2, wz, spanX, 1, spanZ, '#5f3d24');
  paintBrickFloor(v, x0, x1, z0, z1);
  // Back + left walls.
  v.box(wx, 0, wz, spanX, wallH, 1, room.wall);
  v.box(wx, 0, wz, 1, wallH, spanZ, room.wall);
  v.box(wx, -1, wz, spanX, 1, 1, room.wall);
  v.box(wx, -1, wz, 1, 1, spanZ, room.wall);
  // Baseboards along the inner wall faces.
  v.box(x0, 0, wz, x1 - x0 + 1, 1, 1, room.baseboard);
  v.box(wx, 0, z0, 1, 1, z1 - z0 + 1, room.baseboard);
}

/** Cream woven striped rug (pale island on the golden floor). */
export function stripedRug(v: Vox, w: number, d: number) {
  v.box(0, 0, 0, w, 1, d, '#eadcbd');
  for (let z = 1; z < d - 1; z++) {
    for (let x = 1; x < w - 1; x++) {
      v.set(x, 0, z, z % 2 === 0 ? '#e0d0ab' : '#d2c096');
    }
  }
  v.remove(0, 0, 0);
  v.remove(w - 1, 0, 0);
  v.remove(0, 0, d - 1);
  v.remove(w - 1, 0, d - 1);
}
