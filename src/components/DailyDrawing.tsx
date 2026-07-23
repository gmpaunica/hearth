import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_GRID, useDrawingStore } from '@/state/drawingStore';
import { ui } from '@/theme/hearth';
import { DrawingCanvas } from './DrawingCanvas';
import { PixelArt } from './PixelArt';
import { PopIn } from './PopIn';

/**
 * The daily drawing ritual: a little pixel note you leave your partner, and
 * theirs to you. Resets each day. Opened from the envelope button (top-left),
 * which shows a dot when there's a fresh note from them.
 */
export function DailyDrawing() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'theirs' | 'yours'>('theirs');

  const partnerGrid = useDrawingStore((s) => s.partnerGrid);
  const partnerSeen = useDrawingStore((s) => s.partnerSeen);
  const mineSaved = useDrawingStore((s) => s.mineSaved);
  const myGrid = useDrawingStore((s) => s.myGrid);
  const saving = useDrawingStore((s) => s.saving);
  const loading = useDrawingStore((s) => s.loading);
  const load = useDrawingStore((s) => s.load);
  const save = useDrawingStore((s) => s.save);
  const markSeen = useDrawingStore((s) => s.markSeen);

  const hasNews = !!partnerGrid && !partnerSeen;
  const dirty = myGrid !== EMPTY_GRID && !mineSaved;

  useEffect(() => {
    if (open) {
      void load();
      markSeen();
      setTab(partnerGrid ? 'theirs' : 'yours');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel="Daily note"
      >
        <Text style={styles.fabIcon}>✉</Text>
        {hasNews && <View style={styles.badge} />}
      </Pressable>

      {open && (
        <View style={styles.overlay}>
          <PopIn style={styles.card}>
            <Text style={styles.title}>Today’s note</Text>

            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, tab === 'theirs' && styles.tabOn]}
                onPress={() => setTab('theirs')}
              >
                <Text style={[styles.tabText, tab === 'theirs' && styles.tabTextOn]}>
                  From them
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, tab === 'yours' && styles.tabOn]}
                onPress={() => setTab('yours')}
              >
                <Text style={[styles.tabText, tab === 'yours' && styles.tabTextOn]}>
                  Yours
                </Text>
              </Pressable>
            </View>

            {tab === 'theirs' ? (
              <View style={styles.theirs}>
                {loading ? (
                  <ActivityIndicator color={ui.accent} />
                ) : partnerGrid ? (
                  <>
                    <PixelArt grid={partnerGrid} size={260} />
                    <Text style={styles.caption}>They left this for you today.</Text>
                  </>
                ) : (
                  <Text style={styles.empty}>
                    Nothing yet today. They might leave you something — check back.
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.yours}>
                <DrawingCanvas />
                <Pressable
                  style={[styles.save, !dirty && styles.saveDim]}
                  onPress={save}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={ui.text} />
                  ) : (
                    <Text style={styles.saveText}>{mineSaved ? 'Update note' : 'Send it'}</Text>
                  )}
                </Pressable>
              </View>
            )}

            <Pressable style={styles.done} onPress={() => setOpen(false)} hitSlop={6}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </PopIn>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 22,
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { color: ui.accent, fontSize: 18, lineHeight: 20 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ui.accent,
    borderWidth: 1,
    borderColor: ui.overlayBg,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 8, 20, 0.66)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  title: { color: ui.text, fontSize: 20 },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: ui.chipBg,
    borderRadius: 16,
    padding: 4,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 13 },
  tabOn: { backgroundColor: ui.chipActiveBg },
  tabText: { color: ui.textDim, fontSize: 14 },
  tabTextOn: { color: ui.text },
  theirs: { alignItems: 'center', gap: 10, minHeight: 260, justifyContent: 'center' },
  caption: { color: ui.textDim, fontSize: 13, fontStyle: 'italic' },
  empty: {
    color: ui.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  yours: { alignItems: 'center', gap: 14 },
  save: {
    backgroundColor: ui.chipActiveBg,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 34,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDim: { opacity: 0.7 },
  saveText: { color: ui.text, fontSize: 15, letterSpacing: 0.3 },
  done: { paddingVertical: 6, paddingHorizontal: 20 },
  doneText: { color: ui.accent, fontSize: 15 },
});
