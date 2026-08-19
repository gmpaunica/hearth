import { create } from 'zustand';

import {
  getMusicEnabled,
  getMusicVolume,
  type MusicVolumePreset,
  setMusicEnabledPref,
  setMusicVolumePref,
} from '@/lib/prefs';

export const MUSIC_VOLUME_VALUES: Record<MusicVolumePreset, number> = {
  quiet: 0.18,
  gentle: 0.32,
  full: 0.55,
};

export const MUSIC_VOLUME_OPTIONS: { id: MusicVolumePreset; label: string }[] = [
  { id: 'quiet', label: 'Quiet' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'full', label: 'Full' },
];

export type MusicPlaybackState = 'off' | 'loading' | 'playing' | 'waiting' | 'error';

type MusicState = {
  enabled: boolean;
  volume: MusicVolumePreset;
  hydrated: boolean;
  playback: MusicPlaybackState;
  playbackDetail: string | null;
  retryToken: number;
  mediaSessionBusy: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: MusicVolumePreset) => void;
  setPlaybackStatus: (playback: MusicPlaybackState, detail?: string | null) => void;
  retryPlayback: () => void;
  setMediaSessionBusy: (busy: boolean) => void;
};

let hydration: Promise<void> | null = null;

export const useMusicStore = create<MusicState>((set, get) => ({
  enabled: true,
  volume: 'gentle',
  hydrated: false,
  playback: 'loading',
  playbackDetail: null,
  retryToken: 0,
  mediaSessionBusy: false,

  hydrate: async () => {
    if (get().hydrated) return;
    if (!hydration) {
      hydration = Promise.all([getMusicEnabled(), getMusicVolume()])
        .then(([enabled, volume]) => set({ enabled, volume, hydrated: true }))
        .finally(() => {
          hydration = null;
        });
    }
    await hydration;
  },

  setEnabled: (enabled) => {
    set({ enabled, hydrated: true });
    void setMusicEnabledPref(enabled);
  },

  setVolume: (volume) => {
    set({ volume, hydrated: true });
    void setMusicVolumePref(volume);
  },

  setPlaybackStatus: (playback, detail = null) => {
    const current = get();
    if (current.playback === playback && current.playbackDetail === detail) return;
    set({ playback, playbackDetail: detail });
  },

  retryPlayback: () => set((state) => ({ retryToken: state.retryToken + 1 })),
  setMediaSessionBusy: (mediaSessionBusy) => set({ mediaSessionBusy }),
}));
