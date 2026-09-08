import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  DAILY_VOICE_MAX_DURATION_MS,
  DAILY_VOICE_RECORDING_OPTIONS,
} from '@/daily/audioOptions';
import { mineFor, partnerFor } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { useMusicStore } from '@/state/musicStore';
import { HearthTheme } from '@/theme/hearth';
import { DailyMediaScaffold } from './DailyMediaScaffold';
import { VoiceNotePlayer } from './VoiceNotePlayer';

type RecordingPhase = 'idle' | 'recording' | 'preview';

const formatSeconds = (milliseconds: number) =>
  `0:${Math.min(30, Math.ceil(milliseconds / 1000)).toString().padStart(2, '0')}`;

const restoreHomeAudioMode = () => setAudioModeAsync({
  allowsRecording: false,
  allowsBackgroundRecording: false,
  shouldPlayInBackground: false,
  playsInSilentMode: true,
  interruptionMode: 'mixWithOthers',
});

interface DailyRecordScreenProps {
  reviewMode?: boolean;
  reviewPhase?: RecordingPhase;
  reviewPreviewUri?: string | null;
  reviewMediaUri?: string | null;
  reviewDeleteOpen?: boolean;
}

export function DailyRecordScreen({
  reviewMode = false,
  reviewPhase = 'idle',
  reviewPreviewUri = null,
  reviewMediaUri = null,
  reviewDeleteOpen = false,
}: DailyRecordScreenProps = {}) {
  const recorder = useAudioRecorder(DAILY_VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const loading = useDailyMediaStore((state) => state.loading);
  const busy = useDailyMediaStore((state) => state.busy);
  const error = useDailyMediaStore((state) => state.error);
  const refresh = useDailyMediaStore((state) => state.refresh);
  const submitVoice = useDailyMediaStore((state) => state.submitVoice);
  const deleteArtifact = useDailyMediaStore((state) => state.deleteArtifact);
  const clearError = useDailyMediaStore((state) => state.clearError);
  const userId = useAuthStore((state) => state.userId);
  const [phase, setPhase] = useState<RecordingPhase>(reviewPhase);
  const [previewUri, setPreviewUri] = useState<string | null>(reviewPreviewUri);
  const [previewDuration, setPreviewDuration] = useState(reviewPreviewUri ? 12_000 : 0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(reviewDeleteOpen);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const closingRef = useRef(false);
  const mountedRef = useRef(true);

  const mine = mineFor(snapshot, userId, 'voice');
  const partner = partnerFor(snapshot, userId, 'voice');

  useEffect(() => {
    mountedRef.current = true;
    useMusicStore.getState().setMediaSessionBusy(true);
    if (!reviewMode) void refresh(false);
    return () => {
      mountedRef.current = false;
      if (!closingRef.current) {
        // useAudioRecorder owns native disposal. Never call the recorder from
        // this cleanup: its SharedObject release effect runs earlier on
        // unmount. Restore the global session before allowing music to resume.
        void restoreHomeAudioMode()
          .catch(() => {})
          .finally(() => useMusicStore.getState().setMediaSessionBusy(false));
      }
    };
  }, [refresh, reviewMode]);

  const stopRecorder = useCallback(() => {
    if (stopPromiseRef.current) return stopPromiseRef.current;

    const stopPromise = (async () => {
      if (recorder.isRecording) await recorder.stop();
    })();
    stopPromiseRef.current = stopPromise;
    stopPromise.then(
      () => {
        if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null;
      },
      () => {
        if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null;
      },
    );
    return stopPromise;
  }, [recorder]);

  const finishRecording = useCallback(async (keep: boolean, interrupted = false) => {
    if (closingRef.current) return;
    const duration = Math.min(
      DAILY_VOICE_MAX_DURATION_MS,
      Math.max(recorderState.durationMillis, recorder.getStatus().durationMillis),
    );
    try {
      await stopRecorder();
      if (closingRef.current) return;
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (mountedRef.current) {
        if (keep && uri && duration > 0) {
          setPreviewUri(uri);
          setPreviewDuration(duration);
          setPhase('preview');
        } else {
          setPreviewUri(null);
          setPreviewDuration(0);
          setPhase('idle');
          if (interrupted) setLocalError('Recording stopped when Hearth left the foreground. Nothing was sent.');
        }
      }
    } catch {
      if (mountedRef.current && !closingRef.current) {
        setPhase('idle');
        setLocalError('Recording was interrupted. Nothing was sent.');
      }
    } finally {
      if (!closingRef.current) {
        await setAudioModeAsync({
          allowsRecording: false,
          allowsBackgroundRecording: false,
          shouldPlayInBackground: false,
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
        }).catch(() => {});
      }
    }
  }, [recorder, recorderState.durationMillis, stopRecorder]);

  const closeScreen = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (mountedRef.current) setClosing(true);

    try {
      // If Stop and Back arrive together, both await this same native stop.
      // Only navigate after the recorder and global audio session are settled.
      await stopRecorder().catch(() => {});
      await restoreHomeAudioMode().catch(() => {});
    } finally {
      useMusicStore.getState().setMediaSessionBusy(false);
      if (mountedRef.current) router.back();
    }
  }, [stopRecorder]);

  useEffect(() => {
    if (phase === 'recording' && recorderState.durationMillis >= DAILY_VOICE_MAX_DURATION_MS) {
      const timer = setTimeout(() => void finishRecording(true), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [finishRecording, phase, recorderState.durationMillis]);

  useEffect(() => {
    if (phase === 'recording' && recorderState.mediaServicesDidReset) {
      const timer = setTimeout(() => void finishRecording(false, true), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [finishRecording, phase, recorderState.mediaServicesDidReset]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && phase === 'recording') void finishRecording(false, true);
    });
    return () => subscription.remove();
  }, [finishRecording, phase]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void closeScreen();
      return true;
    });
    return () => subscription.remove();
  }, [closeScreen]);

  const startRecording = async () => {
    if (reviewMode || Platform.OS === 'web' || mine || busy) return;
    setLocalError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setLocalError(permission.canAskAgain
        ? 'Microphone permission is needed only while you record.'
        : 'Microphone access is off. You can enable it in your phone settings.');
      return;
    }
    try {
      setPreviewUri(null);
      setPreviewDuration(0);
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });
      await recorder.prepareToRecordAsync(DAILY_VOICE_RECORDING_OPTIONS);
      recorder.record({ forDuration: 30 });
      setPhase('recording');
    } catch {
      setPhase('idle');
      setLocalError('Couldn’t start recording. Nothing was sent.');
    }
  };

  const send = async () => {
    if (reviewMode) return;
    if (!previewUri || previewDuration <= 0 || playingPreview) return;
    if (await submitVoice(previewUri, previewDuration)) {
      setPreviewUri(null);
      setPreviewDuration(0);
      setPhase('idle');
    }
  };

  const confirmDelete = async (id: string) => {
    if (reviewMode) return;
    if (await deleteArtifact('voice', id)) {
      setDeleteOpen(false);
      setDeleteNotice('Your voice note was removed. Today’s recording page stays closed.');
    }
  };

  return (
    <DailyMediaScaffold
      eyebrow="DAILY RECORD"
      title="A voice from today"
      prompt={snapshot?.voice_prompt ?? null}
      sharedCopy={snapshot?.shared_prompt_copy}
      onBack={() => void closeScreen()}
      backDisabled={closing}
    >
      {!!deleteNotice && (
        <View style={styles.successCard} accessibilityLiveRegion="polite">
          <Text style={styles.successText}>{deleteNotice}</Text>
        </View>
      )}
      {(error || localError) && (
        <View style={styles.errorCard} accessibilityLiveRegion="polite">
          <Text style={styles.errorTitle}>{previewUri ? 'Your recording is still here' : 'That didn’t work yet'}</Text>
          <Text style={styles.errorText}>{localError ?? error}</Text>
        </View>
      )}

      {mine ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerLabel}>YOUR ANSWER</Text>
          <Text style={styles.sentTitle}>Sent for today</Text>
          <VoiceNotePlayer item={mine} localUri={reviewMediaUri} label="your daily voice note" />
          {deleteOpen ? (
            <View style={styles.deleteConfirm} accessibilityLiveRegion="polite">
              <Text style={styles.deleteTitle}>Remove your voice note?</Text>
              <Text style={styles.deleteBody}>It disappears for both of you and today’s recording page will stay closed.</Text>
              <View style={styles.row}>
                <Pressable style={[styles.secondary, styles.flex]} onPress={() => setDeleteOpen(false)} disabled={busy != null}><Text style={styles.secondaryText}>Keep note</Text></Pressable>
                <Pressable style={[styles.deleteAction, styles.flex]} onPress={() => void confirmDelete(mine.id)} disabled={busy != null}><Text style={styles.deleteActionText}>{busy === 'delete-voice' ? 'Removing…' : 'Remove forever'}</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              onPress={() => setDeleteOpen(true)}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete your daily voice note"
            >
              <Text style={styles.deleteText}>Remove my note</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.recordCard}>
          {phase === 'idle' && (
            <>
              <View style={styles.recordArt}><View style={styles.recordDot} /></View>
              <Text style={styles.recordTitle}>Up to 30 seconds</Text>
              <Text style={styles.recordBody}>Record, listen back, then choose Send. Nothing leaves your phone before that.</Text>
              <View style={styles.privacyNote}>
                <Text style={styles.privacyNoteText}>Microphone access is requested only after Record. Hearth records only while this page is in the foreground.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.primary, Platform.OS === 'web' && styles.disabled, pressed && styles.pressed]}
                onPress={() => void startRecording()}
                disabled={loading || busy != null || Platform.OS === 'web'}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
                accessibilityState={{ disabled: loading || busy != null || Platform.OS === 'web' }}
              >
                <Text style={styles.primaryText}>{Platform.OS === 'web' ? 'Recording is available on your phone' : 'Record'}</Text>
              </Pressable>
            </>
          )}
          {phase === 'recording' && (
            <>
              <View style={[styles.recordArt, styles.recordArtLive]}><View style={styles.recordDot} /></View>
              <Text style={styles.timer} accessibilityLiveRegion="polite">{formatSeconds(recorderState.durationMillis)} / 0:30</Text>
              <Text style={styles.recordBody}>Recording only while this page stays open.</Text>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={() => void finishRecording(true)}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
              >
                <Text style={styles.secondaryText}>Stop</Text>
              </Pressable>
            </>
          )}
          {phase === 'preview' && previewUri && (
            <>
              <Text style={styles.answerLabel}>LISTEN BEFORE SENDING</Text>
              <VoiceNotePlayer
                localUri={previewUri}
                label="recording preview"
                onPlaybackChange={setPlayingPreview}
              />
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}
                  onPress={() => {
                    clearError();
                    setLocalError(null);
                    setPreviewUri(null);
                    setPreviewDuration(0);
                    setPhase('idle');
                  }}
                  disabled={busy != null || playingPreview}
                  accessibilityRole="button"
                  accessibilityLabel="Re-record voice note"
                >
                  <Text style={styles.secondaryText}>Re-record</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}
                  onPress={() => void send()}
                  disabled={busy != null || playingPreview}
                  accessibilityRole="button"
                  accessibilityLabel="Send voice note for today"
                  accessibilityState={{ busy: busy === 'voice-upload' }}
                >
                  <Text style={styles.primaryText}>{busy === 'voice-upload' ? 'Sending…' : error ? 'Try sending again' : 'Send voice note'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {partner && (
        <View style={[styles.answerCard, styles.partnerCard]}>
          <Text style={styles.answerLabel}>A VOICE FOR YOU</Text>
          <Text style={styles.sentTitle}>Their answer is here</Text>
          <VoiceNotePlayer item={partner} localUri={reviewMediaUri} label="your partner’s daily voice note" />
        </View>
      )}
    </DailyMediaScaffold>
  );
}

