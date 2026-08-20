// Small, local-only user preferences kept in AsyncStorage (localStorage on web).
// These are device settings, not synced account state.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = 'hearth.notificationsEnabled';
const ACK_STAGE_KEY = 'hearth.ackStage';
const DRAWING_SEEN_KEY = 'hearth.drawingSeen';
const MUSIC_ENABLED_KEY = 'hearth.musicEnabled';
const MUSIC_VOLUME_KEY = 'hearth.musicVolume';
const HOME_CONTROLS_HIDDEN_KEY = 'hearth.homeControlsHidden';

export type MusicVolumePreset = 'quiet' | 'gentle' | 'full';

const isMusicVolumePreset = (value: string | null): value is MusicVolumePreset =>
  value === 'quiet' || value === 'gentle' || value === 'full';

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

/** Whether the local device should play Hearth's ambient music. Defaults to on. */
export async function getMusicEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(MUSIC_ENABLED_KEY);
    return value !== 'false';
  } catch {
    return true;
  }
}

export async function setMusicEnabledPref(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Non-fatal: the default (on) applies next launch.
  }
}

/** The saved low-volume mix level for this device. */
export async function getMusicVolume(): Promise<MusicVolumePreset> {
  try {
    const value = await AsyncStorage.getItem(MUSIC_VOLUME_KEY);
    return isMusicVolumePreset(value) ? value : 'gentle';
  } catch {
    return 'gentle';
  }
}

export async function setMusicVolumePref(volume: MusicVolumePreset): Promise<void> {
  try {
    await AsyncStorage.setItem(MUSIC_VOLUME_KEY, volume);
  } catch {
    // Non-fatal: the gentle default applies next launch.
  }
}

/** Whether lower home controls are hidden for a clean filming view. */
export async function getHomeControlsHidden(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HOME_CONTROLS_HIDDEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setHomeControlsHiddenPref(hidden: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HOME_CONTROLS_HIDDEN_KEY, hidden ? 'true' : 'false');
  } catch {
    // Non-fatal: lower controls return on the next launch.
  }
}

/**
 * The last partner drawing this signed-in person actually viewed, scoped to a
 * couple and UTC day. Keeping this local avoids turning read state into partner
 * surveillance while ensuring the unread badge stays dismissed after reload.
 */
export async function getSeenDrawing(
  coupleId: string,
  userId: string,
  day: string,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${DRAWING_SEEN_KEY}.${coupleId}.${userId}.${day}`);
  } catch {
    return null;
  }
}

export async function setSeenDrawing(
  coupleId: string,
  userId: string,
  day: string,
  fingerprint: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${DRAWING_SEEN_KEY}.${coupleId}.${userId}.${day}`,
      fingerprint,
    );
  } catch {
    // Non-fatal: the drawing may appear unread again after a restart.
  }
}
