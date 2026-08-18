import { Image } from 'expo-image';
import { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { restoreMomentCameraFocus } from '@/scene/cameraState';
import { useAuthStore } from '@/state/authStore';
import { useDailyRitualStore } from '@/state/dailyRitualStore';
import { firePresentation } from '@/state/firePresentation';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { editorial, hearthUi, momentsTypography } from '@/theme/hearth';

const FIREPLACE_KEEPSAKE = require('../../assets/images/fireplace/fireplace-keepsake.webp');

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
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const insets = useSafeAreaInsets();
  const emberPulse = useSharedValue(0);

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

  const activeFireplace = snapshot?.active?.destination === 'fireplace';
  const isReady = (userId: string | null) => activeFireplace
    && !!userId
    && snapshot.participants.find((participant) => participant.user_id === userId)?.readiness === true;
  const leftReady = isReady(memberA);
  const rightReady = isReady(memberB);
  const readyCount = Number(leftReady) + Number(rightReady);
  const fire = firePresentation(ritualState, activeFireplace, readyCount, completing);
  const today = snapshot?.today_outcomes ?? [];

  useEffect(() => {
    emberPulse.value = !open || reduceMotion
      ? 0
      : withRepeat(
        withTiming(1, { duration: 1_450, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
  }, [emberPulse, open, reduceMotion]);

  const emberStyle = useAnimatedStyle(() => ({
    opacity: 0.24 + fire.intensity * (0.32 + emberPulse.value * 0.22),
    transform: [
      { translateY: reduceMotion ? 0 : -5 * emberPulse.value },
      { scale: 0.88 + fire.intensity * 0.18 + emberPulse.value * 0.06 },
    ],
  }));

  if (!open) return null;

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
        <View style={styles.artFrame}>
          <Image
            accessibilityLabel="A warm illustrated fireplace with two cushions and two mugs"
            contentFit="cover"
            source={FIREPLACE_KEEPSAKE}
            style={styles.artImage}
          />
          <View style={[styles.artGlow, { opacity: 0.08 + fire.intensity * 0.12 }]} />
          <Animated.View style={[styles.embers, emberStyle]} pointerEvents="none">
            <View style={[styles.ember, styles.emberOne]} />
            <View style={[styles.ember, styles.emberTwo]} />
            <View style={[styles.ember, styles.emberThree]} />
          </Animated.View>
          <View style={styles.artLabel}>
            <Text style={styles.artLabelHeart}>♥</Text>
            <Text style={styles.artLabelText}>A little place for us</Text>
          </View>
        </View>
        <View style={styles.copyWrap}>
          <Text style={styles.eyebrow}>The hearth</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Fire: {fire.label}</Text>
            <View style={styles.fireChip}><Text style={styles.fireChipText}>{Math.round(fire.intensity * 100)}% warm</Text></View>
          </View>
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
    padding: 8,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: hearthUi.outline,
    backgroundColor: hearthUi.shell,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 14,
  },
  sticker: { position: 'absolute', top: -14, right: 19, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hearthUi.blush, borderWidth: 3, borderColor: hearthUi.shell, transform: [{ rotate: '7deg' }], zIndex: 3 },
  stickerText: { color: '#B84B5C', fontFamily: momentsTypography.heading, fontSize: 19, lineHeight: 22 },
  artFrame: { height: 172, overflow: 'hidden', borderRadius: 23, borderWidth: 1, borderColor: hearthUi.outline, backgroundColor: hearthUi.shellWarm },
  artImage: { position: 'absolute', inset: 0 },
  artGlow: { position: 'absolute', alignSelf: 'center', top: 56, width: 92, height: 84, borderRadius: 44, backgroundColor: '#FFB13C' },
  embers: { position: 'absolute', alignSelf: 'center', top: 69, width: 68, height: 54 },
  ember: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD379' },
  emberOne: { left: 14, top: 24 },
  emberTwo: { left: 33, top: 7, width: 4, height: 4 },
  emberThree: { right: 12, top: 30, width: 3, height: 3 },
  artLabel: { position: 'absolute', left: 11, bottom: 10, minHeight: 27, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(118, 69, 49, 0.18)', backgroundColor: 'rgba(255, 249, 238, 0.9)' },
  artLabelHeart: { color: hearthUi.coralDark, fontSize: 11, marginRight: 5 },
  artLabelText: { color: hearthUi.cocoa, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  copyWrap: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 7 },
  eyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 24, lineHeight: 30, marginTop: 2 },
  fireChip: { minHeight: 27, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 14, backgroundColor: hearthUi.butter },
  fireChipText: { color: hearthUi.cocoa, fontFamily: momentsTypography.bodyBold, fontSize: 9 },
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
