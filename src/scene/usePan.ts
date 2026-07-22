import { useRef } from 'react';
import { PanResponder } from 'react-native';

import { camState, clampPan } from './cameraState';

// Screen axes projected onto the world ground plane, for the fixed 45°/~30°
// isometric camera. Dragging horizontally moves along `RIGHT`; vertically along
// `UP` (into/out of the room). Lengths are ~1; the depth axis is a touch
// compressed on screen, which we accept for now.
const RIGHT = { x: 0.7071, z: -0.7071 };
const UP = { x: -0.7071, z: -0.7071 };

/**
 * Pan handlers for the scene container: drag to scroll the home around. Content
 * follows the finger (drag right → the room slides right), clamped to
 * `camState.limit`. Only claims the gesture on an actual drag, so taps still
 * reach the UI above.
 */
export function useScenePan() {
  const last = useRef({ x: 0, y: 0 });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: (_e, g) => {
        last.current = { x: g.dx, y: g.dy };
      },
      onPanResponderMove: (_e, g) => {
        const dpx = g.dx - last.current.x;
        const dpy = g.dy - last.current.y;
        last.current = { x: g.dx, y: g.dy };
        const k = 1 / Math.max(camState.zoom, 1);
        // Horizontal: move the camera opposite the drag so the world tracks the
        // finger. Vertical reads correctly with the same sign as the drag (the
        // depth axis flips how "up" maps onto the ground).
        const sx = -dpx * k;
        const sy = dpy * k;
        const dX = RIGHT.x * sx + UP.x * sy;
        const dZ = RIGHT.z * sx + UP.z * sy;
        camState.offX = clampPan(camState.offX + dX, camState.limit);
        camState.offZ = clampPan(camState.offZ + dZ, camState.limit);
      },
    }),
  ).current;
  return responder.panHandlers;
}
