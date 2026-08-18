import { room } from '@/theme/hearth';
import { BEDROOM_OFFSET, GARDEN_OFFSET, S } from './shell';
import { VoxMesh } from './VoxMesh';
import type { Vox } from './voxel';

const LOCKED = {
  plinth: '#343442',
  floorA: '#555766',
  floorB: '#4b4d5b',
  wall: '#676878',
  trim: '#454755',
  silhouette: '#3d3f4c',
  lock: '#d0ae68',
};

function buildMutedCorner(v: Vox, x0: number, x1: number, z0: number, z1: number) {
  const wx = x0 - 1;
  const wz = z0 - 1;
  const spanX = x1 - wx + 1;
  const spanZ = z1 - wz + 1;
  v.box(wx, -2, wz, spanX, 1, spanZ, LOCKED.plinth);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      v.set(x, -1, z, (x + z) % 2 === 0 ? LOCKED.floorA : LOCKED.floorB);
    }
  }
  v.box(wx, 0, wz, spanX, 12, 1, LOCKED.wall);
  v.box(wx, 0, wz, 1, 12, spanZ, LOCKED.wall);
  v.box(x0, 0, wz, x1 - x0 + 1, 1, 1, LOCKED.trim);
  v.box(wx, 0, z0, 1, 1, z1 - z0 + 1, LOCKED.trim);
}

function buildLockedBedroom(v: Vox) {
  buildMutedCorner(v, -10, 9, -10, 8);
  // Only a recognisable bed silhouette: no interactive or decorative content.
  v.box(-4, 0, -7, 8, 2, 8, LOCKED.silhouette);
  v.box(-4, 2, -8, 8, 3, 1, LOCKED.silhouette);
  v.box(-3, 2, -6, 3, 1, 3, '#4a4c59');
  v.box(1, 2, -6, 3, 1, 3, '#4a4c59');
}

function buildLockedGarden(v: Vox) {
  const x0 = -32, x1 = 12, z0 = -24, z1 = 20;
  const wx = x0 - 1, wz = z0 - 1;
  const spanX = x1 - wx + 1;
  const spanZ = z1 - wz + 1;
  v.box(wx, -2, wz, spanX, 1, spanZ, LOCKED.plinth);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      v.set(x, -1, z, (x + z) % 3 === 0 ? '#515b55' : '#4a534e');
    }
  }
  // The living-room wall owns the shared east corner; stop before it so the
  // locked silhouette cannot phase through the main room either.
  v.box(wx, 0, wz, spanX - 1, 3, 1, '#414a46');
  v.box(wx, 0, wz, 1, 3, spanZ, '#414a46');
  // One low tree silhouette leaves the future room visibly open.
  v.box(-6, 0, -6, 2, 5, 2, LOCKED.silhouette);
  v.box(-8, 4, -8, 6, 5, 6, '#454b4b');
}

function buildLock(v: Vox) {
  // A chunky readable padlock, upright on the room floor.
  v.box(0, 0, 0, 7, 5, 2, LOCKED.lock);
  v.box(1, 5, 0, 1, 3, 2, LOCKED.lock);
  v.box(5, 5, 0, 1, 3, 2, LOCKED.lock);
  v.box(2, 7, 0, 3, 1, 2, LOCKED.lock);
  v.set(3, 2, -1, room.woodDark);
  v.box(3, 0, -1, 1, 2, 1, room.woodDark);
}

function LockMarker() {
  return <VoxMesh build={buildLock} scale={0.16} position={[-0.55, 0.24, 0.35]} />;
}

export function LockedBedroom() {
  return (
    <group position={[...BEDROOM_OFFSET]}>
      <VoxMesh build={buildLockedBedroom} scale={S} />
      <LockMarker />
    </group>
  );
}

export function LockedGarden() {
  return (
    <group position={[...GARDEN_OFFSET]}>
      <VoxMesh build={buildLockedGarden} scale={S} />
      <LockMarker />
    </group>
  );
}
