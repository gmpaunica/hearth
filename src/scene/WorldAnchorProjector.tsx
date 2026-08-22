import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { useHomeStore } from '@/state/homeStore';
import { useWorldAnchorStore, type ProjectedWorldAnchor, type WorldAnchorId } from '@/state/worldAnchorStore';

const WORLD_ANCHORS: Record<WorldAnchorId, [number, number, number]> = {
  fireplace: [-2.05, 2.35, -3.05],
  garden: [-12.4, 2.1, 4.35],
  sofa: [0.62, 2.15, -3.05],
  table: [0.1, 2.15, 0.65],
  rest: [-2.45, 1.85, 3.1],
  romantic: [4.5, 2.55, -7.2],
  drawing: [-4.28, 2.55, 1.05],
  fireplace_readiness: [-2.05, 3.28, -3.45],
};

/** Publishes stable screen projections without coupling overlay React views to
 * the Three renderer. Off-camera coordinates are deliberately preserved so
 * the bubble can clamp and point back toward the hidden room. */
export function WorldAnchorProjector() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const vector = useRef(new THREE.Vector3());
  const frame = useRef(0);
  const scene = useHomeStore((state) => state.resolved);
  const resolvedAnchor = (role: keyof typeof scene.roles, fallback: [number, number, number]) => {
    const object = scene.roles[role];
    return object ? scene.overlayAnchors[object.id] ?? fallback : fallback;
  };
  const fireplace = resolvedAnchor('fireplace', WORLD_ANCHORS.fireplace);
  const worldAnchors: Record<WorldAnchorId, [number, number, number]> = {
    fireplace,
    garden: resolvedAnchor('garden_portal', WORLD_ANCHORS.garden),
    sofa: resolvedAnchor('conversation_seating', WORLD_ANCHORS.sofa),
    table: resolvedAnchor('shared_table', WORLD_ANCHORS.table),
    rest: resolvedAnchor('rest_location', WORLD_ANCHORS.rest),
    romantic: resolvedAnchor('romantic_rest_location', WORLD_ANCHORS.romantic),
    drawing: resolvedAnchor('drawing_portal', WORLD_ANCHORS.drawing),
    fireplace_readiness: [fireplace[0], fireplace[1] + 0.38, fireplace[2]],
  };

  useFrame(() => {
    frame.current += 1;
    if (frame.current % 3 !== 0) return;
    const projected: Partial<Record<WorldAnchorId, ProjectedWorldAnchor>> = {};
    for (const [anchor, world] of Object.entries(worldAnchors) as [WorldAnchorId, [number, number, number]][]) {
      vector.current.set(...world).project(camera);
      projected[anchor] = {
        x: (vector.current.x * 0.5 + 0.5) * size.width,
        y: (-vector.current.y * 0.5 + 0.5) * size.height,
        occluded: vector.current.z < -1 || vector.current.z > 1,
      };
    }
    useWorldAnchorStore.getState().publish(projected);
  });

  return null;
}
