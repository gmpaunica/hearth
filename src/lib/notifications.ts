import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { InteractionThread } from '@/state/interactionModel';
import { getNotificationsEnabled } from './prefs';
import { supabase } from './supabase';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const RETURN_NOTIFICATION_PREFIX = 'hearth-return-';

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

async function ensureDefaultChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Home',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function registerPushToken(userId: string): Promise<boolean> {
  if (!isNative || !Device.isDevice || !(await getNotificationsEnabled())) return false;
  await ensureDefaultChannel();
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return false;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is unavailable');

  const { data: epoch, error: beginError } = await supabase.rpc(
    'begin_push_registration',
    { p_user_id: userId },
  );
  if (beginError) throw beginError;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: stored, error: storeError } = await supabase.rpc('store_push_token', {
    p_user_id: userId,
    p_token: token,
    p_epoch: epoch,
  });
  if (storeError) throw storeError;
  return stored === true;
}

export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_push_token', { p_user_id: userId });
  if (error) throw error;
}

export interface NotificationDestination {
  url: string;
  recipientUserId: string;
  coupleId: string;
  signalId: string;
}

function destinationOf(data: Record<string, unknown>): NotificationDestination | null {
  const { url, recipientUserId, coupleId, signalId } = data;
  if (
    typeof url !== 'string' ||
    typeof recipientUserId !== 'string' ||
    typeof coupleId !== 'string' ||
    typeof signalId !== 'string'
  ) return null;
  return { url, recipientUserId, coupleId, signalId };
}

export function onNotificationTap(
  open: (destination: NotificationDestination) => void,
): () => void {
  if (!isNative) return () => {};
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const destination = destinationOf(
      response.notification.request.content.data as Record<string, unknown>,
    );
    if (destination) open(destination);
  };
  void Notifications.getLastNotificationResponseAsync().then(handle);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

/** Schedule only generic copy; pathway text and optional sentences never enter
 * the device notification payload. SDK 57 returns a deterministic identifier
 * that can be cancelled on reschedule, return, completion, unpair, or sign-out. */
export async function reconcileReturnNotifications(
  threads: InteractionThread[],
  userId: string,
): Promise<void> {
  if (!isNative) return;
  try {
    const desired = new Map<string, Date>();
    for (const thread of threads) {
      const session = thread.session;
      if (
        !session?.scheduled_for ||
        session.scheduled_by_user_id !== userId ||
        session.returned_at ||
        session.phase === 'completed' ||
        session.phase === 'closed'
      ) continue;
      const date = new Date(session.scheduled_for);
      if (date.getTime() > Date.now()) {
        desired.set(`${RETURN_NOTIFICATION_PREFIX}${thread.id}`, date);
      }
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduled) {
      if (request.identifier.startsWith(RETURN_NOTIFICATION_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    if (desired.size === 0) return;
    await ensureDefaultChannel();
    for (const [identifier, date] of desired) {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: 'Hearth',
          body: 'It’s time to return to Hearth.',
          data: { url: 'hearth://' },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: Platform.OS === 'android' ? 'default' : undefined,
        },
      });
    }
  } catch (error) {
    console.warn('[hearth] return reminder sync failed:', error);
  }
}

export async function clearLocalNotifications(): Promise<void> {
  if (!isNative) return;
  await Promise.allSettled([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync(),
    Notifications.clearLastNotificationResponseAsync(),
  ]);
}
