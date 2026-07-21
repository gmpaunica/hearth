// Push-notification registration (Phase 6). Acquires an Expo push token for the
// device and stores it on the user's profile so the `notify-signal` Edge
// Function can reach their partner. All of this is native-only: web and the
// Node prerender have no push hardware, so every entry point no-ops there.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getNotificationsEnabled } from './prefs';
import { supabase } from './supabase';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// How a notification behaves while the app is foregrounded. Uses the SDK 57
// behavior fields (shouldShowBanner/shouldShowList replaced shouldShowAlert).
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission, acquire an Expo push token, and save it on the caller's
 * profile row. Idempotent and safe to call on every launch. No-ops on web, on
 * simulators, and without permission. `getExpoPushTokenAsync` reads the EAS
 * project id from `Constants.expoConfig.extra.eas.projectId` itself, and throws
 * a clear error (caught here) until EAS Build provides one.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (!isNative || !Device.isDevice) return;
  if (!(await getNotificationsEnabled())) return; // user turned pushes off

  // Android delivers notifications through a channel; create one up front.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Home',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
    if (error) console.warn('[hearth] storing push token failed:', error);
  } catch (e) {
    console.warn('[hearth] could not get a push token:', e);
  }
}

/**
 * Forget this device's push token (used when the user turns notifications off).
 * With no token on the profile, the notify-signal function has nowhere to send.
 */
export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
  if (error) console.warn('[hearth] clearing push token failed:', error);
}

/**
 * Subscribe to notification taps. A signal push carries `data.url` (the room
 * deep link); handing it to the router opens Hearth straight into the home.
 * Returns an unsubscribe function. No-op on web.
 */
export function onNotificationTap(open: (url: string) => void): () => void {
  if (!isNative) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  return () => sub.remove();
}
