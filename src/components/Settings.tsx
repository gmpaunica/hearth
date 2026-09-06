import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearPushToken, registerPushToken } from '@/lib/notifications';
import { getNotificationsEnabled, setNotificationsEnabledPref } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { useHomeStore } from '@/state/homeStore';
import { useHomeStudioStore } from '@/state/homeStudioStore';
import { MUSIC_VOLUME_OPTIONS, useMusicStore } from '@/state/musicStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { editorial, HearthTheme } from '@/theme/hearth';
import { AccountCenter } from './AccountCenter';

/**
 * The account control (top-right, shown once paired) and its sheet: a privacy
 * reassurance, a push-notification toggle, and sign-out. Deliberately small —
 * the core loop is the product; this is just the housekeeping around it.
 */
export function Settings({ previewOpen = false }: { previewOpen?: boolean }) {
  const [notify, setNotify] = useState(true);
  const [confirming, setConfirming] = useState<null | 'signout'>(null);
  const [developerMessage, setDeveloperMessage] = useState<string | null>(null);

  const userId = useAuthStore((s) => s.userId);
  const signOut = useAuthStore((s) => s.signOut);
  const recoveryState = useAuthStore((s) => s.recoveryState);
  const musicEnabled = useMusicStore((state) => state.enabled);
  const musicVolume = useMusicStore((state) => state.volume);
  const musicPlayback = useMusicStore((state) => state.playback);
  const musicPlaybackDetail = useMusicStore((state) => state.playbackDetail);
  const hydrateMusic = useMusicStore((state) => state.hydrate);
  const setMusicEnabled = useMusicStore((state) => state.setEnabled);
  const setMusicVolume = useMusicStore((state) => state.setVolume);
  const retryMusic = useMusicStore((state) => state.retryPlayback);
  const coordinatedSurface = useMomentsSurfaceStore((state) => state.surface);
  const closeSurface = useMomentsSurfaceStore((state) => state.closeSurface);
  const openStudioSurface = useMomentsSurfaceStore((state) => state.openStudio);
  const open = previewOpen || coordinatedSurface.kind === 'settings';
  const resumeMomentPlayback = useMomentV2Store((state) => state.resumePlayback);
  const activeMoment = useMomentV2Store((state) => Boolean(state.snapshot?.active));
  const homeBlockedByMoment = useHomeStore((state) =>
    Boolean(state.resolved?.capabilities.blockedByMoment),
  );

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
    if (!previewOpen) closeSurface();
    setConfirming(null);
    setDeveloperMessage(null);
    resumeMomentPlayback();
  };

  const openHomeStudio = () => {
    if (!__DEV__) return;
    if (activeMoment || homeBlockedByMoment) {
      setDeveloperMessage('Finish the active Moment before editing the shared home.');
      return;
    }

    setDeveloperMessage(null);
    setConfirming(null);
    openStudioSurface('developer');
    void useHomeStudioStore.getState().open('developer');
  };

  return (
    <>
      {open && (
        <SafeAreaView style={styles.overlay}>
          <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={styles.overlayScroll}
              contentContainerStyle={styles.overlayContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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

            {__DEV__ && (
              <>
                <Text style={styles.developerTitle}>Developer</Text>
                <Text style={styles.developerBody}>
                  Home Studio exposes every registered component and expansion tier for local development.
                </Text>
                <Pressable
                  style={styles.studioButton}
                  onPress={openHomeStudio}
                  accessibilityRole="button"
                  accessibilityLabel="Open Developer Home Studio"
                >
                  <Text style={styles.studioButtonText}>Open Home Studio</Text>
                </Pressable>
                {developerMessage && (
                  <Text style={styles.developerMessage} accessibilityRole="alert">
                    {developerMessage}
                  </Text>
                )}

                <View style={styles.divider} />
              </>
            )}

            <AccountCenter preview={previewOpen} onRelationshipEnded={close} />

            <View style={styles.divider} />

            {confirming === 'signout' ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  {recoveryState === 'recoverable'
                    ? 'Sign out from this phone? Your account and shared home remain recoverable with your verified email.'
                    : 'This anonymous account cannot be recovered after sign-out. Signing out removes your artifacts, resets the shared home, and starts fresh.'}
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
                <Pressable style={styles.signOutAction} onPress={() => setConfirming('signout')}>
                  <Text style={styles.signOut}>Sign out</Text>
                </Pressable>
              </View>
            )}

            <Pressable style={styles.done} onPress={close} hitSlop={6}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: editorial.paperStrong,
    zIndex: 200,
    elevation: 50,
  },
  overlayScroll: { width: '100%' },
  keyboard: { flex: 1 },
  overlayContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    fontFamily: HearthTheme.type.display,
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
    minHeight: 48,
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
    minHeight: 48,
    justifyContent: 'center',
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
  developerTitle: {
    color: editorial.clay,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  developerBody: { color: editorial.inkSoft, fontSize: 12, lineHeight: 18 },
  studioButton: {
    minHeight: 48,
    marginTop: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorial.paperTint,
    borderColor: editorial.clay,
    borderWidth: 1,
  },
  studioButtonText: { color: editorial.clay, fontSize: 13, fontWeight: '800' },
  developerMessage: { color: editorial.danger, fontSize: 11, lineHeight: 16, marginTop: 8 },
  actions: { gap: 14 },
  signOutAction: { minHeight: 48, justifyContent: 'center' },
  signOut: { color: editorial.danger, fontSize: 15, fontWeight: '700', paddingVertical: 4 },
  confirmBox: { gap: 12 },
  confirmText: { color: editorial.ink, fontSize: 14, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
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
    minHeight: 48,
    justifyContent: 'center',
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
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: editorial.clay,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneText: { color: editorial.onAccent, fontSize: 15, fontWeight: '800' },
});
