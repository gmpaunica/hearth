import type { AvatarKey, SpotId } from '@/state/sceneStore';

export interface SpotPose {
  /** World position on the floor (x, z). */
  x: number;
  z: number;
  /** Facing direction once arrived (radians, 0 = facing +z / camera-ish). */
  rotY: number;
  /** Seat surface height; 0 means standing. Floor-sitting uses a small value. */
  seatY: number;
  /** Clear floor point used before settling into furniture. */
  approach?: { x: number; z: number };
  /** Clear floor point reached before a seated avatar becomes fully upright. */
  egress?: { x: number; z: number; rotY: number };
}

// Isometric corner room: back wall at z=-3.25, left wall at x=-3.25,
// floor open toward +x/+z (the camera looks in from (+,+)).
export const SPOTS: Record<SpotId, Record<AvatarKey, SpotPose>> = {
  idle: {
    // Flank the conversation table in clear foreground floor space. The old
    // points sat inside its conservative collider and visually buried both
    // characters behind chairs as soon as the furnished home loaded.
    a: { x: -1.45, z: 1.45, rotY: 0.35, seatY: 0 },
    b: { x: 1.75, z: 1.35, rotY: -0.25, seatY: 0 },
  },
  // Sitting on the rug before the fire, angled slightly toward each other.
  fireplace: {
    a: {
      x: -2.55, z: -2.35, rotY: Math.PI - 0.45, seatY: 0.1,
      approach: { x: -2.55, z: -1.95 },
      egress: { x: -2.55, z: -1.95, rotY: 0 },
    },
    b: {
      x: -1.55, z: -2.35, rotY: Math.PI + 0.45, seatY: 0.1,
      approach: { x: -1.55, z: -1.95 },
      egress: { x: -1.55, z: -1.95, rotY: 0 },
    },
  },
  // Sofa against the back wall under the window, facing the camera (+z).
  sofa: {
    // Sit on the front half of the first two cushions. At the room's 45-degree
    // camera this keeps each torso in front of the back cushions, and moving B
    // inboard prevents the near rolled arm from visually swallowing the legs.
    a: {
      x: 0.25, z: -2.82, rotY: 0, seatY: 0.5,
      approach: { x: 0.25, z: -2.28 },
      egress: { x: 0.25, z: -2.28, rotY: 0 },
    },
    b: {
      x: 1, z: -2.82, rotY: 0, seatY: 0.5,
      approach: { x: 1.15, z: -2.28 },
      egress: { x: 1.15, z: -2.28, rotY: 0 },
    },
  },
  // Two chairs at the small table.
  table: {
    a: {
      x: 0.25, z: 2.2, rotY: Math.PI, seatY: 0.4,
      approach: { x: 1.2, z: 2.2 },
      egress: { x: 1.2, z: 2.2, rotY: Math.PI / 2 },
    },
    b: {
      x: 0.25, z: -0.25, rotY: 0, seatY: 0.4,
      approach: { x: 1.2, z: -0.25 },
      egress: { x: 1.2, z: -0.25, rotY: Math.PI / 2 },
    },
  },
  // On the bench in its own open lawn pocket west of the tree-to-pond path.
  garden: {
    a: {
      x: -12.4, z: 3.93, rotY: Math.PI / 2, seatY: 0.5,
      approach: { x: -11.65, z: 3.93 },
      egress: { x: -11.65, z: 3.93, rotY: Math.PI / 2 },
    },
    b: {
      x: -12.4, z: 4.77, rotY: Math.PI / 2, seatY: 0.5,
      approach: { x: -11.65, z: 4.77 },
      egress: { x: -11.65, z: 4.77, rotY: Math.PI / 2 },
    },
  },
  garden_arch: {
    a: { x: -5.2, z: 2.55, rotY: -Math.PI / 2, seatY: 0 },
    b: { x: -5.2, z: 3.15, rotY: -Math.PI / 2, seatY: 0 },
  },
  // Resting on the compact quiet mat in the open front-left corner.
  rest: {
    a: {
      x: -2.87, z: 3.52, rotY: Math.PI, seatY: 0.2,
      approach: { x: -2.87, z: 2.75 },
      egress: { x: -2.87, z: 2.75, rotY: 0 },
    },
    b: {
      x: -2.03, z: 3.52, rotY: Math.PI, seatY: 0.2,
      approach: { x: -2.03, z: 2.75 },
      egress: { x: -2.03, z: 2.75, rotY: 0 },
    },
  },
  // Sitting close together on the bed behind the shared-wall arch
  // (BEDROOM_OFFSET 4.5,-6.5 + the bed's local seats).
  romantic: {
    a: {
      x: 4.08, z: -7.2, rotY: 0.28, seatY: 0.75,
      approach: { x: 3.9, z: -6.05 },
      egress: { x: 3.9, z: -6.05, rotY: 0 },
    },
    b: {
      x: 4.92, z: -7.2, rotY: -0.28, seatY: 0.75,
      approach: { x: 5.08, z: -6.05 },
      egress: { x: 5.08, z: -6.05, rotY: 0 },
    },
  },
};
