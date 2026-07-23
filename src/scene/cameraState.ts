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
  /** How far the view may pan from centre (world units). Widens as the home
   *  grows so there's more to explore; snug at the start. */
  limit: 1.6,
  /** Pinch-zoom multiplier on the responsive base zoom (1 = default fit). */
  zoomMul: 1,
  /** World point the camera frames by default (the home base / living room). */
  centerX: 0,
  centerZ: 0,
  /** World units the fitted view spans across width / height. Larger = more
   *  zoomed out; widened when there are neighbouring rooms so they peek in. */
  viewW: 8.2,
  viewH: 8.0,
};

export const clampPan = (v: number, limit: number) =>
  Math.min(limit, Math.max(-limit, v));
