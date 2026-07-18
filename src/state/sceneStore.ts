import { create } from 'zustand';

export type AtmosphereMode = 'warm' | 'cool' | 'rain';
export type SpotId = 'idle' | 'fireplace' | 'sofa' | 'table' | 'garden' | 'rest';
export type AvatarKey = 'a' | 'b';

interface SceneState {
  atmosphere: AtmosphereMode;
  /** Timestamp (ms) of the last reconciliation glow trigger, or null. */
  glowStartedAt: number | null;
  spots: Record<AvatarKey, SpotId>;
  setAtmosphere: (mode: AtmosphereMode) => void;
  setSpot: (avatar: AvatarKey, spot: SpotId) => void;
  triggerGlow: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  atmosphere: 'warm',
  glowStartedAt: null,
  spots: { a: 'idle', b: 'idle' },
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  setSpot: (avatar, spot) =>
    set((s) => ({ spots: { ...s.spots, [avatar]: spot } })),
  triggerGlow: () => set({ glowStartedAt: Date.now(), atmosphere: 'warm' }),
}));
