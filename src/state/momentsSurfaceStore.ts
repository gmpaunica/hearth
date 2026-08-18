import { create } from 'zustand';

type MomentsView = 'moments' | 'new';

interface MomentsSurfaceState {
  expanded: boolean;
  dismissing: boolean;
  view: MomentsView;
  settingsOpen: boolean;
  appVisible: boolean;
  hearthOpen: boolean;
  openMoments: () => void;
  openComposer: () => void;
  minimize: () => void;
  completeMinimize: () => void;
  setSettingsOpen: (open: boolean) => void;
  setAppVisible: (visible: boolean) => void;
  openHearth: () => void;
  closeHearth: () => void;
}

/** UI-only state: every app launch starts minimized and data sync never opens it. */
export const useMomentsSurfaceStore = create<MomentsSurfaceState>((set) => ({
  expanded: false,
  dismissing: false,
  view: 'moments',
  settingsOpen: false,
  appVisible: true,
  hearthOpen: false,
  openMoments: () => set({ expanded: true, dismissing: false, view: 'moments', hearthOpen: false }),
  openComposer: () => set({ expanded: true, dismissing: false, view: 'new', hearthOpen: false }),
  minimize: () => set({ expanded: false, dismissing: false, view: 'moments' }),
  completeMinimize: () => set({ expanded: false, dismissing: false, view: 'moments' }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setAppVisible: (appVisible) => set({ appVisible }),
  openHearth: () => set({ hearthOpen: true, expanded: false, dismissing: false, view: 'moments' }),
  closeHearth: () => set({ hearthOpen: false }),
}));
