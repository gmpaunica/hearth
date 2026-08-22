import type { RoomId } from './roomNavigation';
import type { MomentDestination } from '@/lib/db';
import { getResolvedHomeScene } from '@/state/homeStore';

/** Close, readable default frame. Neighbouring rooms remain discoverable by
 * panning; the home no longer shrinks to a thumbnail just to fit every edge. */
export const HOME_CAMERA_FRAME = {
  centerX: 0,
  centerZ: 0,
  viewW: 12.5,
  viewH: 11.5,
} as const;

// Mutable camera-pan state, shared between the drag gesture (outside the Canvas)
// and CameraRig (inside it). Plain object, not React state, so dragging never
// triggers a re-render — CameraRig just reads it each frame.
export const camState = {
  /** World-ground pan offset, added to both the camera position and its target. */
  offX: 0,
  offZ: 0,
  /** Current orthographic zoom (px per world unit), published by CameraRig so
   *  the gesture can turn a pixel drag into a world distance. */
  zoom: 50,
  /** Small world-space velocity applied after release for subtle inertial pan. */
  velocityX: 0,
  velocityZ: 0,
  dragging: false,
  /** Pinch-zoom multiplier on the responsive base zoom (1 = default fit). */
  zoomMul: 1,
  /** World point the camera frames by default (the home base / living room). */
  centerX: HOME_CAMERA_FRAME.centerX,
  centerZ: HOME_CAMERA_FRAME.centerZ,
  /** World units the fitted view spans across width / height. Larger = more
   *  zoomed out; widened when there are neighbouring rooms so they peek in. */
  // Match HomeScene's stable overview from the first rendered frame so the
  // app never performs a startup zoom before the effect initializes it.
  viewW: HOME_CAMERA_FRAME.viewW,
  viewH: HOME_CAMERA_FRAME.viewH,
  focusTarget: null as { x: number; z: number } | null,
};

let momentRestore: { x: number; z: number; zoomMul: number; instant: boolean } | null = null;

const FOCUS_OFFSETS: Record<MomentDestination, { x: number; z: number }> = {
  fireplace: { x: -1.8, z: -1.8 },
  garden: { x: -10, z: 2 },
  sofa: { x: 0, z: -1.8 },
  table: { x: 0, z: 0.7 },
  rest: { x: -1.5, z: 1.7 },
  romantic: { x: 4.5, z: -6.5 },
};

function resolvedFocus(destination: MomentDestination) {
  const spot = getResolvedHomeScene().interactionSpots[destination];
  if (!spot) return FOCUS_OFFSETS[destination];
  return {
    x: (spot.a.x + spot.b.x) / 2,
    z: (spot.a.z + spot.b.z) / 2,
  };
}

export function requestMomentCameraFocus(destination: MomentDestination, instant = false) {
  if (!momentRestore) {
    momentRestore = { x: camState.offX, z: camState.offZ, zoomMul: camState.zoomMul, instant };
  }
  const focus = resolvedFocus(destination);
  if (instant) {
    camState.offX = focus.x;
    camState.offZ = focus.z;
    camState.focusTarget = null;
  } else {
    camState.focusTarget = focus;
  }
  camState.velocityX = 0;
  camState.velocityZ = 0;
}

export function restoreMomentCameraFocus() {
  if (!momentRestore) return;
  if (momentRestore.instant) {
    camState.offX = momentRestore.x;
    camState.offZ = momentRestore.z;
    camState.focusTarget = null;
  } else {
    camState.focusTarget = { x: momentRestore.x, z: momentRestore.z };
  }
  camState.zoomMul = momentRestore.zoomMul;
  camState.velocityX = 0;
  camState.velocityZ = 0;
  momentRestore = null;
}

export function cancelCameraFocus() {
  camState.focusTarget = null;
  momentRestore = null;
}

let focusedRoom: RoomId | null = 'living';
const focusListeners = new Set<() => void>();

export function publishFocusedRoom(room: RoomId | null) {
  if (room === focusedRoom) return;
  focusedRoom = room;
  focusListeners.forEach((listener) => listener());
}

export const getFocusedRoom = () => focusedRoom;
export const subscribeFocusedRoom = (listener: () => void) => {
  focusListeners.add(listener);
  return () => {
    focusListeners.delete(listener);
  };
};
