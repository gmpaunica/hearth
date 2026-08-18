import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { clearPushToken, registerPushToken } from '@/lib/notifications';
import { getNotificationsEnabled, setNotificationsEnabledPref } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { MUSIC_VOLUME_OPTIONS, useMusicStore } from '@/state/musicStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { editorial } from '@/theme/hearth';

/**
 * The settings gear (top-right, shown once paired) and its sheet: a privacy
 * reassurance, a push-notification toggle, and sign-out. Deliberately small —
 * the core loop is the product; this is just the housekeeping around it.
 */
export function Settings() {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [confirming, setConfirming] = useState<null | 'unpair' | 'signout'>(null);

  const userId = useAuthStore((s) => s.userId);
  const signOut = useAuthStore((s) => s.signOut);
  const unpair = useAuthStore((s) => s.unpair);
  const musicEnabled = useMusicStore((state) => state.enabled);
  const musicVolume = useMusicStore((state) => state.volume);
  const musicPlayback = useMusicStore((state) => state.playback);
  const musicPlaybackDetail = useMusicStore((state) => state.playbackDetail);
  const hydrateMusic = useMusicStore((state) => state.hydrate);
  const setMusicEnabled = useMusicStore((state) => state.setEnabled);
  const setMusicVolume = useMusicStore((state) => state.setVolume);
  const retryMusic = useMusicStore((state) => state.retryPlayback);
  const setSettingsOpen = useMomentsSurfaceStore((state) => state.setSettingsOpen);
  const completeMomentMinimize = useMomentsSurfaceStore((state) => state.completeMinimize);
  const resumeMomentPlayback = useMomentV2Store((state) => state.resumePlayback);

  // Reflect the stored preference when the sheet opens.
  useEffect(() => {
    if (open) {
      void getNotificationsEnabled().then(setNotify);
      void hydrateMusic();
    }
  }, [hydrateMusic, open]);

  const toggleNotify = (on: boolean) => {
    setNotify(on);
    void setNotificationsEnabledPref(on);
    if (!userId) return;
    void (on ? registerPushToken(userId) : clearPushToken(userId));
  };

  const close = () => {
    setOpen(false);
    setSettingsOpen(false);
    setConfirming(null);
    resumeMomentPlayback();
  };

  const openSettings = () => {
    completeMomentMinimize();
    setSettingsOpen(true);
    setOpen(true);
  };

  return (
    <>
      <Pressable
        style={styles.gear}
        onPress={openSettings}
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
                trackColor={{ true: editorial.clay, false: editorial.paperTint }}
                thumbColor={editorial.onAccent}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.musicBlock}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Background music</Text>
                  <Text style={styles.rowHint}>
                    “Home Team” plays only while Hearth is open.
                  </Text>
                </View>
                <Switch
                  value={musicEnabled}
                  onValueChange={setMusicEnabled}
                  trackColor={{ true: editorial.clay, false: editorial.paperTint }}
                  thumbColor={editorial.onAccent}
                  accessibilityLabel="Background music"
                />
              </View>

              {musicEnabled && (
                <>
                  <View style={styles.volumeRow} accessibilityRole="radiogroup">
                    {MUSIC_VOLUME_OPTIONS.map((option) => {
                      const selected = musicVolume === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.volumeChoice, selected && styles.volumeChoiceSelected]}
                          onPress={() => setMusicVolume(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${option.label} music volume`}
                        >
                          <Text
                            style={[
                              styles.volumeChoiceText,
                              selected && styles.volumeChoiceTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.playbackRow}>
                    <View style={styles.playbackStatus}>
                      <View
                        style={[
                          styles.playbackDot,
                          musicPlayback === 'playing' && styles.playbackDotPlaying,
                          musicPlayback === 'error' && styles.playbackDotError,
                        ]}
                      />
                      <Text style={styles.playbackText} numberOfLines={2}>
                        {musicPlayback === 'playing'
                          ? 'Playing'
                          : musicPlayback === 'loading'
                            ? 'Loading music…'
                            : musicPlayback === 'error'
                              ? `Couldn’t start${musicPlaybackDetail ? `: ${musicPlaybackDetail}` : ''}`
                              : 'Ready to play'}
                      </Text>
                    </View>
                    {musicPlayback !== 'playing' && (
                      <Pressable
                        style={styles.playNow}
                        onPress={retryMusic}
                        accessibilityRole="button"
                        accessibilityLabel="Play background music now"
                      >
                        <Text style={styles.playNowText}>Play now</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>

            <View style={styles.divider} />

            <Text style={styles.privacyTitle}>Your privacy</Text>
            <Text style={styles.privacyBody}>
              Hearth only ever shares where you are in the room — never why. Your
              partner sees a soft prompt, never a blaming message.
            </Text>

            <View style={styles.divider} />

            {confirming === 'unpair' ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Leave this home? You’ll be unpaired and can create or join a new
                  one. Your partner keeps the home.
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable style={styles.confirmCancel} onPress={() => setConfirming(null)}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDanger}
                    onPress={() => {
                      close();
                      void unpair();
                    }}
                  >
                    <Text style={styles.confirmDangerText}>Leave</Text>
                  </Pressable>
                </View>
              </View>
            ) : confirming === 'signout' ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Sign out? You’ll leave this home and start completely fresh.
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable style={styles.confirmCancel} onPress={() => setConfirming(null)}>
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
              <View style={styles.actions}>
                <Pressable onPress={() => setConfirming('unpair')} hitSlop={6}>
                  <Text style={styles.leaveHome}>Leave this home</Text>
                </Pressable>
                <Pressable onPress={() => setConfirming('signout')} hitSlop={6}>
                  <Text style={styles.signOut}>Sign out</Text>
                </Pressable>
              </View>
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
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: editorial.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gearText: { color: editorial.clay, fontSize: 18, lineHeight: 20 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: editorial.paperStrong,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 200,
    elevation: 50,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 30,
    padding: 24,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { color: editorial.ink, fontSize: 16, fontWeight: '700' },
  rowHint: { color: editorial.inkSoft, fontSize: 12, marginTop: 3, lineHeight: 17 },
  musicBlock: { gap: 11 },
  volumeRow: { flexDirection: 'row', gap: 8 },
  volumeChoice: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.line,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  volumeChoiceSelected: {
    backgroundColor: editorial.clay,
    borderColor: editorial.clay,
  },
  volumeChoiceText: { color: editorial.inkSoft, fontSize: 12, fontWeight: '700' },
  volumeChoiceTextSelected: { color: editorial.onAccent },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playbackStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  playbackDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: editorial.inkSoft },
  playbackDotPlaying: { backgroundColor: editorial.sage },
  playbackDotError: { backgroundColor: editorial.danger },
  playbackText: { flex: 1, color: editorial.inkSoft, fontSize: 11, lineHeight: 15 },
  playNow: {
    borderRadius: 11,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  playNowText: { color: editorial.clay, fontSize: 11, fontWeight: '800' },
  divider: {
    height: 1,
    backgroundColor: editorial.line,
    marginVertical: 16,
  },
  privacyTitle: {
    color: editorial.clay,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  privacyBody: { color: editorial.inkSoft, fontSize: 13, lineHeight: 20 },
  actions: { gap: 14 },
  leaveHome: { color: editorial.clay, fontSize: 15, fontWeight: '700', paddingVertical: 4 },
  signOut: { color: editorial.danger, fontSize: 15, fontWeight: '700', paddingVertical: 4 },
  confirmBox: { gap: 12 },
  confirmText: { color: editorial.ink, fontSize: 14, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.line,
    borderWidth: 1,
  },
  confirmCancelText: { color: editorial.ink, fontSize: 14, fontWeight: '700' },
  confirmDanger: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(167, 66, 50, 0.12)',
    borderColor: 'rgba(167, 66, 50, 0.25)',
    borderWidth: 1,
  },
  confirmDangerText: { color: editorial.danger, fontSize: 14, fontWeight: '700' },
  done: {
    marginTop: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: editorial.clay,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneText: { color: editorial.onAccent, fontSize: 15, fontWeight: '800' },
});
