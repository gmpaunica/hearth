import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { editorial, momentsTypography } from '@/theme/hearth';
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

export function DailyRecordScreen() {
  const recorder = useAudioRecorder(DAILY_VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const loading = useDailyMediaStore((state) => state.loading);
  const busy = useDailyMediaStore((state) => state.busy);
  const error = useDailyMediaStore((state) => state.error);
  const refresh = useDailyMediaStore((state) => state.refresh);
  const submitVoice = useDailyMediaStore((state) => state.submitVoice);
  const deleteArtifact = useDailyMediaStore((state) => state.deleteArtifact);
  const userId = useAuthStore((state) => state.userId);
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [closing, setClosing] = useState(false);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const closingRef = useRef(false);
  const mountedRef = useRef(true);

  const mine = mineFor(snapshot, userId, 'voice');
  const partner = partnerFor(snapshot, userId, 'voice');

  useEffect(() => {
    mountedRef.current = true;
    useMusicStore.getState().setMediaSessionBusy(true);
    void refresh(false);
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
  }, [refresh]);

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
    if (Platform.OS === 'web' || mine || busy) return;
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
    if (!previewUri || previewDuration <= 0 || playingPreview) return;
    if (await submitVoice(previewUri, previewDuration)) {
      setPreviewUri(null);
      setPreviewDuration(0);
      setPhase('idle');
    }
  };

  const confirmDelete = (id: string) => Alert.alert(
    'Delete your voice note?',
    'This is permanent and will not reopen today’s recording slot.',
    [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteArtifact('voice', id) },
    ],
  );

  return (
    <DailyMediaScaffold
      eyebrow="DAILY RECORD"
      title="A voice from today"
      icon="♪"
      prompt={snapshot?.voice_prompt ?? null}
      sharedCopy={snapshot?.shared_prompt_copy}
      onBack={() => void closeScreen()}
      backDisabled={closing}
    >
      {(error || localError) && (
        <View style={styles.errorCard} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{localError ?? error}</Text>
        </View>
      )}

      {mine ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerLabel}>YOUR ANSWER</Text>
          <Text style={styles.sentTitle}>Sent for today</Text>
          <VoiceNotePlayer item={mine} label="your daily voice note" />
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            onPress={() => confirmDelete(mine.id)}
            disabled={busy != null}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete your daily voice note"
          >
            <Text style={styles.deleteText}>Delete my note</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.recordCard}>
          {phase === 'idle' && (
            <>
              <View style={styles.recordArt}><View style={styles.recordDot} /></View>
              <Text style={styles.recordTitle}>Up to 30 seconds</Text>
              <Text style={styles.recordBody}>Record, listen back, then choose Send. Nothing leaves your phone before that.</Text>
              <Pressable
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                onPress={() => void startRecording()}
                disabled={loading || busy != null || Platform.OS === 'web'}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
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
                  <Text style={styles.primaryText}>{busy === 'voice-upload' ? 'Sending…' : 'Send'}</Text>
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
          <VoiceNotePlayer item={partner} label="your partner’s daily voice note" />
        </View>
      )}
    </DailyMediaScaffold>
  );
}

const styles = StyleSheet.create({
  errorCard: { borderRadius: 16, padding: 12, backgroundColor: '#f7ddd6', borderWidth: 1, borderColor: editorial.lineStrong },
  errorText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 17 },
  recordCard: {
    borderRadius: 27, padding: 18, alignItems: 'center', backgroundColor: editorial.paper,
    borderWidth: 1, borderColor: editorial.lineStrong,
  },
  answerCard: { borderRadius: 24, padding: 16, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong },
  partnerCard: { backgroundColor: '#f6eadf' },
  answerLabel: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 10, letterSpacing: 1.3 },
  sentTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 20, lineHeight: 24, marginTop: 3 },
  recordArt: {
    width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.ink, borderWidth: 8, borderColor: '#5f3d31', marginBottom: 12,
  },
  recordArtLive: { borderColor: editorial.rose },
  recordDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: editorial.clayWash, borderWidth: 5, borderColor: editorial.gold },
  recordTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 22 },
  recordBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 290, marginTop: 5, marginBottom: 14 },
  timer: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 28, marginBottom: 2 },
  primary: { minHeight: 48, minWidth: 150, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: editorial.clay },
  primaryText: { color: editorial.onAccent, fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  secondary: { minHeight: 48, minWidth: 120, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.lineStrong },
  secondaryText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  row: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 12 },
  flex: { flex: 1, minWidth: 0 },
  deleteButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 2 },
  deleteText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 11 },
  pressed: { opacity: 0.7 },
});
