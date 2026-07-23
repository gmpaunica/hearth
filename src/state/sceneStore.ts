import { create } from 'zustand';

export type AtmosphereMode = 'warm' | 'cool' | 'rain';
export type SpotId = 'idle' | 'fireplace' | 'sofa' | 'table' | 'garden' | 'rest' | 'romantic';
export type AvatarKey = 'a' | 'b';

interface SceneState {
  atmosphere: AtmosphereMode;
  /** Timestamp (ms) of the last reconciliation glow trigger, or null. */
  glowStartedAt: number | null;
  /** Which spot the current glow (and its heart pop) is centred on. Lets the
   *  same warm payoff land over the fire *or* over the bed. */
  glowSpot: SpotId;
  spots: Record<AvatarKey, SpotId>;
  /** Bumped when avatars should jump to their spot instantly (no walk) — used
   *  when hydrating current state on launch so the app opens where things are. */
  snapAt: number;
  setAtmosphere: (mode: AtmosphereMode) => void;
  setSpot: (avatar: AvatarKey, spot: SpotId) => void;
  /** Fire the warm glow + heart pop, centred on `spot` (default: the fire). */
  triggerGlow: (spot?: SpotId) => void;
  /** Request the next spot application to be instantaneous. */
  requestSnap: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  atmosphere: 'warm',
  glowStartedAt: null,
  glowSpot: 'fireplace',
  spots: { a: 'idle', b: 'idle' },
  snapAt: 0,
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  setSpot: (avatar, spot) =>
    set((s) => ({ spots: { ...s.spots, [avatar]: spot } })),
  triggerGlow: (spot = 'fireplace') =>
    set({ glowStartedAt: Date.now(), glowSpot: spot, atmosphere: 'warm' }),
  requestSnap: () => set({ snapAt: Date.now() }),
}));
