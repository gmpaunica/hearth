import { create } from 'zustand';

export type AtmosphereMode = 'warm' | 'cool' | 'rain';
export type SpotId = 'idle' | 'fireplace' | 'sofa' | 'table' | 'garden' | 'rest';
export type AvatarKey = 'a' | 'b';

interface SceneState {
  atmosphere: AtmosphereMode;
  /** Timestamp (ms) of the last reconciliation glow trigger, or null. */
  glowStartedAt: number | null;
  spots: Record<AvatarKey, SpotId>;
  /** Bumped when avatars should jump to their spot instantly (no walk) — used
   *  when hydrating current state on launch so the app opens where things are. */
  snapAt: number;
  setAtmosphere: (mode: AtmosphereMode) => void;
  setSpot: (avatar: AvatarKey, spot: SpotId) => void;
  triggerGlow: () => void;
  /** Request the next spot application to be instantaneous. */
  requestSnap: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  atmosphere: 'warm',
  glowStartedAt: null,
  spots: { a: 'idle', b: 'idle' },
  snapAt: 0,
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  setSpot: (avatar, spot) =>
    set((s) => ({ spots: { ...s.spots, [avatar]: spot } })),
  triggerGlow: () => set({ glowStartedAt: Date.now(), atmosphere: 'warm' }),
  requestSnap: () => set({ snapAt: Date.now() }),
}));
