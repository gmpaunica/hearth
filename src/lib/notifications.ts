// Push-notification registration. Acquires an Expo push token and stores it
// through epoch-checked RPCs so an in-flight registration cannot undo a later
// notification-off or sign-out operation.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getNotificationsEnabled } from './prefs';
import { supabase } from './supabase';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

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
 * Ask for permission, acquire an Expo push token, and save it on the current
 * profile. The registration epoch is claimed before any native async work. A
 * subsequent clear/sign-out increments that epoch, causing this store to be
 * rejected rather than restoring a stale token.
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  if (!isNative || !Device.isDevice) return false;
  if (!(await getNotificationsEnabled())) return false;

  const { data: epochValue, error: beginError } = await supabase.rpc(
    'begin_push_registration',
    { p_user_id: userId },
  );
  if (beginError) throw beginError;
  const epoch = Number(epochValue);
  if (!Number.isSafeInteger(epoch) || epoch < 1) {
    throw new Error('Push registration did not receive a valid server epoch.');
  }

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
  if (!granted) return false;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Missing EAS project ID for push registration.');
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: stored, error: storeError } = await supabase.rpc('store_push_token', {
    p_user_id: userId,
    p_token: token,
    p_epoch: epoch,
  });
  if (storeError) throw storeError;
  return stored === true;
}

/** Invalidate every in-flight registration and forget the current token. */
export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_push_token', { p_user_id: userId });
  if (error) throw error;
}

/** Remove presented notifications and any cached tap response from this device. */
export async function clearLocalNotifications(): Promise<void> {
  if (!isNative) return;
  const results = await Promise.allSettled([
    Notifications.dismissAllNotificationsAsync(),
    Notifications.clearLastNotificationResponseAsync(),
  ]);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

export interface NotificationTapData {
  url: string;
  recipientUserId: string;
  coupleId: string;
  signalId: string;
}

/**
 * Subscribe to notification taps. Identity fields are mandatory so callers can
 * reject a notification left over from an old anonymous identity or home.
 */
export function onNotificationTap(open: (data: NotificationTapData) => void): () => void {
  if (!isNative) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const url = data?.url;
    const recipientUserId = data?.recipientUserId;
    const coupleId = data?.coupleId;
    const signalId = data?.signalId;
    if (
      typeof url === 'string' &&
      typeof recipientUserId === 'string' &&
      typeof coupleId === 'string' &&
      typeof signalId === 'string'
    ) {
      open({ url, recipientUserId, coupleId, signalId });
    }
  });
  return () => sub.remove();
}
