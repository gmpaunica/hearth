import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  exportAccountData,
  loadPrivacyCenter,
  saveNotificationPrivacy,
  unblockFormerPartner,
  type PrivacyCenterSnapshot,
} from '@/lib/accountOwnership';
import { mapDomainError, type DomainError } from '@/lib/domainError';
import type { NotificationPrivacy } from '@/lib/privacyPrefs';
import { useAuthStore } from '@/state/authStore';
import { usePrivacyStore } from '@/state/privacyStore';
import { HearthTheme } from '@/theme/hearth';
import { PrivacyControls } from './PrivacyControls';

type Confirmation = 'leave' | 'block' | 'delete' | null;

const previewSnapshot: PrivacyCenterSnapshot = {
  account: { email: 'alex@example.com', email_verified: true, anonymous: false },
  preferences: { notification_privacy: 'generic' },
  blocked_former_partners: [{
    user_id: '11111111-1111-4111-8111-111111111111',
    label: 'Former partner',
    blocked_at: '2026-08-10T12:00:00.000Z',
  }],
};

export function AccountCenter({
  preview = false,
  onRelationshipEnded,
}: {
  preview?: boolean;
  onRelationshipEnded?: () => void;
}) {
  const [snapshot, setSnapshot] = useState<PrivacyCenterSnapshot | null>(preview ? previewSnapshot : null);
  const [loading, setLoading] = useState(!preview);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [deleteText, setDeleteText] = useState('');
  const [pendingUnblockId, setPendingUnblockId] = useState<string | null>(null);

  const authBusy = useAuthStore((state) => state.busy);
  const authError = useAuthStore((state) => state.error);
  const unpair = useAuthStore((state) => state.unpair);
  const blockAndUnpair = useAuthStore((state) => state.blockAndUnpair);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const setLocalNotificationPrivacy = usePrivacyStore((state) => state.setNotificationPrivacy);

  const refresh = useCallback(async () => {
    if (preview) return;
    setLoading(true);
    setLoadError(null);
    try {
      const next = await loadPrivacyCenter();
      setSnapshot(next);
      const saved = await setLocalNotificationPrivacy(next.preferences.notification_privacy);
      if (!saved) {
        setNotice({
          tone: 'error',
          message: 'Account controls loaded, but this phone could not cache your notification privacy. Try again.',
        });
      }
    } catch (error) {
      setLoadError(mapDomainError(error, 'privacy_center').message);
    } finally {
      setLoading(false);
    }
  }, [preview, setLocalNotificationPrivacy]);

  useEffect(() => {
    const task = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(task);
  }, [refresh]);

  const syncNotificationPrivacy = async (privacy: NotificationPrivacy) => {
    if (preview) return;
    await saveNotificationPrivacy(privacy);
    setSnapshot((current) => current
      ? { ...current, preferences: { notification_privacy: privacy } }
      : current);
  };

  const leaveHome = async (blocked: boolean) => {
    setWorking(true);
    setNotice(null);
    if (preview) {
      setNotice({ tone: 'success', message: blocked ? 'Preview: block and leave confirmed.' : 'Preview: leave confirmed.' });
      setWorking(false);
      setConfirmation(null);
      return;
    }
    const ok = blocked ? await blockAndUnpair() : await unpair();
    setWorking(false);
    if (ok) onRelationshipEnded?.();
  };

  const exportData = async () => {
    setWorking(true);
    setNotice(null);
    try {
      const result = preview ? { outcome: 'downloaded' as const } : await exportAccountData();
      setNotice(result.outcome === 'shared'
        ? { tone: 'success', message: 'Your private export was shared.' }
        : result.outcome === 'downloaded'
          ? { tone: 'success', message: 'Your private export was downloaded.' }
          : { tone: 'error', message: 'Sharing is unavailable on this device. Your export was not left behind.' });
    } catch (error) {
      setNotice({ tone: 'error', message: (error as DomainError).message });
    } finally {
      setWorking(false);
    }
  };

  const unblock = async (userId: string) => {
    setWorking(true);
    setNotice(null);
    try {
      if (!preview) await unblockFormerPartner(userId);
      setSnapshot((current) => current ? {
        ...current,
        blocked_former_partners: current.blocked_former_partners.filter((item) => item.user_id !== userId),
      } : current);
      setPendingUnblockId(null);
      setNotice({ tone: 'success', message: 'That pairing block was removed.' });
    } catch (error) {
      setNotice({ tone: 'error', message: (error as DomainError).message });
    } finally {
      setWorking(false);
    }
  };

  const removeAccount = async () => {
    setWorking(true);
    setNotice(null);
    if (preview) {
      setNotice({ tone: 'success', message: 'Preview: account deletion confirmed.' });
      setWorking(false);
      setConfirmation(null);
      setDeleteText('');
      return;
    }
    const ok = await deleteAccount();
    setWorking(false);
    if (ok) onRelationshipEnded?.();
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Privacy &amp; account</Text>
        <Text style={styles.body}>Recovery, local protection, and relationship ownership stay in one place. Hearth shares where you are in the room, never why, and your partner receives a soft prompt without a blaming message.</Text>
      </View>

      <PrivacyControls onNotificationPrivacyChange={syncNotificationPrivacy} />

      <View style={styles.rule} />

      <View style={styles.section}>
        <Text style={styles.label}>Account status</Text>
        {loading ? (
          <View style={styles.loadingRow}><ActivityIndicator color={HearthTheme.color.clayPressed} /><Text style={styles.hint}>Checking your private account…</Text></View>
        ) : snapshot ? (
          <Text style={styles.hint}>
            {snapshot.account.email_verified && snapshot.account.email
              ? `Recoverable with ${snapshot.account.email}.`
              : 'Anonymous on this phone. Add a recovery email before reinstalling.'}
          </Text>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
            <SmallAction label="Retry account controls" onPress={() => void refresh()} />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Your data</Text>
        <Text style={styles.hint}>Export records you authored and shared records you can currently view. Partner-only and private partner material is excluded.</Text>
        <SmallAction label="Export my Hearth data" disabled={!snapshot || working} onPress={() => void exportData()} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Blocked former partners</Text>
        {!snapshot ? (
          <Text style={styles.hint}>Available after account controls reconnect.</Text>
        ) : snapshot.blocked_former_partners.length === 0 ? (
          <Text style={styles.hint}>No former partners are blocked.</Text>
        ) : snapshot.blocked_former_partners.map((item) => (
          <View key={item.user_id} style={styles.blockedRow}>
            <View style={styles.blockedCopy}>
              <Text style={styles.blockedName}>{item.label}</Text>
              <Text style={styles.hint}>Cannot pair with this account in either direction.</Text>
            </View>
            {pendingUnblockId === item.user_id ? (
              <View style={styles.unblockConfirmation}>
                <Text style={styles.confirmText}>Allow future pairing with this account again?</Text>
                <Text style={styles.hint}>Removing this block makes pairing possible again if either person uses a valid home code.</Text>
                <View style={styles.rowActions}>
                  <SmallAction label="Keep blocked" quiet disabled={working} onPress={() => setPendingUnblockId(null)} />
                  <SmallAction label="Confirm unblock" danger disabled={working} onPress={() => void unblock(item.user_id)} />
                </View>
              </View>
            ) : (
              <SmallAction label="Unblock" quiet disabled={working} onPress={() => { setNotice(null); setPendingUnblockId(item.user_id); }} />
            )}
          </View>
        ))}
      </View>

      <View style={styles.rule} />

      {confirmation === 'leave' || confirmation === 'block' ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{confirmation === 'block' ? 'Block and leave this home?' : 'Leave this home?'}</Text>
          <Text style={styles.confirmText}>
            Your artifacts are removed. Partner-owned material remains theirs. The shared home resets, and its invite credentials rotate.
            {confirmation === 'block' ? ' This account also cannot pair with you again unless you remove the block.' : ''}
          </Text>
          <View style={styles.rowActions}>
            <SmallAction label="Cancel" quiet disabled={working || authBusy} onPress={() => setConfirmation(null)} />
            <SmallAction label={confirmation === 'block' ? 'Block & leave' : 'Leave home'} danger disabled={working || authBusy} onPress={() => void leaveHome(confirmation === 'block')} />
          </View>
        </View>
      ) : confirmation === 'delete' ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Delete your account permanently?</Text>
          <Text style={styles.confirmText}>Your authored data is removed, the other person is safely unpaired and their home access is rekeyed, and your sessions are revoked. This cannot be undone.</Text>
          <TextInput
            style={styles.input}
            value={deleteText}
            onChangeText={setDeleteText}
            placeholder="Type DELETE"
            placeholderTextColor={HearthTheme.color.inkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Type DELETE to confirm account deletion"
          />
          <View style={styles.rowActions}>
            <SmallAction label="Cancel" quiet disabled={working || authBusy} onPress={() => { setConfirmation(null); setDeleteText(''); }} />
            <SmallAction label="Delete forever" danger disabled={deleteText.trim().toUpperCase() !== 'DELETE' || working || authBusy} onPress={() => void removeAccount()} />
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.label}>Relationship &amp; account</Text>
          <SmallAction label="Leave this home" quiet onPress={() => { setNotice(null); setConfirmation('leave'); }} />
          <SmallAction label="Block former partner & leave" quiet disabled={!snapshot} onPress={() => { setNotice(null); setConfirmation('block'); }} />
          <SmallAction label="Delete my account" danger disabled={!snapshot} onPress={() => { setNotice(null); setConfirmation('delete'); }} />
        </View>
      )}

      {!!authError && <Text accessibilityRole="alert" style={styles.error}>{authError.message}</Text>}
      {!!notice && <Text accessibilityRole={notice.tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, notice.tone === 'error' && styles.error]}>{notice.message}</Text>}
    </View>
  );
}

