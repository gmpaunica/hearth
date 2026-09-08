import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { useAuthStore } from './authStore';

const STORAGE_VERSION = 'v1';

function preferenceKey(coupleId: string, userId: string) {
  return `hearth.ritual-preferences.${STORAGE_VERSION}.${coupleId}.${userId}`;
}

function currentScope() {
  const auth = useAuthStore.getState();
  return auth.couple?.id && auth.userId
    ? { coupleId: auth.couple.id, userId: auth.userId }
    : null;
}

interface RitualPreferencesState {
  sketchReminderEnabled: boolean;
  hydratedScope: string | null;
  hydrate: () => Promise<void>;
  setSketchReminderEnabled: (enabled: boolean) => Promise<void>;
  reset: () => void;
}

/**
 * Personal ritual preferences stay on this device. They never expose whether
 * either partner participated and they do not change the shared fire state.
 */
export const useRitualPreferencesStore = create<RitualPreferencesState>((set) => ({
  sketchReminderEnabled: true,
  hydratedScope: null,

  hydrate: async () => {
    const scope = currentScope();
    if (!scope) return;
    const key = preferenceKey(scope.coupleId, scope.userId);
    const saved = await AsyncStorage.getItem(key);
    set({
      sketchReminderEnabled: saved !== 'off',
      hydratedScope: key,
    });
  },

  setSketchReminderEnabled: async (enabled) => {
    const scope = currentScope();
    set({ sketchReminderEnabled: enabled });
    if (!scope) return;
    const key = preferenceKey(scope.coupleId, scope.userId);
    await AsyncStorage.setItem(key, enabled ? 'on' : 'off');
    set({ hydratedScope: key });
  },

  reset: () => set({ sketchReminderEnabled: true, hydratedScope: null }),
}));
