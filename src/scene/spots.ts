import type { AvatarKey, SpotId } from '@/state/sceneStore';

export interface SpotPose {
  /** World position on the floor (x, z). */
  x: number;
  z: number;
  /** Facing direction once arrived (radians, 0 = facing +z / camera-ish). */
  rotY: number;
  /** Seat surface height; 0 means standing. Floor-sitting uses a small value. */
  seatY: number;
}

// Isometric corner room: back wall at z=-3.25, left wall at x=-3.25,
// floor open toward +x/+z (the camera looks in from (+,+)).
export const SPOTS: Record<SpotId, Record<AvatarKey, SpotPose>> = {
  idle: {
    a: { x: -0.6, z: 0.3, rotY: 0.5, seatY: 0 },
    b: { x: 0.4, z: -0.9, rotY: -0.2, seatY: 0 },
  },
  // Sitting on the rug before the fire, angled slightly toward each other.
  fireplace: {
    a: { x: -2.1, z: -1.85, rotY: Math.PI - 0.45, seatY: 0.1 },
    b: { x: -1.1, z: -1.85, rotY: Math.PI + 0.45, seatY: 0.1 },
  },
  // Sofa against the back wall under the window, facing the camera (+z).
  sofa: {
    a: { x: 1.25, z: -2.62, rotY: 0, seatY: 0.5 },
    b: { x: 2.25, z: -2.62, rotY: 0, seatY: 0.5 },
  },
  // Two chairs at the small table.
  table: {
    a: { x: 1.35, z: 2.8, rotY: Math.PI, seatY: 0.5 },
    b: { x: 1.35, z: 0.1, rotY: 0, seatY: 0.5 },
  },
  // On the bench in the garden platform (GARDEN_OFFSET -6.9,6.9 + bench seats).
  garden: {
    a: { x: -8.5, z: 7.3, rotY: Math.PI / 2, seatY: 0.5 },
    b: { x: -8.5, z: 8.0, rotY: Math.PI / 2, seatY: 0.5 },
  },
  // Curled up on the sage reading couch (RestNook) on the right, beside the
  // sofa — a quiet spot of its own, away from the fire and the table.
  rest: {
    a: { x: 2.45, z: -1.0, rotY: -Math.PI / 2, seatY: 0.45 },
    b: { x: 2.45, z: -0.25, rotY: -Math.PI / 2, seatY: 0.45 },
  },
  // Sitting close together on the bed in the bedroom platform (BEDROOM_OFFSET
  // 6.6,-6.6 + the bed's local seats). Seat height = bed surface (0.75).
  romantic: {
    a: { x: 6.25, z: -7.3, rotY: 0.28, seatY: 0.75 },
    b: { x: 6.95, z: -7.3, rotY: -0.28, seatY: 0.75 },
  },
};
