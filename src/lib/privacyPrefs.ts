import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AppLockMode = 'off' | 'device' | 'pin';
export type NotificationPrivacy = 'generic' | 'gentle';

export interface PrivacyPreferences {
  version: 1;
  appLockMode: AppLockMode;
  pinSalt?: string;
  pinDigest?: string;
  notificationPrivacy: NotificationPrivacy;
}

const KEY = 'hearth.privacy.v1';
const SERVICE = 'com.hearth.app.privacy.v1';
const DEFAULTS: PrivacyPreferences = {
  version: 1,
  appLockMode: 'off',
  notificationPrivacy: 'generic',
};

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainService: SERVICE,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function normalize(value: unknown): PrivacyPreferences {
  if (!value || typeof value !== 'object') return DEFAULTS;
  const candidate = value as Partial<PrivacyPreferences>;
  const appLockMode: AppLockMode =
    candidate.appLockMode === 'device' || candidate.appLockMode === 'pin'
      ? candidate.appLockMode
      : 'off';
  return {
    version: 1,
    appLockMode,
    notificationPrivacy: candidate.notificationPrivacy === 'gentle' ? 'gentle' : 'generic',
    ...((appLockMode === 'pin' || appLockMode === 'device') && candidate.pinSalt && candidate.pinDigest
      ? { pinSalt: candidate.pinSalt, pinDigest: candidate.pinDigest }
      : {}),
  };
}

export async function readPrivacyPreferences(): Promise<PrivacyPreferences> {
  try {
    const raw = Platform.OS === 'web'
      ? await AsyncStorage.getItem(KEY)
      : await SecureStore.getItemAsync(KEY, secureOptions);
    return raw ? normalize(JSON.parse(raw)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function writePrivacyPreferences(value: PrivacyPreferences): Promise<void> {
  const raw = JSON.stringify(normalize(value));
  if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw, secureOptions);
}

export async function clearPrivacyPreferences(): Promise<void> {
  if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
  else await SecureStore.deleteItemAsync(KEY, secureOptions);
}

export async function getNotificationPrivacy(): Promise<NotificationPrivacy> {
  return (await readPrivacyPreferences()).notificationPrivacy;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

async function digestPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}:hearth-local-lock-v1`,
  );
}

export async function createPinPreference(
  current: PrivacyPreferences,
  pin: string,
): Promise<PrivacyPreferences> {
  if (!isValidPin(pin)) throw new Error('PIN must contain exactly six digits');
  const salt = Crypto.randomUUID();
  return {
    ...current,
    version: 1,
    appLockMode: 'pin',
    pinSalt: salt,
    pinDigest: await digestPin(pin, salt),
  };
}

export async function verifyPinPreference(
  preferences: PrivacyPreferences,
  pin: string,
): Promise<boolean> {
  if (!preferences.pinSalt || !preferences.pinDigest || !isValidPin(pin)) return false;
  return (await digestPin(pin, preferences.pinSalt)) === preferences.pinDigest;
}
