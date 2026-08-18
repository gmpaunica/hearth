import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PORTRAIT_HEIGHT, PORTRAIT_WIDTH } from '@/state/drawingCodec';
import { type DrawingPoint } from '@/state/drawingStroke';
import { PALETTE, useDrawingStore } from '@/state/drawingStore';
import { editorial } from '@/theme/hearth';
import { PixelArt } from './PixelArt';

const COLOR_NAMES = ['Amber', 'Coral', 'Pink', 'Sky', 'Sage', 'Butter', 'Cream', 'Ink'];
const BRUSHES = [
  { label: 'Extra fine', radius: 0.5, dot: 3 },
  { label: 'Fine', radius: 1.25, dot: 5 },
  { label: 'Medium', radius: 2.5, dot: 8 },
  { label: 'Bold', radius: 4.5, dot: 12 },
] as const;

type DrawingCanvasProps = {
  width: number;
  onDrawingActiveChange?: (active: boolean) => void;
};

/** A portrait raster canvas with one store update per animation frame. */
export function DrawingCanvas({ width, onDrawingActiveChange }: DrawingCanvasProps) {
  const height = (width * PORTRAIT_HEIGHT) / PORTRAIT_WIDTH;
  const myGrid = useDrawingStore((state) => state.myGrid);
  const continueStroke = useDrawingStore((state) => state.continueStroke);
  const finishStroke = useDrawingStore((state) => state.finishStroke);
  const clearMine = useDrawingStore((state) => state.clearMine);

  const [color, setColor] = useState(0); // palette index; -1 = eraser
  const [brushIndex, setBrushIndex] = useState(0);
  const queuedPoints = useRef<DrawingPoint[]>([]);
  const frame = useRef<number | null>(null);
  const drawingActive = useRef(false);
  const brush = BRUSHES[brushIndex];

  const beginDrawing = useCallback(() => {
    if (drawingActive.current) return;
    drawingActive.current = true;
    onDrawingActiveChange?.(true);
  }, [onDrawingActiveChange]);

  const endDrawing = useCallback(() => {
    if (!drawingActive.current) return;
    drawingActive.current = false;
    onDrawingActiveChange?.(false);
  }, [onDrawingActiveChange]);

  const flushFrame = useCallback(() => {
    frame.current = null;
    const points = queuedPoints.current;
    queuedPoints.current = [];
    if (points.length > 0) {
      continueStroke(points, color < 0 ? '.' : String(color), brush.radius);
    }
  }, [brush.radius, color, continueStroke]);

  const queuePoint = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      queuedPoints.current.push({
        x: Math.max(0, Math.min(PORTRAIT_WIDTH - 1, (locationX / width) * PORTRAIT_WIDTH)),
        y: Math.max(
          0,
          Math.min(PORTRAIT_HEIGHT - 1, (locationY / height) * PORTRAIT_HEIGHT),
        ),
      });
      if (frame.current === null) frame.current = requestAnimationFrame(flushFrame);
    },
    [flushFrame, height, width],
  );

  const grantResponder = useCallback(
    (event: GestureResponderEvent) => {
      beginDrawing();
      queuePoint(event);
    },
    [beginDrawing, queuePoint],
  );

  const finish = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    flushFrame();
    finishStroke();
    endDrawing();
  }, [endDrawing, finishStroke, flushFrame]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (drawingActive.current) onDrawingActiveChange?.(false);
    },
    [onDrawingActiveChange],
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.canvasBox, { width, height }]}>
        <PixelArt grid={myGrid} width={width} height={height} borderRadius={18} />
        <View
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Sketch canvas"
          onTouchStart={beginDrawing}
          onTouchEnd={endDrawing}
          onTouchCancel={endDrawing}
          onStartShouldSetResponderCapture={() => true}
          onMoveShouldSetResponderCapture={() => true}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={grantResponder}
          onResponderMove={queuePoint}
          onResponderRelease={finish}
          onResponderTerminate={finish}
        />
      </View>

      <View style={styles.brushes} accessibilityRole="radiogroup">
        {BRUSHES.map((preset, index) => (
          <Pressable
            key={preset.label}
            onPress={() => setBrushIndex(index)}
            style={[styles.brush, brushIndex === index && styles.brushOn]}
            accessibilityRole="radio"
            accessibilityLabel={`${preset.label} brush`}
            accessibilityState={{ selected: brushIndex === index }}
          >
            <View
              style={[
                styles.brushDot,
                { width: preset.dot, height: preset.dot, borderRadius: preset.dot / 2 },
              ]}
            />
            <Text style={[styles.brushText, brushIndex === index && styles.brushTextOn]}>
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.palette}>
        {PALETTE.map((swatch, index) => (
          <Pressable
            key={swatch}
            onPress={() => setColor(index)}
            style={[
              styles.swatch,
              { backgroundColor: swatch },
              color === index && styles.swatchOn,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${COLOR_NAMES[index]} pencil`}
            accessibilityState={{ selected: color === index }}
          />
        ))}
        <Pressable
          onPress={() => setColor(-1)}
          style={[styles.tool, styles.eraser, color === -1 && styles.swatchOn]}
          accessibilityRole="button"
          accessibilityLabel={`Eraser, ${brush.label.toLowerCase()} size`}
          accessibilityState={{ selected: color === -1 }}
        >
          <Text style={styles.eraserText}>Eraser</Text>
        </Pressable>
        <Pressable
          onPress={clearMine}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Clear sketch"
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 9 },
  canvasBox: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    overflow: 'hidden',
    shadowColor: editorial.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  brushes: {
    width: '100%',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  brush: {
    minHeight: 33,
    flex: 1,
    maxWidth: 88,
    paddingHorizontal: 5,
    borderRadius: 13,
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  brushOn: { backgroundColor: editorial.claySoft, borderColor: editorial.clay },
  brushDot: { backgroundColor: editorial.ink },
  brushText: { color: editorial.inkSoft, fontSize: 8, fontWeight: '700' },
  brushTextOn: { color: editorial.clayDark },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: editorial.ink,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tool: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eraser: {
    backgroundColor: editorial.paperTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraserText: { color: editorial.ink, fontSize: 10, fontWeight: '700' },
  clear: {
    paddingHorizontal: 11,
    height: 30,
    borderRadius: 15,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '700' },
});
