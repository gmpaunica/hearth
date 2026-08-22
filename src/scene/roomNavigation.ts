export type RoomId = 'garden' | 'living' | 'bedroom';

export interface RoomStop {
  id: RoomId;
  x: number;
  z: number;
}

export const ROOM_STOPS: Record<RoomId, RoomStop> = {
  // The bedroom shares the living back wall; the garden now meets the west
  // doorway directly instead of living at the far end of an offscreen path.
  garden: { id: 'garden', x: -10, z: 2 },
  living: { id: 'living', x: 0, z: 0 },
  bedroom: { id: 'bedroom', x: 4.5, z: -6.5 },
};

let resolvedRoomStops: (() => Partial<Record<RoomId, RoomStop>>) | null = null;

/** Runtime rooms come from resolveHomeScene; constants remain the safe 1.0.4 frame. */
export function setRoomNavigationSource(source: () => Partial<Record<RoomId, RoomStop>>) {
  resolvedRoomStops = source;
}

export const ROOM_UNLOCK_DAYS: Record<Exclude<RoomId, 'living'>, number> = {
  bedroom: 21,
  garden: 30,
};

const activeRoomStops = () => {
  const resolved = resolvedRoomStops?.();
  return resolved ? Object.values(resolved) : Object.values(ROOM_STOPS);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Free two-axis camera movement with broad outer limits. The camera no longer
 * rides a rail or snaps to rooms; these limits only prevent losing the home.
 */
export function clampCameraOffset(
  x: number,
  z: number,
  zoomMul = 1,
): { x: number; z: number } {
  // The default camera is intentionally close enough to show the new voxel
  // detail, so all three rooms must already be reachable before pinch-zoom.
  // Pinching in opens a little extra inspection range around each outer room.
  const screenX = (x - z) / Math.SQRT2;
  const screenY = -(x + z) / Math.SQRT2;
  const reach = clamp((zoomMul - 1) / 3.5, 0, 1);
  const safeX = clamp(screenX, -8.75 - 2 * reach, 9 + 2.5 * reach);
  const safeY = clamp(screenY, -4 - 2 * reach, 5.75 + 2.5 * reach);
  return {
    x: (safeX - safeY) / Math.SQRT2,
    z: (-safeX - safeY) / Math.SQRT2,
  };
}

export function nearestRoom(x: number, z: number): { stop: RoomStop; distance: number } {
  let stop = ROOM_STOPS.living;
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of activeRoomStops()) {
    const nextDistance = Math.hypot(x - candidate.x, z - candidate.z);
    if (nextDistance < distance) {
      stop = candidate;
      distance = nextDistance;
    }
  }
  return { stop, distance };
}

export interface LockedRoomCopy {
  title: string;
  detail: string;
}

export function lockedRoomCopy(room: RoomId, daysTogether: number): LockedRoomCopy | null {
  if (room === 'living') return null;
  const remaining = Math.max(0, Math.ceil(ROOM_UNLOCK_DAYS[room] - daysTogether));
  return {
    title: room === 'bedroom' ? 'Bedroom' : 'Garden',
    detail: remaining === 0
      ? 'Ready to unlock'
      : `Unlocks in ${remaining} ${remaining === 1 ? 'day' : 'days'}`,
  };
}
