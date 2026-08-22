import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeStore } from '@/state/homeStore';
import { useHomeStudioStore } from '@/state/homeStudioStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { editorial } from '@/theme/hearth';

function DecorateMark() {
  return (
    <View style={styles.mark} pointerEvents="none">
      <View style={[styles.swatch, styles.swatchRose]} />
      <View style={[styles.swatch, styles.swatchSage]} />
      <View style={[styles.swatch, styles.swatchGold]} />
      <View style={styles.brush} />
      <View style={styles.brushTip} />
    </View>
  );
}

export function DecorateButton() {
  const activeMoment = useMomentV2Store((state) => Boolean(state.snapshot?.active));
  const capabilities = useHomeStore((state) => state.resolved.capabilities);
  const disabled = activeMoment || capabilities.blockedByMoment || !capabilities.edit;

  const open = () => {
    if (disabled) return;
    useMomentsSurfaceStore.getState().completeMinimize();
    useMomentsSurfaceStore.getState().setSettingsOpen(true);
    void useHomeStudioStore.getState().open('decorate');
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
      onPress={open}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Decorate your shared home"
      accessibilityHint={disabled ? 'Home editing is currently paused' : 'Open Decorate mode'}
      accessibilityState={{ disabled }}
    >
      <DecorateMark />
      <Text style={styles.label}>Decorate</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute', right: 18, bottom: 102, width: 70, height: 68,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingTop: 4,
    backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow, shadowOpacity: 0.18, shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 }, elevation: 7, zIndex: 6,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.42 },
  mark: { width: 38, height: 34 },
  swatch: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: editorial.paper },
  swatchRose: { left: 2, top: 5, backgroundColor: editorial.rose },
  swatchSage: { left: 12, top: 1, backgroundColor: editorial.sage },
  swatchGold: { left: 18, top: 12, backgroundColor: editorial.gold },
  brush: { position: 'absolute', width: 5, height: 25, right: 7, top: 2, borderRadius: 3, backgroundColor: editorial.clay, transform: [{ rotate: '35deg' }] },
  brushTip: { position: 'absolute', width: 7, height: 8, right: 0, bottom: 1, borderRadius: 4, backgroundColor: editorial.inkSoft, transform: [{ rotate: '35deg' }] },
  label: { color: editorial.inkSoft, fontSize: 9, fontWeight: '700', marginTop: 1 },
});
