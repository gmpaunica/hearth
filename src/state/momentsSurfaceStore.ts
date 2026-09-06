import { create } from 'zustand';

export type MomentsView = 'moments' | 'new';

/**
 * Every full-screen or modal home experience is represented here. Keeping the
 * active surface as one discriminated value prevents Settings, Moments, the
 * drawer, drawing, and Home Studio from stacking over one another.
 */
export type HomeSurface =
  | { kind: 'none' }
  | { kind: 'moments'; view: MomentsView }
  | { kind: 'hearth' }
  | { kind: 'settings' }
  | { kind: 'drawer' }
  | { kind: 'drawing'; view: 'today' | 'sketchbook' }
  | { kind: 'studio'; mode: 'decorate' | 'developer' };

interface MomentsSurfaceState {
  surface: HomeSurface;
  appVisible: boolean;
  openMoments: () => void;
  openComposer: () => void;
  minimize: () => void;
  completeMinimize: () => void;
  openSettings: () => void;
  openDrawer: () => void;
  openDrawing: (view?: 'today' | 'sketchbook') => void;
  openStudio: (mode: 'decorate' | 'developer') => void;
  closeSurface: () => void;
  setAppVisible: (visible: boolean) => void;
  openHearth: () => void;
  closeHearth: () => void;
}

/** UI-only state: every app launch starts minimized and data sync never opens it. */
export const useMomentsSurfaceStore = create<MomentsSurfaceState>((set) => ({
  surface: { kind: 'none' },
  appVisible: true,
  openMoments: () => set({ surface: { kind: 'moments', view: 'moments' } }),
  openComposer: () => set({ surface: { kind: 'moments', view: 'new' } }),
  minimize: () => set({ surface: { kind: 'none' } }),
  completeMinimize: () => set({ surface: { kind: 'none' } }),
  openSettings: () => set({ surface: { kind: 'settings' } }),
  openDrawer: () => set({ surface: { kind: 'drawer' } }),
  openDrawing: (view = 'today') => set({ surface: { kind: 'drawing', view } }),
  openStudio: (mode) => set({ surface: { kind: 'studio', mode } }),
  closeSurface: () => set({ surface: { kind: 'none' } }),
  setAppVisible: (appVisible) => set({ appVisible }),
  openHearth: () => set({ surface: { kind: 'hearth' } }),
  closeHearth: () => set({ surface: { kind: 'none' } }),
}));

export function homeSurfaceAllowsPlayback(state: Pick<MomentsSurfaceState, 'surface' | 'appVisible'>) {
  return state.surface.kind === 'none' && state.appVisible;
}