const styles = StyleSheet.create({
  errorCard: { borderRadius: HearthTheme.radius.md, padding: HearthTheme.space.md, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  errorTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 17, lineHeight: 21, marginBottom: 2 },
  errorText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  successCard: { borderRadius: HearthTheme.radius.md, padding: HearthTheme.space.md, backgroundColor: HearthTheme.color.successSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  successText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  recordCard: {
    borderRadius: HearthTheme.radius.page, padding: 18, alignItems: 'center', backgroundColor: HearthTheme.color.parchmentRaised,
    borderWidth: 1, borderColor: HearthTheme.color.lineStrong,
  },
  answerCard: { borderRadius: HearthTheme.radius.lg, padding: 16, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  partnerCard: { backgroundColor: HearthTheme.color.parchmentWarm },
  answerLabel: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, letterSpacing: 1.3 },
  sentTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 20, lineHeight: 24, marginTop: 3 },
  recordArt: {
    width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center',
    backgroundColor: HearthTheme.color.ink, borderWidth: 8, borderColor: HearthTheme.color.inkMuted, marginBottom: 12,
  },
  recordArtLive: { borderColor: HearthTheme.color.coral },
  recordDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: HearthTheme.color.coralSoft, borderWidth: 5, borderColor: HearthTheme.color.gold },
  recordTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 22 },
  recordBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 290, marginTop: 5, marginBottom: 14 },
  privacyNote: { width: '100%', marginBottom: 14, padding: 12, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.sageSoft },
  privacyNoteText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  timer: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 28, marginBottom: 2 },
  primary: { minHeight: HearthTheme.touch.minimum, minWidth: 150, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: HearthTheme.color.clayPressed },
  primaryText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14 },
  secondary: { minHeight: HearthTheme.touch.minimum, minWidth: 120, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  secondaryText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14 },
  row: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 12 },
  flex: { flex: 1, minWidth: 0 },
  deleteButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 2 },
  deleteText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  deleteConfirm: { marginTop: 8, padding: 14, borderRadius: 18, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.coral },
  deleteTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 18, lineHeight: 22 },
  deleteBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  deleteAction: { minHeight: HearthTheme.touch.minimum, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: HearthTheme.color.danger, backgroundColor: HearthTheme.color.parchmentRaised },
  deleteActionText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.7 },
});
