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

export const activeRoomStops = (): RoomStop[] => {
  const resolved = resolvedRoomStops?.();
  return Object.values({ ...ROOM_STOPS, ...(resolved ?? {}) })
    .sort((a, b) => roomRailPosition(a.x, a.z) - roomRailPosition(b.x, b.z));
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const roomRailPosition = (x: number, z: number) => (x - z) / Math.SQRT2;

/** Project any gesture offset onto the piecewise room rail. */
export function clampCameraOffset(
  x: number,
  z: number,
  _zoomMul = 1,
): { x: number; z: number } {
  const stops = activeRoomStops();
  if (stops.length === 0) return { x: 0, z: 0 };
  if (stops.length === 1) return { x: stops[0].x, z: stops[0].z };
  const target = clamp(
    roomRailPosition(x, z),
    roomRailPosition(stops[0].x, stops[0].z),
    roomRailPosition(stops[stops.length - 1].x, stops[stops.length - 1].z),
  );
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    const fromPosition = roomRailPosition(from.x, from.z);
    const toPosition = roomRailPosition(to.x, to.z);
    if (target > toPosition) continue;
    const progress = (target - fromPosition) / Math.max(toPosition - fromPosition, 0.0001);
    return {
      x: from.x + (to.x - from.x) * progress,
      z: from.z + (to.z - from.z) * progress,
    };
  }
  const last = stops[stops.length - 1];
  return { x: last.x, z: last.z };
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
