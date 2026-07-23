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
  // Bench beside the garden door on the left wall.
  garden: {
    a: { x: -2.6, z: 0.55, rotY: Math.PI / 2, seatY: 0.5 },
    b: { x: -2.6, z: 1.25, rotY: Math.PI / 2, seatY: 0.5 },
  },
  // Curled up on the sage rest couch (RestNook) along the right edge, facing
  // into the room — a quiet place of its own, away from the fire.
  rest: {
    a: { x: 2.45, z: 0.7, rotY: -Math.PI / 2, seatY: 0.45 },
    b: { x: 2.45, z: 1.45, rotY: -Math.PI / 2, seatY: 0.45 },
  },
  // Sitting close together on the edge of the bed in the back-right bedroom
  // nook, turned gently toward each other. Seat height = bed surface (0.75).
  romantic: {
    a: { x: 3.95, z: -1.65, rotY: 0.28, seatY: 0.75 },
    b: { x: 4.75, z: -1.65, rotY: -0.28, seatY: 0.75 },
  },
};
