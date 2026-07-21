import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { clearPushToken, registerPushToken } from '@/lib/notifications';
import { getNotificationsEnabled, setNotificationsEnabledPref } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { ui } from '@/theme/hearth';

/**
 * The settings gear (top-right, shown once paired) and its sheet: a privacy
 * reassurance, a push-notification toggle, and sign-out. Deliberately small —
 * the core loop is the product; this is just the housekeeping around it.
 */
export function Settings() {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const userId = useAuthStore((s) => s.userId);
  const signOut = useAuthStore((s) => s.signOut);

  // Reflect the stored preference when the sheet opens.
  useEffect(() => {
    if (open) void getNotificationsEnabled().then(setNotify);
  }, [open]);

  const toggleNotify = (on: boolean) => {
    setNotify(on);
    void setNotificationsEnabledPref(on);
    if (!userId) return;
    void (on ? registerPushToken(userId) : clearPushToken(userId));
  };

  const close = () => {
    setOpen(false);
    setConfirmingSignOut(false);
  };

  return (
    <>
      <Pressable
        style={styles.gear}
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel="Settings"
      >
        <Text style={styles.gearText}>⚙</Text>
      </Pressable>

      {open && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Notifications</Text>
                <Text style={styles.rowHint}>
                  A gentle nudge when your partner leaves a signal.
                </Text>
              </View>
              <Switch
                value={notify}
                onValueChange={toggleNotify}
                trackColor={{ true: ui.chipActiveBg, false: ui.chipBg }}
                thumbColor={ui.accent}
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.privacyTitle}>Your privacy</Text>
            <Text style={styles.privacyBody}>
              Hearth only ever shares where you are in the room — never why. Your
              partner sees a soft prompt, never a blaming message.
            </Text>

            <View style={styles.divider} />

            {confirmingSignOut ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Sign out? You’ll leave this home and start fresh.
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable
                    style={styles.confirmCancel}
                    onPress={() => setConfirmingSignOut(false)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDanger}
                    onPress={() => {
                      close();
                      void signOut();
                    }}
                  >
                    <Text style={styles.confirmDangerText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingSignOut(true)} hitSlop={6}>
                <Text style={styles.signOut}>Sign out</Text>
              </Pressable>
            )}

            <Pressable style={styles.done} onPress={close} hitSlop={6}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gear: {
    position: 'absolute',
    top: 22,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearText: { color: ui.textDim, fontSize: 18, lineHeight: 20 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 8, 20, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
  },
  title: { color: ui.text, fontSize: 20, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { color: ui.text, fontSize: 16 },
  rowHint: { color: ui.textDim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  divider: {
    height: 1,
    backgroundColor: ui.overlayBorder,
    marginVertical: 16,
  },
  privacyTitle: { color: ui.text, fontSize: 14, marginBottom: 6 },
  privacyBody: { color: ui.textDim, fontSize: 13, lineHeight: 19 },
  signOut: { color: ui.danger, fontSize: 15, paddingVertical: 4 },
  confirmBox: { gap: 12 },
  confirmText: { color: ui.text, fontSize: 14, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: ui.chipBg,
  },
  confirmCancelText: { color: ui.text, fontSize: 14 },
  confirmDanger: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(201, 111, 90, 0.25)',
  },
  confirmDangerText: { color: ui.danger, fontSize: 14 },
  done: {
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  doneText: { color: ui.accent, fontSize: 15 },
});
