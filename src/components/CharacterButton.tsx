import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMomentV2Store } from '@/state/momentV2Store';
import { editorial } from '@/theme/hearth';

/** A tiny wardrobe mark: a warm little character framed like a fitting-room mirror. */
function WardrobeMark() {
  return (
    <View style={styles.mark} pointerEvents="none">
      <View style={styles.mirrorFrame} />
      <View style={styles.hair} />
      <View style={styles.head} />
      <View style={styles.body} />
      <View style={styles.bodyHighlight} />
      <Text style={styles.sparkle}>✦</Text>
    </View>
  );
}

export function CharacterButton() {
  const hasMoments = useMomentV2Store((state) => state.snapshot?.active != null);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        hasMoments ? styles.buttonAtBottom : styles.buttonAboveSignal,
        pressed && styles.buttonPressed,
      ]}
      onPress={() => router.push('/wardrobe' as never)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Customize your character"
      accessibilityHint="Open the wardrobe"
    >
      <WardrobeMark />
      <Text style={styles.label}>Style</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 18,
    width: 62,
    height: 68,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
    backgroundColor: editorial.paper,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
    zIndex: 5,
  },
  buttonAtBottom: { bottom: 24 },
  buttonAboveSignal: { bottom: 106 },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
  },
  mirrorFrame: {
    position: 'absolute',
    left: 7,
    top: 5,
    width: 24,
    height: 29,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: editorial.clay,
    backgroundColor: editorial.claySoft,
  },
  hair: {
    position: 'absolute',
    left: 14,
    top: 10,
    width: 11,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#241812',
    zIndex: 2,
  },
  head: {
    position: 'absolute',
    left: 15,
    top: 12,
    width: 10,
    height: 11,
    borderRadius: 5,
    backgroundColor: '#f2c9a2',
    zIndex: 1,
  },
  body: {
    position: 'absolute',
    left: 12,
    top: 22,
    width: 16,
    height: 13,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#d96b5f',
    zIndex: 3,
  },
  bodyHighlight: {
    position: 'absolute',
    left: 20,
    top: 24,
    width: 3,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 231, 185, 0.58)',
    zIndex: 4,
  },
  sparkle: {
    position: 'absolute',
    right: 2,
    top: 0,
    color: '#ffe0a5',
    fontSize: 11,
    lineHeight: 14,
    zIndex: 5,
  },
  label: {
    color: editorial.inkSoft,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
