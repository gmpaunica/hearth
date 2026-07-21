// Small, local-only user preferences kept in AsyncStorage (localStorage on web).
// These are device settings, not synced account state.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = 'hearth.notificationsEnabled';

/** Whether the user wants signal push notifications. Defaults to on. */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return v !== 'false';
  } catch {
    return true;
  }
}

export async function setNotificationsEnabledPref(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, on ? 'true' : 'false');
  } catch {
    // A failed write just means the default (on) applies next launch.
  }
}
