/* eslint-disable react-hooks/immutability, react-hooks/refs -- The R3F camera
 * bridge is deliberately mutable and PanResponder handlers own these refs. */
import { useEffect, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';

import { camState, cancelCameraFocus } from './cameraState';
import { clampCameraOffset } from './roomNavigation';

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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const FLING_SCALE = 7.5;
const MAX_FLING = 3.2;
const WHEEL_ZOOM_SPEED = 0.0025;

function moveCameraByPixels(dpx: number, dpy: number) {
  const k = 1 / Math.max(camState.zoom, 1);
  const sx = -dpx * k;
  const sy = dpy * k;
  const next = clampCameraOffset(
    camState.offX + RIGHT.x * sx + UP.x * sy,
    camState.offZ + RIGHT.z * sx + UP.z * sy,
    camState.zoomMul,
  );
  camState.offX = next.x;
  camState.offZ = next.z;
  camState.velocityX = 0;
  camState.velocityZ = 0;
}

export function useScenePan() {
  const last = useRef({ x: 0, y: 0 });
  const pinch = useRef<{ dist: number; mul: number } | null>(null);
  const pinched = useRef(false);
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, g) =>
        e.nativeEvent.touches.length >= 2 || Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: (e, g) => {
        cancelCameraFocus();
        last.current = { x: g.dx, y: g.dy };
        pinch.current = null;
        pinched.current = e.nativeEvent.touches.length >= 2;
        camState.dragging = true;
        camState.velocityX = 0;
        camState.velocityZ = 0;
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        // Two fingers → pinch zoom.
        if (touches.length >= 2) {
          pinched.current = true;
          const d = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          if (!pinch.current) {
            pinch.current = { dist: d, mul: camState.zoomMul };
          } else if (pinch.current.dist > 0) {
            camState.zoomMul = clamp(pinch.current.mul * (d / pinch.current.dist), 0.9, 4.5);
          }
          return;
        }
        // Back to one finger after a pinch: rebase the pan origin, skip a frame.
        if (pinch.current) {
          pinch.current = null;
          last.current = { x: g.dx, y: g.dy };
          return;
        }
        const dpx = g.dx - last.current.x;
        const dpy = g.dy - last.current.y;
        last.current = { x: g.dx, y: g.dy };
        // Horizontal: move the camera opposite the drag so the world tracks the
        // finger. Vertical reads correctly with the same sign as the drag (the
        // depth axis flips how "up" maps onto the ground).
        moveCameraByPixels(dpx, dpy);
      },
      onPanResponderRelease: (_e, g) => {
        camState.dragging = false;
        if (pinched.current) {
          pinch.current = null;
          pinched.current = false;
          camState.velocityX = 0;
          camState.velocityZ = 0;
          return;
        }
        const sx = -g.vx * FLING_SCALE;
        const sy = g.vy * FLING_SCALE;
        camState.velocityX = clamp(RIGHT.x * sx + UP.x * sy, -MAX_FLING, MAX_FLING);
        camState.velocityZ = clamp(RIGHT.z * sx + UP.z * sy, -MAX_FLING, MAX_FLING);
      },
      onPanResponderTerminate: () => {
        pinch.current = null;
        pinched.current = false;
        camState.dragging = false;
        camState.velocityX = 0;
        camState.velocityZ = 0;
      },
    }),
  ).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onWheel = (wheel: WheelEvent) => {
      // Listen natively so Chrome lets us prevent page zoom/scroll, but only
      // claim wheel input whose pointer is actually over the WebGL scene.
      if (!(wheel.target instanceof HTMLCanvasElement)) return;
      wheel.preventDefault();
      const unit = wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? 600 : 1;
      const rawX = wheel.deltaX * unit;
      const rawY = wheel.deltaY * unit;

      // Trackpad pinch arrives in Chrome as ctrl+wheel. Ordinary wheel or
      // two-finger scrolling pans the map; Shift+wheel pans sideways.
      if (wheel.ctrlKey) {
        cancelCameraFocus();
        camState.zoomMul = clamp(
          camState.zoomMul * Math.exp(-rawY * WHEEL_ZOOM_SPEED),
          0.9,
          4.5,
        );
        const next = clampCameraOffset(camState.offX, camState.offZ, camState.zoomMul);
        camState.offX = next.x;
        camState.offZ = next.z;
        camState.velocityX = 0;
        camState.velocityZ = 0;
        return;
      }

      const scrollX = wheel.shiftKey && rawX === 0 ? rawY : rawX;
      cancelCameraFocus();
      const scrollY = wheel.shiftKey ? 0 : rawY;
      moveCameraByPixels(-scrollX, -scrollY);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return responder.panHandlers;
}
