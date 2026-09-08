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
import { HearthTheme } from '@/theme/hearth';
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
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

      <View style={styles.palette} accessibilityRole="radiogroup">
        {PALETTE.map((swatch, index) => (
          <Pressable
            key={swatch}
            onPress={() => setColor(index)}
            style={[
              styles.swatch,
              { backgroundColor: swatch },
              color === index && styles.swatchOn,
            ]}
            accessibilityRole="radio"
            accessibilityLabel={`${COLOR_NAMES[index]} pencil`}
            accessibilityState={{ selected: color === index }}
          />
        ))}
      </View>

      <View style={styles.toolRow}>
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
          onPress={() => setToolsOpen((open) => !open)}
          style={[styles.tool, styles.moreTools]}
          accessibilityRole="button"
          accessibilityLabel={toolsOpen ? 'Hide drawing tools' : 'Show drawing tools'}
          accessibilityState={{ expanded: toolsOpen }}
        >
          <Text style={styles.toolText}>{toolsOpen ? 'Fewer tools' : 'Brush & clear'}</Text>
        </Pressable>
      </View>

      {toolsOpen && (
        <View style={styles.toolsPanel}>
          <Text style={styles.panelLabel}>Brush size</Text>
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
          {confirmingClear ? (
            <View style={styles.clearConfirm} accessibilityLiveRegion="polite">
              <Text style={styles.clearConfirmText}>Clear every mark on this unsent sketch?</Text>
              <View style={styles.clearActions}>
                <Pressable
                  onPress={() => setConfirmingClear(false)}
                  style={styles.clearKeep}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearKeepText}>Keep drawing</Text>
                </Pressable>
                <Pressable
                  onPress={() => { clearMine(); setConfirmingClear(false); }}
                  style={styles.clearDanger}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearDangerText}>Clear sketch</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setConfirmingClear(true)}
              style={styles.clear}
              accessibilityRole="button"
              accessibilityLabel="Clear sketch"
            >
              <Text style={styles.clearText}>Clear this sketch</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: HearthTheme.space.md },
  canvasBox: {
    borderRadius: HearthTheme.radius.lg,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    overflow: 'hidden',
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  palette: {
    maxWidth: 224,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: HearthTheme.space.sm,
    justifyContent: 'center',
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: HearthTheme.radius.pill,
    borderWidth: 3,
    borderColor: HearthTheme.color.parchment,
  },
  swatchOn: {
    borderColor: HearthTheme.color.ink,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolRow: {
    width: '100%',
    flexDirection: 'row',
    gap: HearthTheme.touch.gap,
  },
  tool: {
    minHeight: HearthTheme.touch.minimum,
    flex: 1,
    paddingHorizontal: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraser: { backgroundColor: HearthTheme.color.parchmentRaised },
  moreTools: { backgroundColor: HearthTheme.color.sageSoft, borderColor: HearthTheme.color.sage },
  eraserText: {
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  toolText: {
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  toolsPanel: {
    width: '100%',
    gap: HearthTheme.space.sm,
    padding: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.md,
    backgroundColor: HearthTheme.color.parchmentWarm,
  },
  panelLabel: {
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  brushes: { flexDirection: 'row', flexWrap: 'wrap', gap: HearthTheme.space.sm },
  brush: {
    minHeight: HearthTheme.touch.minimum,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: HearthTheme.space.sm,
    borderRadius: HearthTheme.radius.md,
    backgroundColor: HearthTheme.color.parchmentRaised,
    borderWidth: 1,
    borderColor: HearthTheme.color.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: HearthTheme.space.sm,
  },
  brushOn: { backgroundColor: HearthTheme.color.coralSoft, borderColor: HearthTheme.color.clay },
  brushDot: { backgroundColor: HearthTheme.color.ink },
  brushText: {
    color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.caption,
  },
  brushTextOn: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong },
  clear: {
    minHeight: HearthTheme.touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HearthTheme.radius.md,
  },
  clearText: {
    color: HearthTheme.color.danger,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  clearConfirm: { gap: HearthTheme.space.sm },
  clearConfirmText: {
    color: HearthTheme.color.danger,
    fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine,
  },
  clearActions: { flexDirection: 'row', gap: HearthTheme.touch.gap },
  clearKeep: {
    minHeight: HearthTheme.touch.minimum,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchmentRaised,
  },
  clearDanger: {
    minHeight: HearthTheme.touch.minimum,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.danger,
    backgroundColor: HearthTheme.color.dangerSoft,
  },
  clearKeepText: {
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  clearDangerText: {
    color: HearthTheme.color.danger,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
});
