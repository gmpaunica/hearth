import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SIGNALS, type SignalType } from '@/copy';
import { useHomeProgress } from '@/state/homeProgress';
import { useSignalStore } from '@/state/signalStore';
import { ui } from '@/theme/hearth';
import { PopIn } from './PopIn';

const SIGNAL_ORDER: SignalType[] = ['fireplace', 'sofa', 'romantic', 'table', 'garden', 'rest'];

/**
 * "Leave a signal" — the main interaction. A soft pill button opens a glass
 * sheet listing the five places; choosing one sends the avatar walking there
 * and shows the matching self-copy card (SignalCards).
 */
export function SignalSheet() {
  const [open, setOpen] = useState(false);
  const mySignal = useSignalStore((s) => s.mySignal);
  const sendSignal = useSignalStore((s) => s.sendSignal);
  // You can only signal to places that exist in the home yet.
  const { signals } = useHomeProgress();
  const available = SIGNAL_ORDER.filter((t) => signals.has(t));

  if (mySignal) return null; // the active-signal card takes over

  return (
    <>
      {!open && (
        <Pressable style={styles.pill} onPress={() => setOpen(true)} hitSlop={8}>
          <Text style={styles.pillText}>✦  Leave a signal</Text>
        </Pressable>
      )}

      {open && (
        <PopIn style={styles.sheet}>
          <Text style={styles.sheetTitle}>Where do you want to be?</Text>
          {available.map((type) => (
            <Pressable
              key={type}
              style={styles.row}
              onPress={() => {
                sendSignal(type);
                setOpen(false);
              }}
            >
              <Text style={styles.rowLabel}>{SIGNALS[type].label}</Text>
              <Text style={styles.rowText}>“{SIGNALS[type].selfText}”</Text>
            </Pressable>
          ))}
          <Pressable style={styles.closeRow} onPress={() => setOpen(false)} hitSlop={6}>
            <Text style={styles.closeText}>Not now</Text>
          </Pressable>
        </PopIn>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  pillText: { color: ui.accent, fontSize: 15, letterSpacing: 0.4 },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sheetTitle: {
    color: ui.textDim,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginVertical: 8,
  },
  row: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 },
  rowLabel: { color: ui.text, fontSize: 15, marginBottom: 1 },
  rowText: { color: ui.textDim, fontSize: 13, fontStyle: 'italic' },
  closeRow: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  closeText: { color: ui.textDim, fontSize: 13 },
});
