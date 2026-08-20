import { create } from 'zustand';

import { getHomeControlsHidden, setHomeControlsHiddenPref } from '@/lib/prefs';

interface HomeUiState {
  controlsHidden: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setControlsHidden: (hidden: boolean) => void;
}

/** Device-local presentation controls. They never affect the shared home. */
export const useHomeUiStore = create<HomeUiState>((set, get) => ({
  controlsHidden: false,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const controlsHidden = await getHomeControlsHidden();
    set({ controlsHidden, hydrated: true });
  },
  setControlsHidden: (controlsHidden) => {
    set({ controlsHidden, hydrated: true });
    void setHomeControlsHiddenPref(controlsHidden);
  },
}));
