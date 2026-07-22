// Small, local-only user preferences kept in AsyncStorage (localStorage on web).
// These are device settings, not synced account state.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = 'hearth.notificationsEnabled';
const ACK_STAGE_KEY = 'hearth.ackStage';

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

/**
 * The highest home-growth stage the user has already seen celebrated, per
 * couple. Defaults to -1 so a brand-new home shows its first "moving in"
 * moment. Keyed by couple id so joining a different home starts fresh.
 */
export async function getAckStage(coupleId: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(`${ACK_STAGE_KEY}.${coupleId}`);
    const n = v == null ? -1 : Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export async function setAckStage(coupleId: string, stage: number): Promise<void> {
  try {
    await AsyncStorage.setItem(`${ACK_STAGE_KEY}.${coupleId}`, String(stage));
  } catch {
    // Non-fatal: the moment may simply reappear next launch.
  }
}
