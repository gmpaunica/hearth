import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSceneStore } from '@/state/sceneStore';

const HEART = [
  '..111..111..', '.1111111111.', '111111111111', '111111111111',
  '.1111111111.', '..11111111..', '...111111...', '....1111....', '.....11.....',
] as const;

/** Fast UI-layer payoff for every positive non-Romantic ending. */
export function PixelHeartPayoff() {
  const payoff = useSceneStore((state) => state.momentPayoff);
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const progress = useSharedValue(0);
  const visible = !!payoff && payoff.destination !== 'romantic'
    && (payoff.kind === 'heart' || payoff.kind === 'mutual_heart');

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [payoff?.eventId, progress, reduceMotion, visible]);

  const animated = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : Math.min(1, progress.value * 5) * (1 - Math.max(0, progress.value - 0.72) / 0.28),
    transform: [{ scale: reduceMotion ? 1 : 0.65 + Math.min(1, progress.value * 4) * 0.45 }],
  }));
  if (!visible) return null;

  return (
    <View pointerEvents="none" accessibilityLabel="A warm heart marks this positive ending" style={styles.overlay}>
      <Animated.View style={[styles.heart, animated]}>
        {HEART.map((row, y) => (
          <View key={y} style={styles.row}>
            {[...row].map((cell, x) => <View key={x} style={[styles.pixel, cell === '1' && styles.pixelOn]} />)}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, zIndex: 65, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(87,42,31,0.08)' },
  heart: { width: 180, height: 135, shadowColor: '#6B2F32', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  row: { flex: 1, flexDirection: 'row' },
  pixel: { flex: 1 },
  pixelOn: { backgroundColor: '#EF6678' },
});
