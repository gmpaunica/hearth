import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeProgress } from '@/state/homeProgress';
import { editorial, momentsTypography } from '@/theme/hearth';

function GreenhouseMark() {
  return (
    <View style={styles.mark} pointerEvents="none">
      <View style={styles.roofLeft} />
      <View style={styles.roofRight} />
      <View style={styles.house}>
        <View style={styles.frameVertical} />
        <View style={styles.frameHorizontal} />
        <View style={styles.door} />
      </View>
      <View style={styles.sproutStem} />
      <View style={[styles.leaf, styles.leafLeft]} />
      <View style={[styles.leaf, styles.leafRight]} />
    </View>
  );
}

export function GreenhouseButton() {
  const { components } = useHomeProgress();
  if (!components.has('garden')) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={() => router.push('/greenhouse' as never)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Garden memories"
      accessibilityHint="Open the memory greenhouse"
    >
      <GreenhouseMark />
      <Text style={styles.label}>Memories</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    backgroundColor: editorial.paper,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
    zIndex: 6,
  },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  mark: { width: 40, height: 36 },
  roofLeft: {
    position: 'absolute', left: 5, top: 7, width: 18, height: 3,
    borderRadius: 2, backgroundColor: editorial.clay, transform: [{ rotate: '-31deg' }],
  },
  roofRight: {
    position: 'absolute', right: 5, top: 7, width: 18, height: 3,
    borderRadius: 2, backgroundColor: editorial.clay, transform: [{ rotate: '31deg' }],
  },
  house: {
    position: 'absolute', left: 5, right: 5, top: 10, bottom: 2,
    borderWidth: 2, borderColor: editorial.clay, backgroundColor: '#dce9d4',
  },
  frameVertical: {
    position: 'absolute', left: 13, top: 0, bottom: 0, width: 2, backgroundColor: editorial.clay,
  },
  frameHorizontal: {
    position: 'absolute', left: 0, right: 0, top: 8, height: 2, backgroundColor: editorial.clay,
  },
  door: {
    position: 'absolute', right: 3, bottom: 0, width: 7, height: 11,
    borderWidth: 1, borderBottomWidth: 0, borderColor: editorial.clayDark,
  },
  sproutStem: {
    position: 'absolute', left: 18, bottom: 3, width: 2, height: 10, backgroundColor: editorial.sage,
  },
  leaf: { position: 'absolute', width: 7, height: 4, borderRadius: 5, backgroundColor: editorial.sage },
  leafLeft: { left: 13, bottom: 7, transform: [{ rotate: '28deg' }] },
  leafRight: { left: 19, bottom: 10, transform: [{ rotate: '-28deg' }] },
  label: {
    color: editorial.inkSoft,
    fontFamily: momentsTypography.bodyBold,
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
  },
});
