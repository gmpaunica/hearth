import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { RestMomentPayload, RestVisitor } from '@/lib/db';
import type { MomentConsequence } from '@/moments/consequenceCatalog';
import { useSceneStore } from '@/state/sceneStore';
import { editorial, hearthUi, momentsTypography } from '@/theme/hearth';
import { MomentConsequencePreview } from './MomentConsequencePreview';

const SIZE = 12;
const CELL_COUNT = SIZE * SIZE;
const EMPTY = '.'.repeat(CELL_COUNT);
export const REST_DOODLE_PALETTE = ['#D96F64', '#E7A35C', '#EFC4D1', '#7FA36A', '#79AFC1', '#4A3028'] as const;

const VISITOR_PIXELS: Record<RestVisitor, string[]> = {
  duck: ['..yyy...', '.yyyyy..', 'yykyoyy.', 'yyyyyyy.', '.yyyy...', '..o.....', '.gggg...'],
  frog: ['.g...g..', 'ggg.ggg.', 'gkg.gkg.', '.ggggg..', 'ggggggg.', '.g...g..', 'g.....g.'],
  toast: ['.bbbbb..', 'bcccccb.', 'bcckccb.', 'bccoccb.', 'bcccccb.', '.bbbbb..', '..b.b...'],
};
const VISITOR_COLORS: Record<string, string> = { y: '#F1C75B', o: '#E67D39', k: '#2D2623', g: '#6F9B63', b: '#9B603A', c: '#EBC38A' };

function VisitorSprite({ visitor }: { visitor: RestVisitor }) {
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = reduceMotion
      ? 0
      : withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [bounce, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: reduceMotion ? 0 : -4 * bounce.value }] }));
  return (
    <Animated.View style={[styles.visitorSprite, animated]}>
      {VISITOR_PIXELS[visitor].map((row, y) => (
        <View key={y} style={styles.visitorRow}>
          {[...row].map((cell, x) => <View key={x} style={[styles.visitorPixel, cell !== '.' && { backgroundColor: VISITOR_COLORS[cell] }]} />)}
        </View>
      ))}
    </Animated.View>
  );
}

function TinyDoodleEditor({ cells, onChange }: { cells: string; onChange: (cells: string) => void }) {
  const [color, setColor] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const current = useRef(cells);
  const painting = useRef(false);

  useEffect(() => {
    current.current = cells;
  }, [cells]);

  const paint = (x: number, y: number, width: number, height: number) => {
    const column = Math.max(0, Math.min(11, Math.floor(x / width * SIZE)));
    const row = Math.max(0, Math.min(11, Math.floor(y / height * SIZE)));
    const index = row * SIZE + column;
    if (current.current[index] === String(color)) return;
    const next = `${current.current.slice(0, index)}${color}${current.current.slice(index + 1)}`;
    current.current = next;
    onChange(next);
  };

  /* PanResponder invokes these callbacks only after touch events; refs keep a
   * drag's latest raster without rebuilding the responder mid-stroke. */
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      painting.current = true;
      setHistory((items) => [...items.slice(-19), current.current]);
      const { locationX, locationY } = event.nativeEvent;
      paint(locationX, locationY, 240, 240);
    },
    onPanResponderMove: (event) => {
      if (!painting.current) return;
      const { locationX, locationY } = event.nativeEvent;
      paint(locationX, locationY, 240, 240);
    },
    onPanResponderRelease: () => { painting.current = false; },
    onPanResponderTerminate: () => { painting.current = false; },
  // `paint` reads refs/current palette and intentionally keeps one responder.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [color, onChange]);

  const undo = () => {
    const previous = history.at(-1);
    if (previous == null) return;
    setHistory((items) => items.slice(0, -1));
    onChange(previous);
  };
  const clear = () => {
    if (cells === EMPTY) return;
    setHistory((items) => [...items.slice(-19), cells]);
    onChange(EMPTY);
  };

  return (
    <View style={styles.editorWrap}>
      <View accessibilityLabel="12 by 12 tiny doodle editor" style={styles.editor} {...pan.panHandlers}>
        {[...cells].map((cell, index) => (
          <View key={index} style={[styles.cell, cell !== '.' && { backgroundColor: REST_DOODLE_PALETTE[Number(cell)] }]} />
        ))}
      </View>
      <View style={styles.palette}>
        {REST_DOODLE_PALETTE.map((value, index) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: color === index }} accessibilityLabel={`Doodle color ${index + 1}`} onPress={() => setColor(index)} style={[styles.swatch, { backgroundColor: value }, color === index && styles.swatchOn]} />
        ))}
      </View>
      <View style={styles.editorActions}>
        <Pressable accessibilityRole="button" onPress={undo} disabled={!history.length} style={styles.smallButton}><Text style={styles.smallButtonText}>Undo</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={clear} disabled={cells === EMPTY} style={styles.smallButton}><Text style={styles.smallButtonText}>Clear</Text></Pressable>
      </View>
    </View>
  );
}

