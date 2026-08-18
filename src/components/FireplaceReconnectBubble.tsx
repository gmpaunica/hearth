import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/state/authStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useSceneStore } from '@/state/sceneStore';
import { useWorldAnchorStore } from '@/state/worldAnchorStore';
import { editorial, momentsTypography } from '@/theme/hearth';

const HEART = [
  '.11..11.',
  '11111111',
  '11111111',
  '.111111.',
  '..1111..',
  '...11...',
] as const;

function SplitHeart({ leftOn, rightOn }: { leftOn: boolean; rightOn: boolean }) {
  return (
    <View importantForAccessibility="no-hide-descendants" style={styles.heartGrid}>
      {HEART.map((row, y) => (
        <View key={y} style={styles.heartRow}>
          {[...row].map((cell, x) => (
            <View
              key={x}
              style={[
                styles.heartCell,
                cell === '1' && styles.heartPixel,
                cell === '1' && (x < 4 ? leftOn : rightOn) && styles.heartPixelOn,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Member A owns the left half and member B the right on both phones. */
export function FireplaceReconnectBubble() {
  const snapshot = useMomentV2Store((state) => state.snapshot);
  const busy = useMomentV2Store((state) => state.busyAction != null);
  const setReadiness = useMomentV2Store((state) => state.setReadiness);
  const completion = useMomentV2Store((state) => state.liveCompletion);
  const transientComplete = useSceneStore((state) => state.readinessHeartComplete);
  const anchor = useWorldAnchorStore((state) => state.anchors.fireplace_readiness);
  const memberA = useAuthStore((state) => state.couple?.member_a ?? null);
  const memberB = useAuthStore((state) => state.couple?.member_b ?? null);
  const userId = useAuthStore((state) => state.userId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const active = snapshot?.active?.destination === 'fireplace' ? snapshot.active : null;
  const completing = transientComplete || completion?.destination === 'fireplace';
  if ((!active && !completing) || !anchor || !memberA || !memberB) return null;

  const participant = (id: string) => snapshot?.participants.find((item) => item.user_id === id);
  const leftOn = completing || participant(memberA)?.readiness === true;
  const rightOn = completing || participant(memberB)?.readiness === true;
  const bothJoined = !!active
    && !!participant(memberA)?.joined_at
    && !!participant(memberB)?.joined_at;
  const mineOn = userId === memberA ? leftOn : rightOn;
  const actionable = !!active && bothJoined && !!userId && !busy;
  const copy = completing
    ? 'Reconnected'
    : bothJoined
      ? mineOn ? 'Tap if you need more time' : 'Tap to reconnect'
      : 'Meet at the fire';
  const accessibilityLabel = completing
    ? 'Reconnect heart complete'
    : `${copy}. ${leftOn ? 'Left half filled.' : 'Left half empty.'} ${rightOn ? 'Right half filled.' : 'Right half empty.'}`;
  const safeX = Math.min(width - 87, Math.max(87, anchor.x));
  const safeY = Math.min(height - insets.bottom - 154, Math.max(insets.top + 106, anchor.y));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !actionable, selected: mineOn }}
        disabled={!actionable}
        onPress={() => {
          if (active) void setReadiness(active.signal_id, !mineOn);
        }}
        style={({ pressed }) => [
          styles.bubble,
          { left: safeX - 77, top: safeY - 122 },
          !actionable && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.tail} />
        <SplitHeart leftOn={leftOn} rightOn={rightOn} />
        <Text style={styles.copy}>{copy}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: 154,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 22,
    backgroundColor: '#FFF8EE',
    borderWidth: 3,
    borderColor: '#7B4032',
    shadowColor: '#321A14',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
    zIndex: 34,
  },
  tail: {
    position: 'absolute',
    bottom: -9,
    width: 17,
    height: 17,
    backgroundColor: '#FFF8EE',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#7B4032',
    transform: [{ rotate: '45deg' }],
  },
  heartGrid: { width: 96, height: 72 },
  heartRow: { flex: 1, flexDirection: 'row' },
  heartCell: { flex: 1, margin: 0.7 },
  heartPixel: {
    backgroundColor: '#E8D0C8',
    borderWidth: 1,
    borderColor: '#A7786C',
  },
  heartPixelOn: { backgroundColor: '#EC7182', borderColor: '#B83F58' },
  copy: {
    color: editorial.ink,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: momentsTypography.bodyBold,
    textAlign: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.9 },
  pressed: { transform: [{ scale: 0.96 }] },
});