function SmallAction({ label, onPress, quiet = false, danger = false, disabled = false }: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, quiet && styles.buttonQuiet, danger && styles.buttonDanger, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, quiet && styles.buttonTextQuiet, danger && styles.buttonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 22, lineHeight: 27 },
  body: { marginTop: 4, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 13, lineHeight: 19 },
  section: { gap: 8 },
  label: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 15 },
  hint: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17 },
  loadingRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rule: { height: 1, backgroundColor: HearthTheme.color.line },
  blockedRow: { gap: 8, padding: 10, borderWidth: 1, borderColor: HearthTheme.color.line, borderRadius: 14, backgroundColor: HearthTheme.color.parchmentWarm },
  blockedCopy: { flex: 1 },
  blockedName: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  confirmBox: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, backgroundColor: HearthTheme.color.parchmentWarm },
  confirmTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 15 },
  confirmText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 13, lineHeight: 19 },
  unblockConfirmation: { gap: 8, marginTop: 4 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, backgroundColor: HearthTheme.color.parchmentRaised, paddingHorizontal: 13, color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 15 },
  rowActions: { gap: 8 },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: HearthTheme.color.clayPressed, backgroundColor: HearthTheme.color.clayPressed, paddingHorizontal: 12 },
  buttonQuiet: { backgroundColor: HearthTheme.color.parchmentWarm, borderColor: HearthTheme.color.lineStrong },
  buttonDanger: { backgroundColor: HearthTheme.color.dangerSoft, borderColor: HearthTheme.color.danger },
  buttonText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, textAlign: 'center' },
  buttonTextQuiet: { color: HearthTheme.color.clayPressed },
  buttonTextDanger: { color: HearthTheme.color.danger },
  notice: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  error: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.45 },
});