export function RestResponseComposer({ action, busy, onBack, onConfirm }: {
  action: MomentConsequence;
  busy: boolean;
  onBack: () => void;
  onConfirm: (input: { action: 'make_doodle' | 'send_visitor' | 'send_hug'; payload: RestMomentPayload }) => void;
}) {
  const [cells, setCells] = useState(EMPTY);
  const [visitor, setVisitor] = useState<RestVisitor | null>(null);
  const isDoodle = action.id === 'rest_doodle';
  const isVisitor = action.id === 'rest_visitor';
  const canSend = !busy && (!isDoodle || cells !== EMPTY) && (!isVisitor || visitor != null);
  const submit = () => {
    if (isDoodle) onConfirm({ action: 'make_doodle', payload: { version: 1, width: 12, height: 12, palette_id: 'hearth-rest-v1', cells } });
    else if (isVisitor && visitor) onConfirm({ action: 'send_visitor', payload: { version: 1, visitor } });
    else onConfirm({ action: 'send_hug', payload: { version: 1 } });
  };

  return (
    <View style={styles.composer}>
      <Text style={styles.title}>{action.title}</Text>
      <MomentConsequencePreview actionId={action.id} />
      {isDoodle && <TinyDoodleEditor cells={cells} onChange={setCells} />}
      {isVisitor && (
        <View style={styles.visitors}>
          {(['duck', 'frog', 'toast'] as const).map((choice) => (
            <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: visitor === choice }} onPress={() => setVisitor(choice)} style={[styles.visitorChoice, visitor === choice && styles.visitorChoiceOn]}>
              <VisitorSprite visitor={choice} />
              <Text style={styles.visitorLabel}>{choice === 'toast' ? 'Dancing toast' : choice[0].toUpperCase() + choice.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable accessibilityRole="button" disabled={!canSend} onPress={submit} style={[styles.send, !canSend && styles.disabled]}><Text style={styles.sendText}>Send</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>Choose another response</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { paddingBottom: 8 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 24, lineHeight: 29 },
  editorWrap: { alignItems: 'center', marginTop: 12, gap: 9 },
  editor: { width: 240, height: 240, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: hearthUi.shell, borderWidth: 2, borderBottomWidth: 4, borderColor: hearthUi.outline, borderRadius: 20 },
  cell: { width: 20, height: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(80,50,40,0.12)' },
  palette: { flexDirection: 'row', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
  swatchOn: { borderColor: editorial.ink, transform: [{ scale: 1.08 }] },
  editorActions: { flexDirection: 'row', gap: 8 },
  smallButton: { minWidth: 82, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: hearthUi.outline, borderRadius: 19, backgroundColor: hearthUi.shellRaised },
  smallButtonText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 12 },
  visitors: { flexDirection: 'row', gap: 7, marginTop: 12 },
  visitorChoice: { flex: 1, minHeight: 116, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderBottomWidth: 3, borderColor: hearthUi.outline, borderRadius: 21, backgroundColor: hearthUi.lavender, padding: 6 },
  visitorChoiceOn: { borderWidth: 2, borderColor: hearthUi.coralDark, backgroundColor: hearthUi.blush },
  visitorSprite: { width: 48, height: 42 },
  visitorRow: { flex: 1, flexDirection: 'row' },
  visitorPixel: { flex: 1 },
  visitorLabel: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 10, lineHeight: 13, textAlign: 'center', marginTop: 5 },
  send: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderBottomWidth: 4, borderColor: hearthUi.coralDark, backgroundColor: hearthUi.coral, marginTop: 12 },
  sendText: { color: '#FFFFFF', fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  back: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  backText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  disabled: { opacity: 0.45 },
});
