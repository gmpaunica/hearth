/* eslint-disable react-hooks/immutability, react-hooks/refs -- The R3F camera
 * bridge is deliberately mutable and PanResponder handlers own these refs. */
import { useEffect, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';

import { useHomeStudioStore } from '@/state/homeStudioStore';
import { useSceneStore } from '@/state/sceneStore';
import { camState, cancelCameraFocus, focusRoom } from './cameraState';
import { clampCameraOffset, nearestRoom } from './roomNavigation';

// The screen-right axis projected onto the world ground plane for the fixed
// isometric camera. The rail supplies depth while the gesture stays horizontal.
const RIGHT = { x: 0.7071, z: -0.7071 };

/**
 * Horizontal room-rail handlers for the scene container. Vertical movement is
 * left to sheets and scroll views; release always settles on a named room.
 */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const WHEEL_ZOOM_SPEED = 0.0025;
let wheelSnapTimer: ReturnType<typeof setTimeout> | null = null;

function moveCameraByPixels(dpx: number) {
  const k = 1 / Math.max(camState.zoom, 1);
  const sx = -dpx * k;
  const next = clampCameraOffset(
    camState.offX + RIGHT.x * sx,
    camState.offZ + RIGHT.z * sx,
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
        useHomeStudioStore.getState().draggingObjectId == null
        && (e.nativeEvent.touches.length >= 2
          || (Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2)),
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
        last.current = { x: g.dx, y: g.dy };
        moveCameraByPixels(dpx);
      },
      onPanResponderRelease: (_e, g) => {
        camState.dragging = false;
        if (pinched.current) {
          pinch.current = null;
          pinched.current = false;
          camState.velocityX = 0;
          camState.velocityZ = 0;
          const room = nearestRoom(camState.offX, camState.offZ).stop.id;
          focusRoom(room, useSceneStore.getState().reduceMotion);
          return;
        }
        const projectedPixels = g.vx * 110;
        const projected = clampCameraOffset(
          camState.offX - RIGHT.x * projectedPixels / Math.max(camState.zoom, 1),
          camState.offZ - RIGHT.z * projectedPixels / Math.max(camState.zoom, 1),
          camState.zoomMul,
        );
        const room = nearestRoom(projected.x, projected.z).stop.id;
        focusRoom(room, useSceneStore.getState().reduceMotion);
      },
      onPanResponderTerminate: () => {
        pinch.current = null;
        pinched.current = false;
        camState.dragging = false;
        camState.velocityX = 0;
        camState.velocityZ = 0;
        const room = nearestRoom(camState.offX, camState.offZ).stop.id;
        focusRoom(room, useSceneStore.getState().reduceMotion);
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

      const scrollX = wheel.shiftKey || rawX === 0 ? rawY : rawX;
      cancelCameraFocus();
      moveCameraByPixels(-scrollX);
      if (wheelSnapTimer) clearTimeout(wheelSnapTimer);
      wheelSnapTimer = setTimeout(() => {
        const room = nearestRoom(camState.offX, camState.offZ).stop.id;
        focusRoom(room, useSceneStore.getState().reduceMotion);
      }, 140);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelSnapTimer) clearTimeout(wheelSnapTimer);
    };
  }, []);

  return responder.panHandlers;
}
