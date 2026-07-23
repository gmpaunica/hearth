import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_GRID, useDrawingStore } from '@/state/drawingStore';
import { useSignalStore } from '@/state/signalStore';
import { ui } from '@/theme/hearth';
import { DrawingCanvas } from './DrawingCanvas';
import { PixelArt } from './PixelArt';
import { PopIn } from './PopIn';

/**
 * The daily drawing ritual: one little pixel note a day, each way. Opened from
 * the envelope button (top-left), the "new note" banner, or by tapping the
 * frame in the room. A note can only be sent once per day.
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
  const error = useDrawingStore((s) => s.error);
  const openRequested = useDrawingStore((s) => s.openRequested);
  const load = useDrawingStore((s) => s.load);
  const save = useDrawingStore((s) => s.save);
  const markSeen = useDrawingStore((s) => s.markSeen);
  const clearOpenRequest = useDrawingStore((s) => s.clearOpenRequest);

  // Don't float the banner while a signal card is up top — it would sit on top
  // of "I want to make up". The ✉ badge still flags the note.
  const activeCard = useSignalStore((s) => !!s.mySignal || !!s.partnerSignal);
  const hasNews = !!partnerGrid && !partnerSeen;
  const canSend = myGrid !== EMPTY_GRID && !mineSaved;

  // Tapping the frame in the room asks the panel to open.
  useEffect(() => {
    if (openRequested) {
      setOpen(true);
      clearOpenRequest();
    }
  }, [openRequested, clearOpenRequest]);

  useEffect(() => {
    if (open) {
      void load();
      markSeen();
      setTab(hasNews ? 'theirs' : mineSaved ? 'theirs' : 'yours');
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

      {hasNews && !open && !activeCard && (
        <Pressable style={styles.banner} onPress={() => setOpen(true)}>
          <Text style={styles.bannerText}>💌 Your partner drew you something</Text>
        </Pressable>
      )}

      {open && (
        <View style={styles.overlay}>
          <PopIn style={styles.card}>
            <Text style={styles.title}>Today’s note</Text>
            <Text style={styles.sub}>One little note a day, each way.</Text>

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
                <Text style={[styles.tabText, tab === 'yours' && styles.tabTextOn]}>Yours</Text>
              </Pressable>
            </View>

            {tab === 'theirs' ? (
              <View style={styles.viewer}>
                {loading ? (
                  <ActivityIndicator color={ui.accent} />
                ) : partnerGrid ? (
                  <>
                    <PixelArt grid={partnerGrid} size={280} />
                    <Text style={styles.caption}>They left this for you today.</Text>
                  </>
                ) : (
                  <Text style={styles.empty}>
                    Nothing yet today. They might leave you something — check back.
                  </Text>
                )}
              </View>
            ) : mineSaved ? (
              // Already sent today — show it, no re-send (one per day).
              <View style={styles.viewer}>
                <PixelArt grid={myGrid} size={280} />
                <Text style={styles.sentLine}>💌 Sent today — they can see it now.</Text>
                <Text style={styles.caption}>Come back tomorrow for a new one.</Text>
              </View>
            ) : (
              <View style={styles.yours}>
                <DrawingCanvas />
                {error && <Text style={styles.err}>{error}</Text>}
                <Pressable
                  style={[styles.send, !canSend && styles.sendDim]}
                  onPress={save}
                  disabled={saving || !canSend}
                >
                  {saving ? (
                    <ActivityIndicator color={ui.text} />
                  ) : (
                    <Text style={styles.sendText}>Send it</Text>
                  )}
                </Pressable>
                <Text style={styles.hint}>You can send once a day — make it count 💛</Text>
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
  banner: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    alignSelf: 'center',
    backgroundColor: ui.overlayBg,
    borderColor: ui.accentSoft,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: { color: ui.text, fontSize: 14 },
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
    gap: 12,
  },
  title: { color: ui.text, fontSize: 20 },
  sub: { color: ui.textDim, fontSize: 12, marginTop: -6 },
  tabs: { flexDirection: 'row', gap: 8, backgroundColor: ui.chipBg, borderRadius: 16, padding: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 13 },
  tabOn: { backgroundColor: ui.chipActiveBg },
  tabText: { color: ui.textDim, fontSize: 14 },
  tabTextOn: { color: ui.text },
  viewer: { alignItems: 'center', gap: 8, minHeight: 280, justifyContent: 'center' },
  caption: { color: ui.textDim, fontSize: 13, fontStyle: 'italic' },
  sentLine: { color: ui.accent, fontSize: 14 },
  empty: {
    color: ui.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  yours: { alignItems: 'center', gap: 12 },
  err: { color: ui.danger, fontSize: 13, textAlign: 'center' },
  send: {
    backgroundColor: ui.chipActiveBg,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 34,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDim: { opacity: 0.5 },
  sendText: { color: ui.text, fontSize: 15, letterSpacing: 0.3 },
  hint: { color: ui.textDim, fontSize: 12 },
  done: { paddingVertical: 6, paddingHorizontal: 20 },
  doneText: { color: ui.accent, fontSize: 15 },
});
