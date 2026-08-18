import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDrawingStore } from '@/state/drawingStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { editorial } from '@/theme/hearth';

function BookMark() {
  return (
    <View style={styles.mark} pointerEvents="none">
      <View style={[styles.cover, styles.leftCover]} />
      <View style={[styles.cover, styles.rightCover]} />
      <View style={styles.bookSpine} />
      <View style={styles.leftLine} />
      <View style={styles.rightLine} />
      <Text style={styles.heart}>♥</Text>
    </View>
  );
}

export function RitualsButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMoments = useMomentV2Store((state) => state.snapshot?.active != null);

  const openSketchbook = () => {
    setMenuOpen(false);
    useDrawingStore.getState().requestSketchbook();
  };

  return (
    <>
      {menuOpen && (
        <View
          style={[
            styles.menu,
            hasMoments ? styles.menuAtBottom : styles.menuAboveSignal,
          ]}
        >
          <Text style={styles.menuKicker}>RITUALS</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={openSketchbook}
            accessibilityRole="menuitem"
            accessibilityLabel="Open sketchbook"
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>□</Text>
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuTitle}>Sketchbook</Text>
              <Text style={styles.menuHint}>Every day, side by side</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          hasMoments ? styles.buttonAtBottom : styles.buttonAboveSignal,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => setMenuOpen((open) => !open)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Rituals"
        accessibilityHint="Open the rituals menu"
        accessibilityState={{ expanded: menuOpen }}
      >
        <BookMark />
        <Text style={styles.label}>Rituals</Text>
      </Pressable>
    </>
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
    zIndex: 6,
  },
  buttonAtBottom: { bottom: 102 },
  buttonAboveSignal: { bottom: 184 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
  },
  cover: {
    position: 'absolute',
    top: 8,
    width: 14,
    height: 22,
    backgroundColor: '#fff8ea',
    borderWidth: 1.5,
    borderColor: editorial.clay,
  },
  leftCover: { left: 5, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  rightCover: { right: 5, borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  bookSpine: {
    position: 'absolute',
    left: 18,
    top: 8,
    width: 2,
    height: 23,
    backgroundColor: editorial.gold,
  },
  leftLine: {
    position: 'absolute',
    left: 8,
    top: 15,
    width: 7,
    height: 1,
    backgroundColor: editorial.lineStrong,
  },
  rightLine: {
    position: 'absolute',
    right: 8,
    top: 15,
    width: 7,
    height: 1,
    backgroundColor: editorial.lineStrong,
  },
  heart: {
    position: 'absolute',
    left: 15,
    top: 20,
    color: editorial.rose,
    fontSize: 9,
    lineHeight: 11,
  },
  label: {
    color: editorial.inkSoft,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  menu: {
    position: 'absolute',
    left: 18,
    width: 252,
    padding: 10,
    borderRadius: 22,
    backgroundColor: editorial.paper,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 12,
    zIndex: 20,
  },
  menuAtBottom: { bottom: 176 },
  menuAboveSignal: { bottom: 258 },
  menuKicker: {
    color: editorial.clay,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 7,
  },
  menuItem: {
    minHeight: 62,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.line,
    paddingHorizontal: 10,
  },
  menuItemPressed: { opacity: 0.72 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorial.claySoft,
  },
  menuIconText: { color: editorial.clay, fontSize: 21, lineHeight: 24 },
  menuCopy: { flex: 1, paddingHorizontal: 10 },
  menuTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 16, fontWeight: '700' },
  menuHint: { color: editorial.inkSoft, fontSize: 10, marginTop: 2 },
  chevron: { color: editorial.clay, fontSize: 24, lineHeight: 26 },
});
