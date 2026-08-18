import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DRAWING_TITLE_MAX_LENGTH } from '@/state/drawingCodec';
import { EMPTY_GRID, useDrawingStore } from '@/state/drawingStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useDailyRitualStore } from '@/state/dailyRitualStore';
import { editorial } from '@/theme/hearth';
import { DrawingCanvas } from './DrawingCanvas';
import { PixelArt } from './PixelArt';
import { PopIn } from './PopIn';
import { Sketchbook } from './Sketchbook';
import { PixelSpeechBubble } from './SpatialReactionOverlay';

type Surface = 'closed' | 'today' | 'sketchbook';

/**
 * Today's shared sketch and the full dated sketchbook. The current sketch can
 * be opened from the pencil or wall frame; the archive opens from Rituals.
 */
export function DailyDrawing() {
  const { width } = useWindowDimensions();
  const [surface, setSurface] = useState<Surface>('closed');
  const [tab, setTab] = useState<'theirs' | 'yours'>('theirs');
  const [drawingActive, setDrawingActive] = useState(false);

  const partnerGrid = useDrawingStore((state) => state.partnerGrid);
  const partnerTitle = useDrawingStore((state) => state.partnerTitle);
  const partnerSeen = useDrawingStore((state) => state.partnerSeen);
  const mineSaved = useDrawingStore((state) => state.mineSaved);
  const myGrid = useDrawingStore((state) => state.myGrid);
  const myTitle = useDrawingStore((state) => state.myTitle);
  const saving = useDrawingStore((state) => state.saving);
  const loading = useDrawingStore((state) => state.loading);
  const error = useDrawingStore((state) => state.error);
  const load = useDrawingStore((state) => state.load);
  const save = useDrawingStore((state) => state.save);
  const setMyTitle = useDrawingStore((state) => state.setMyTitle);
  const markSeen = useDrawingStore((state) => state.markSeen);
  const reminderVisible = useDailyRitualStore((state) => state.reminderVisible);
  const homeDate = useDailyRitualStore((state) => state.snapshot?.home_date ?? null);
  const dismissReminder = useDailyRitualStore((state) => state.dismissSketchReminder);

  const activeCard = useMomentV2Store((state) => state.snapshot?.active != null);
  const hasNews = !!partnerGrid && !partnerSeen;
  const canSend = myGrid !== EMPTY_GRID && !mineSaved;
  const canvasWidth = Math.max(220, Math.min(520, width - 12));
  const canvasHeight = canvasWidth * 1.25;

  useEffect(
    () =>
      useDrawingStore.subscribe((state, previous) => {
        if (state.openRequested && !previous.openRequested) {
          setSurface('today');
          state.clearOpenRequest();
        }
        if (state.sketchbookRequested && !previous.sketchbookRequested) {
          setSurface('sketchbook');
          state.clearSketchbookRequest();
        }
      }),
    [],
  );

  useEffect(() => {
    if (surface === 'today') {
      void load().then(() => {
        const fresh = useDrawingStore.getState();
        setTab(fresh.partnerGrid ? 'theirs' : fresh.mineSaved ? 'theirs' : 'yours');
      });
    }
  }, [load, surface]);

  // The server can advance the shared home date while the app stays open.
  // Reload immediately so yesterday's saved flag/grid cannot leak into today.
  useEffect(() => {
    if (homeDate) void load();
  }, [homeDate, load]);

  // A sketch counts as checked only while the partner's actual canvas is the
  // visible tab. The existing receipt keeps the banner dismissed after reopen.
  useEffect(() => {
    if (surface === 'today' && tab === 'theirs' && partnerGrid && !partnerSeen) {
      void markSeen();
    }
  }, [markSeen, partnerGrid, partnerSeen, surface, tab]);

  const openToday = () => setSurface('today');
  const openReminder = () => {
    void dismissReminder();
    openToday();
  };
  const close = () => setSurface('closed');

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={openToday}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Today’s sketch"
      >
        <Text style={styles.fabIcon}>▦</Text>
        {!mineSaved && (
          <View style={styles.pencilSatellite} accessibilityLabel="Your tiny sketch is still open">
            <Text style={styles.pencilSatelliteText}>✎</Text>
          </View>
        )}
        {hasNews && <View style={styles.badge} accessibilityLabel="Unread sketch" />}
      </Pressable>

      {reminderVisible && surface === 'closed' && !activeCard && (
        <PixelSpeechBubble
          copy="Tiny sketch tonight?"
          onPress={openReminder}
          tail="left"
          style={styles.reminderBubble}
        />
      )}

      {surface !== 'closed' && (
        <View style={styles.overlay}>
          <PopIn style={styles.fullCard}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
              {surface === 'sketchbook' ? (
                <Sketchbook onClose={close} onOpenToday={openToday} />
              ) : (
                <View style={styles.todayScreen}>
                  <View style={styles.header}>
                    <View style={styles.headingCopy}>
                      <Text style={styles.kicker}>DAILY RITUAL</Text>
                      <Text style={styles.title}>Today’s sketch</Text>
                      <Text style={styles.sub}>A little something for each other.</Text>
                    </View>
                    <Pressable
                      style={styles.close}
                      onPress={close}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Close today’s sketch"
                    >
                      <Text style={styles.closeText}>×</Text>
                    </Pressable>
                  </View>

                  <View style={styles.tabs}>
                    <Pressable
                      style={[styles.tab, tab === 'theirs' && styles.tabOn]}
                      onPress={() => setTab('theirs')}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === 'theirs' }}
                    >
                      <Text style={[styles.tabText, tab === 'theirs' && styles.tabTextOn]}>
                        Their sketch
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, tab === 'yours' && styles.tabOn]}
                      onPress={() => setTab('yours')}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === 'yours' }}
                    >
                      <Text style={[styles.tabText, tab === 'yours' && styles.tabTextOn]}>
                        Your sketch
                      </Text>
                    </Pressable>
                  </View>

                  <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!drawingActive}
                  >
                    {tab === 'theirs' ? (
                      <View style={[styles.viewer, { minHeight: canvasHeight }]}>
                        {loading ? (
                          <ActivityIndicator color={editorial.clay} />
                        ) : partnerGrid ? (
                          <>
                            {!!partnerTitle && (
                              <Text style={styles.drawingTitle} numberOfLines={2}>
                                {partnerTitle}
                              </Text>
                            )}
                            <PixelArt grid={partnerGrid} width={canvasWidth} />
                            <Text style={styles.caption}>They left this for you today.</Text>
                          </>
                        ) : (
                          <View
                            style={[
                              styles.emptyCanvas,
                              { width: canvasWidth, height: canvasHeight },
                            ]}
                          >
                            <Text style={styles.emptyMark}>✦</Text>
                            <Text style={styles.empty}>
                              Their page is quiet for now. You can still leave yours.
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : mineSaved ? (
                      <View style={[styles.viewer, { minHeight: canvasHeight }]}>
                        {!!myTitle && (
                          <Text style={styles.drawingTitle} numberOfLines={2}>
                            {myTitle}
                          </Text>
                        )}
                        <PixelArt grid={myGrid} width={canvasWidth} />
                        <Text style={styles.sentLine}>Sent — they can see it now.</Text>
                      </View>
                    ) : (
                      <View style={styles.yours}>
                        <View style={[styles.titleField, { width: canvasWidth }]}>
                          <Text style={styles.titleLabel}>NAME THIS SKETCH</Text>
                          <TextInput
                            style={styles.titleInput}
                            value={myTitle}
                            onChangeText={setMyTitle}
                            placeholder="Give today's sketch a name"
                            placeholderTextColor={editorial.inkFaint}
                            maxLength={DRAWING_TITLE_MAX_LENGTH}
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            accessibilityLabel="Drawing title"
                          />
                        </View>
                        <DrawingCanvas
                          width={canvasWidth}
                          onDrawingActiveChange={setDrawingActive}
                        />
                        {error && <Text style={styles.err}>{error}</Text>}
                        <Pressable
                          style={[styles.send, !canSend && styles.sendDim]}
                          onPress={() => void save()}
                          disabled={saving || !canSend}
                          accessibilityRole="button"
                          accessibilityLabel="Send sketch"
                        >
                          {saving ? (
                            <ActivityIndicator color={editorial.onAccent} />
                          ) : (
                            <Text style={styles.sendText}>Send it</Text>
                          )}
                        </Pressable>
                        <Text style={styles.hint}>
                          One sketch each day. Once sent, it can’t be changed today.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </SafeAreaView>
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
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: editorial.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 10,
  },
  fabIcon: { color: editorial.clay, fontSize: 22, lineHeight: 24, fontWeight: '700' },
  pencilSatellite: {
    position: 'absolute',
    right: -6,
    bottom: -5,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: editorial.clay,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pencilSatelliteText: { color: '#FFFFFF', fontSize: 12, lineHeight: 13, fontWeight: '900' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: editorial.clay,
    borderWidth: 1,
    borderColor: editorial.paperStrong,
  },
  reminderBubble: { left: 68, top: 74, width: 188 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: editorial.scrim,
    zIndex: 100,
    elevation: 30,
  },
  fullCard: { flex: 1, backgroundColor: editorial.paperStrong },
  safeArea: { flex: 1, backgroundColor: editorial.paperStrong },
  todayScreen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headingCopy: { flex: 1, alignItems: 'center', paddingLeft: 42 },
  kicker: {
    color: editorial.clay,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.1,
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
  },
  sub: { color: editorial.inkSoft, fontSize: 11, marginTop: 1 },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.line,
  },
  closeText: { color: editorial.ink, fontSize: 27, lineHeight: 29, fontWeight: '400' },
  tabs: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: editorial.paperTint,
    borderRadius: 18,
    padding: 4,
    borderColor: editorial.line,
    borderWidth: 1,
    marginBottom: 7,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 14 },
  tabOn: { backgroundColor: editorial.clay },
  tabText: { color: editorial.inkSoft, fontSize: 13, fontWeight: '700' },
  tabTextOn: { color: editorial.onAccent },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 6, paddingBottom: 18 },
  viewer: { alignItems: 'center', justifyContent: 'center', gap: 9 },
  drawingTitle: {
    maxWidth: 340,
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  caption: { color: editorial.inkSoft, fontSize: 12, fontStyle: 'italic' },
  sentLine: { color: editorial.clay, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#fff6e8',
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    paddingHorizontal: 34,
  },
  emptyMark: { color: editorial.gold, fontSize: 23, marginBottom: 8 },
  empty: { color: editorial.inkSoft, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  yours: { alignItems: 'center', gap: 10 },
  titleField: { gap: 5, paddingHorizontal: 4 },
  titleLabel: {
    color: editorial.clay,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
    paddingLeft: 5,
  },
  titleInput: {
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    backgroundColor: editorial.paperTint,
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 16,
    paddingHorizontal: 13,
  },
  err: { color: editorial.danger, fontSize: 13, textAlign: 'center' },
  send: {
    backgroundColor: editorial.clay,
    borderColor: editorial.clayDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDim: { opacity: 0.5 },
  sendText: {
    color: editorial.onAccent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  hint: {
    maxWidth: 330,
    color: editorial.inkSoft,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
