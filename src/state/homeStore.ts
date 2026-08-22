import { create } from 'zustand';

import { fetchHomeSnapshot } from '@/home/api';
import { LEGACY_COTTAGE_V2_SNAPSHOT } from '@/home/layouts';
import { resolveHomeScene } from '@/home/resolver';
import type { HomeSnapshot, ResolvedHomeScene } from '@/home/types';
import { setRoomNavigationSource } from '@/scene/roomNavigation';
import { setSceneNavigationSource } from '@/scene/sceneNavigation';
import { setSpotSource } from '@/scene/spots';

export type HomeLoadStatus = 'fallback' | 'loading' | 'ready' | 'error';

interface HomeState {
  snapshot: HomeSnapshot;
  resolved: ResolvedHomeScene;
  status: HomeLoadStatus;
  error: string | null;
  refresh: () => Promise<void>;
  ingestSnapshot: (snapshot: HomeSnapshot) => void;
  invalidate: (revision?: number) => void;
  reset: () => void;
}

const fallbackResolved = resolveHomeScene(LEGACY_COTTAGE_V2_SNAPSHOT);
let refreshInFlight: Promise<void> | null = null;
let homeEpoch = 0;

const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String((error as { message: unknown }).message)
  : 'The shared home could not be refreshed.';

export const useHomeStore = create<HomeState>((set, get) => ({
  snapshot: LEGACY_COTTAGE_V2_SNAPSHOT,
  resolved: fallbackResolved,
  status: 'fallback',
  error: null,

  refresh: async () => {
    if (refreshInFlight) return refreshInFlight;
    const requestEpoch = homeEpoch;
    set((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading', error: null }));
    const request = fetchHomeSnapshot()
      .then((snapshot) => {
        if (requestEpoch !== homeEpoch || !snapshot.paired) return;
        get().ingestSnapshot(snapshot);
      })
      .catch((error) => {
        if (requestEpoch !== homeEpoch) return;
        // During the additive migration window the preview must remain usable.
        // Keep the known-good 1.0.4 layout mounted and surface diagnostics only.
        set((state) => ({
          status: state.snapshot.revision > 0 ? 'error' : 'fallback',
          error: errorMessage(error),
        }));
      })
      .finally(() => {
        if (refreshInFlight === request) refreshInFlight = null;
      });
    refreshInFlight = request;
    return request;
  },

  ingestSnapshot: (snapshot) => set({
    snapshot,
    resolved: resolveHomeScene(snapshot),
    status: 'ready',
    error: null,
  }),

  invalidate: (revision) => {
    if (revision !== undefined && revision <= get().snapshot.revision) return;
    void get().refresh();
  },

  reset: () => {
    homeEpoch += 1;
    refreshInFlight = null;
    set({
      snapshot: LEGACY_COTTAGE_V2_SNAPSHOT,
      resolved: fallbackResolved,
      status: 'fallback',
      error: null,
    });
  },
}));

export function getResolvedHomeScene(): ResolvedHomeScene {
  return useHomeStore.getState().resolved;
}

setRoomNavigationSource(() => useHomeStore.getState().resolved.cameraStops);
setSceneNavigationSource(() => {
  const scene = useHomeStore.getState().resolved;
  return { walkableZones: scene.walkableZones, colliders: scene.colliders };
});
setSpotSource(() => useHomeStore.getState().resolved.interactionSpots);
