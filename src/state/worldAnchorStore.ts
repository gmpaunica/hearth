import { create } from 'zustand';

import type { SpatialReactionAnchor } from './momentV2Store';

export type WorldAnchorId = SpatialReactionAnchor | 'fireplace_readiness';

export interface ProjectedWorldAnchor {
  x: number;
  y: number;
  occluded: boolean;
}

interface WorldAnchorState {
  anchors: Partial<Record<WorldAnchorId, ProjectedWorldAnchor>>;
  publish: (anchors: Partial<Record<WorldAnchorId, ProjectedWorldAnchor>>) => void;
}

export const useWorldAnchorStore = create<WorldAnchorState>((set) => ({
  anchors: {},
  publish: (anchors) => set({ anchors }),
}));
