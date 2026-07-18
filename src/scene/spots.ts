import type { AvatarKey, SpotId } from '@/state/sceneStore';

export interface SpotPose {
  /** World position on the floor (x, z). */
  x: number;
  z: number;
  /** Facing direction once arrived (radians, 0 = facing +z / camera). */
  rotY: number;
  /** Seat height; 0 means standing. Floor-sitting uses a small value. */
  seatY: number;
}

// Room bounds: x in [-2.7, 2.7], z in [-4.2 (back wall), 4.4 (open front)].
export const SPOTS: Record<SpotId, Record<AvatarKey, SpotPose>> = {
  idle: {
    a: { x: -0.35, z: 0.35, rotY: 0.3, seatY: 0 },
    b: { x: 1.0, z: -0.55, rotY: -0.3, seatY: 0 },
  },
  // Sitting on the rug in front of the fire, facing the fireplace (-z).
  fireplace: {
    a: { x: -1.72, z: -2.5, rotY: Math.PI, seatY: 0.1 },
    b: { x: -0.48, z: -2.5, rotY: Math.PI, seatY: 0.1 },
  },
  // Sofa along the right wall, seats face into the room (-x).
  sofa: {
    a: { x: 2.1, z: -0.4, rotY: -Math.PI / 2, seatY: 0.58 },
    b: { x: 2.1, z: 0.7, rotY: -Math.PI / 2, seatY: 0.58 },
  },
  // Two chairs at the small table.
  table: {
    a: { x: -0.9, z: 2.78, rotY: Math.PI, seatY: 0.49 },
    b: { x: -0.9, z: 1.22, rotY: 0, seatY: 0.49 },
  },
  // Bench beside the garden door on the left wall.
  garden: {
    a: { x: -2.38, z: 2.85, rotY: Math.PI / 2, seatY: 0.47 },
    b: { x: -2.38, z: 3.45, rotY: Math.PI / 2, seatY: 0.47 },
  },
  // Standing near the bedroom doorway on the right wall.
  rest: {
    a: { x: 2.05, z: -2.95, rotY: Math.PI / 2, seatY: 0 },
    b: { x: 2.05, z: -2.25, rotY: Math.PI / 2, seatY: 0 },
  },
};
