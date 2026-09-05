import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { mapDomainError, reportDomainError, type DomainOperation } from './domainError';
import { supabase } from './supabase';
import type { NotificationPrivacy } from './privacyPrefs';

export interface BlockedFormerPartner {
  user_id: string;
  label: string;
  blocked_at: string;
}

export interface PrivacyCenterSnapshot {
  account: {
    email: string | null;
    email_verified: boolean;
    anonymous: boolean;
  };
  preferences: { notification_privacy: NotificationPrivacy };
  blocked_former_partners: BlockedFormerPartner[];
}

export interface ExportResult {
  outcome: 'downloaded' | 'shared' | 'unavailable';
}

function fail(error: unknown, operation: DomainOperation): never {
  const mapped = mapDomainError(error, operation);
  reportDomainError(mapped);
  throw mapped;
}

export async function loadPrivacyCenter(): Promise<PrivacyCenterSnapshot> {
  const { data, error } = await supabase.rpc('get_privacy_center_snapshot');
  if (error) fail(error, 'privacy_center');
  const snapshot = data as Partial<PrivacyCenterSnapshot> | null;
  if (!snapshot?.account || !snapshot.preferences || !Array.isArray(snapshot.blocked_former_partners)) {
    fail(new Error('Privacy center returned an invalid shape'), 'privacy_center');
  }
  return snapshot as PrivacyCenterSnapshot;
}

export async function saveNotificationPrivacy(notificationPrivacy: NotificationPrivacy): Promise<void> {
  const { error } = await supabase.rpc('set_privacy_preferences', {
    p_notification_privacy: notificationPrivacy,
  });
  if (error) fail(error, 'privacy_center');
}

export async function unblockFormerPartner(userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('unblock_former_partner', {
    p_blocked_user_id: userId,
  });
  if (error || data !== true) fail(error ?? new Error('Block was not found'), 'unblock_partner');
}

export async function exportAccountData(): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke('export-account', { body: {} });
  if (error || !data || typeof data !== 'object') fail(error ?? new Error('Empty export'), 'export_account');
  const json = JSON.stringify(data, null, 2);
  const filename = `hearth-export-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return { outcome: 'unavailable' };
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return { outcome: 'downloaded' };
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return { outcome: 'unavailable' };
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Save your Hearth export',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
    return { outcome: 'shared' };
  } finally {
    if (file.exists) file.delete();
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirmation: 'DELETE MY ACCOUNT' },
  });
  if (error) fail(error, 'delete_account');
}
