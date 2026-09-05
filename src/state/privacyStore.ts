import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { create } from 'zustand';

import {
  clearPrivacyPreferences,
  createPinPreference,
  readPrivacyPreferences,
  verifyPinPreference,
  writePrivacyPreferences,
  type AppLockMode,
  type NotificationPrivacy,
  type PrivacyPreferences,
} from '@/lib/privacyPrefs';

const MAX_PIN_ATTEMPTS = 5;
const PIN_COOLDOWN_MS = 30_000;

interface PrivacyState {
  hydrated: boolean;
  hydratedForPaired: boolean | null;
  locked: boolean;
  preferences: PrivacyPreferences;
  deviceAuthenticationAvailable: boolean;
  failedPinAttempts: number;
  cooldownUntil: number | null;
  error: string | null;
  hydrate: (paired: boolean) => Promise<void>;
  lock: () => void;
  unlockWithDevice: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  setLockMode: (mode: Exclude<AppLockMode, 'pin'>) => Promise<boolean>;
  setDeviceLock: (fallbackPin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<boolean>;
  setNotificationPrivacy: (privacy: NotificationPrivacy) => Promise<boolean>;
  clearError: () => void;
  reset: () => Promise<void>;
}

const defaults: PrivacyPreferences = {
  version: 1,
  appLockMode: 'off',
  notificationPrivacy: 'generic',
};

async function canUseDeviceAuthentication(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  hydrated: false,
  hydratedForPaired: null,
  locked: false,
  preferences: defaults,
  deviceAuthenticationAvailable: false,
  failedPinAttempts: 0,
  cooldownUntil: null,
  error: null,

  hydrate: async (paired) => {
    const [preferences, available] = await Promise.all([
      readPrivacyPreferences(),
      canUseDeviceAuthentication(),
    ]);
    set({
      hydrated: true,
      hydratedForPaired: paired,
      preferences,
      deviceAuthenticationAvailable: available,
      locked: paired && preferences.appLockMode !== 'off',
      error: null,
    });
  },

  lock: () => {
    if (get().preferences.appLockMode !== 'off') set({ locked: true, error: null });
  },

  unlockWithDevice: async () => {
    if (Platform.OS === 'web') return false;
    set({ error: null });
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Open Hearth',
        promptDescription: 'Keep your shared home private.',
        fallbackLabel: 'Use device passcode',
        cancelLabel: 'Not now',
        disableDeviceFallback: false,
        biometricsSecurityLevel: 'strong',
      });
      if (result.success) {
        set({ locked: false, failedPinAttempts: 0, cooldownUntil: null });
        return true;
      }
      if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        set({ error: 'Hearth could not confirm it was you. Try again or use your local PIN.' });
      }
      return false;
    } catch {
      set({ error: 'Device authentication is unavailable right now. Use your local PIN if one is set.' });
      return false;
    }
  },

  unlockWithPin: async (pin) => {
    const now = Date.now();
    const { cooldownUntil, preferences, failedPinAttempts } = get();
    if (cooldownUntil && cooldownUntil > now) {
      set({ error: 'Too many tries. Wait a moment, then try again.' });
      return false;
    }
    if (await verifyPinPreference(preferences, pin)) {
      set({ locked: false, failedPinAttempts: 0, cooldownUntil: null, error: null });
      return true;
    }
    const attempts = failedPinAttempts + 1;
    const shouldCoolDown = attempts >= MAX_PIN_ATTEMPTS;
    set({
      failedPinAttempts: shouldCoolDown ? 0 : attempts,
      cooldownUntil: shouldCoolDown ? now + PIN_COOLDOWN_MS : null,
      error: shouldCoolDown
        ? 'Too many tries. Wait 30 seconds, then try again.'
        : 'That PIN did not match. Try again.',
    });
    return false;
  },

  setLockMode: async (mode) => {
    if (mode === 'device' && !get().deviceAuthenticationAvailable) {
      set({ error: 'Set up fingerprint, face unlock, or a device credential first.' });
      return false;
    }
    const preferences: PrivacyPreferences = {
      ...get().preferences,
      appLockMode: mode,
      ...(mode === 'off' ? { pinSalt: undefined, pinDigest: undefined } : {}),
    };
    await writePrivacyPreferences(preferences);
    set({ preferences, locked: false, error: null });
    return true;
  },

  setDeviceLock: async (fallbackPin) => {
    if (!get().deviceAuthenticationAvailable) {
      set({ error: 'Set up fingerprint, face unlock, or a device credential first.' });
      return false;
    }
    try {
      const pinPreferences = await createPinPreference(get().preferences, fallbackPin);
      const preferences: PrivacyPreferences = { ...pinPreferences, appLockMode: 'device' };
      await writePrivacyPreferences(preferences);
      set({ preferences, locked: false, error: null });
      return true;
    } catch {
      set({ error: 'Choose exactly six numbers for your fallback PIN.' });
      return false;
    }
  },

  setPin: async (pin) => {
    try {
      const preferences = await createPinPreference(get().preferences, pin);
      await writePrivacyPreferences(preferences);
      set({ preferences, locked: false, error: null });
      return true;
    } catch {
      set({ error: 'Choose exactly six numbers for your local PIN.' });
      return false;
    }
  },

  setNotificationPrivacy: async (notificationPrivacy) => {
    const preferences = { ...get().preferences, notificationPrivacy };
    try {
      await writePrivacyPreferences(preferences);
      set({ preferences, error: null });
      return true;
    } catch {
      set({ error: 'This phone could not save that privacy choice. Try again.' });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: async () => {
    await clearPrivacyPreferences();
    set({
      hydrated: true,
      hydratedForPaired: false,
      locked: false,
      preferences: defaults,
      failedPinAttempts: 0,
      cooldownUntil: null,
      error: null,
    });
  },
}));
