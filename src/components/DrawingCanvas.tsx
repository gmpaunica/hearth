import { useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GRID, PALETTE, useDrawingStore } from '@/state/drawingStore';
import { ui } from '@/theme/hearth';
import { PixelArt } from './PixelArt';

const CANVAS = 280; // px

/** Finger-paint pixel canvas for your daily drawing. */
export function DrawingCanvas() {
  const myGrid = useDrawingStore((s) => s.myGrid);
  const setPixel = useDrawingStore((s) => s.setPixel);
  const clearMine = useDrawingStore((s) => s.clearMine);

  const [color, setColor] = useState(0); // palette index; -1 = eraser
  const colorRef = useRef(color);
  colorRef.current = color;

  // Paint using coordinates relative to the touch overlay (a single full-size
  // view), so a touch anywhere maps to the right cell.
  const paintAt = (e: GestureResponderEvent) => {
    const cell = CANVAS / GRID;
    const cx = Math.floor(e.nativeEvent.locationX / cell);
    const cy = Math.floor(e.nativeEvent.locationY / cell);
    if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) return;
    setPixel(cy * GRID + cx, colorRef.current < 0 ? '.' : String(colorRef.current));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: paintAt,
        onPanResponderMove: paintAt,
      }),
    // paintAt reads live values via refs/store; create once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.canvasBox}>
        <PixelArt grid={myGrid} size={CANVAS} />
        {/* Single transparent surface captures all touches → correct coords. */}
        <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />
      </View>

      <View style={styles.palette}>
        {PALETTE.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setColor(i)}
            style={[styles.swatch, { backgroundColor: c }, color === i && styles.swatchOn]}
          />
        ))}
        <Pressable
          onPress={() => setColor(-1)}
          style={[styles.swatch, styles.eraser, color === -1 && styles.swatchOn]}
        >
          <Text style={styles.eraserText}>⌫</Text>
        </Pressable>
        <Pressable onPress={clearMine} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  canvasBox: {
    width: CANVAS,
    height: CANVAS,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.overlayBorder,
    overflow: 'hidden',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: ui.text },
  eraser: { backgroundColor: ui.chipBg, alignItems: 'center', justifyContent: 'center' },
  eraserText: { color: ui.text, fontSize: 14 },
  clear: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: ui.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: ui.textDim, fontSize: 13 },
});
