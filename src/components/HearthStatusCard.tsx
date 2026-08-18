import { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { restoreMomentCameraFocus } from '@/scene/cameraState';
import { useAuthStore } from '@/state/authStore';
import { useDailyRitualStore } from '@/state/dailyRitualStore';
import { firePresentation } from '@/state/firePresentation';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { editorial, momentsTypography } from '@/theme/hearth';

const OUTCOME_COPY: Record<string, string> = {
  fireplace_reconnected: 'You found your way back to the fire.',
  garden_ready: 'The garden grew quiet again.',
  sofa_care: 'A little care was shared.',
  table_talked: 'You made room to talk.',
  rest_ready: 'Rest was held gently.',
  romantic_remote_affection: 'A little affection was shared.',
};

export function HearthStatusCard() {
  const open = useMomentsSurfaceStore((state) => state.hearthOpen);
  const closeHearth = useMomentsSurfaceStore((state) => state.closeHearth);
  const snapshot = useMomentV2Store((state) => state.snapshot);
  const resumePlayback = useMomentV2Store((state) => state.resumePlayback);
  const ritualState = useDailyRitualStore((state) => state.snapshot?.fire_state ?? 'steady');
  const memberA = useAuthStore((state) => state.couple?.member_a ?? null);
  const memberB = useAuthStore((state) => state.couple?.member_b ?? null);
  const completing = useSceneStore((state) => state.readinessHeartComplete);
  const insets = useSafeAreaInsets();

  const close = useCallback(() => {
    closeHearth();
    restoreMomentCameraFocus();
    resumePlayback();
  }, [closeHearth, resumePlayback]);

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, open]);

  if (!open) return null;
  const activeFireplace = snapshot?.active?.destination === 'fireplace';
  const isReady = (userId: string | null) => activeFireplace
    && !!userId
    && snapshot.participants.find((participant) => participant.user_id === userId)?.readiness === true;
  const leftReady = isReady(memberA);
  const rightReady = isReady(memberB);
  const readyCount = Number(leftReady) + Number(rightReady);
  const fire = firePresentation(ritualState, activeFireplace, readyCount, completing);
  const today = snapshot?.today_outcomes ?? [];

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close hearth status"
        style={StyleSheet.absoluteFill}
        onPress={close}
      />
      <View
        accessibilityRole="summary"
        accessibilityLabel={`Fire: ${fire.label}. ${fire.description}`}
        style={[styles.card, { bottom: insets.bottom + 62 }]}
      >
        <View style={styles.sticker}><Text style={styles.stickerText}>♥</Text></View>
        <Text style={styles.eyebrow}>The hearth</Text>
        <Text style={styles.title}>Fire: {fire.label}</Text>
        <Text style={styles.body}>{fire.description}</Text>
        {activeFireplace && (
          <View style={styles.tendingRow}>
            <View style={[styles.miniHalf, leftReady && styles.miniHalfOn]} />
            <View style={[styles.miniHalf, rightReady && styles.miniHalfOn]} />
            <Text style={styles.tendingCopy}>{readyCount === 0 ? 'The reconnect heart is waiting.' : readyCount === 1 ? 'One half is warm.' : 'The heart is whole.'}</Text>
          </View>
        )}
        {!!today.length && (
          <View style={styles.today}>
            <Text style={styles.todayTitle}>Little moments today</Text>
            {today.slice(-3).map((outcome) => (
              <Text key={outcome.signal_id} style={styles.todayLine}>• {OUTCOME_COPY[outcome.terminal_reason] ?? 'A shared moment came to rest.'}</Text>
            ))}
          </View>
        )}
        {!today.length && <Text style={styles.empty}>Today is still an open page.</Text>}
        <Text style={styles.hint}>Tap outside to return home</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', inset: 0, zIndex: 50, backgroundColor: 'rgba(55, 31, 24, 0.18)' },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    width: '84%',
    maxWidth: 336,
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 15,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#DDA78C',
    backgroundColor: '#FFF8EE',
    shadowColor: editorial.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 14,
  },
  sticker: { position: 'absolute', top: -14, right: 19, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7C6C7', borderWidth: 2, borderColor: '#FFF8EE', transform: [{ rotate: '7deg' }] },
  stickerText: { color: '#B84B5C', fontFamily: momentsTypography.heading, fontSize: 19, lineHeight: 22 },
  eyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 12 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 26, lineHeight: 31, marginTop: 2 },
  body: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 14, lineHeight: 20, marginTop: 5 },
  tendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13, padding: 10, borderRadius: 16, backgroundColor: '#F9E1D5' },
  miniHalf: { width: 17, height: 28, marginRight: 2, backgroundColor: '#E4C4BD', borderWidth: 1, borderColor: '#A7786C' },
  miniHalfOn: { backgroundColor: '#EC7182', borderColor: '#B83F58' },
  tendingCopy: { flex: 1, color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 16, marginLeft: 8 },
  today: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong },
  todayTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 15, lineHeight: 19, marginBottom: 4 },
  todayLine: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 18 },
  empty: { color: editorial.inkFaint, fontFamily: momentsTypography.body, fontSize: 12, fontStyle: 'italic', marginTop: 14 },
  hint: { color: editorial.inkFaint, fontFamily: momentsTypography.body, fontSize: 10, textAlign: 'center', marginTop: 13 },
});
