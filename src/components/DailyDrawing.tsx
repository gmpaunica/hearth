import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DRAWING_TITLE_MAX_LENGTH } from '@/state/drawingCodec';
import { EMPTY_GRID, useDrawingStore } from '@/state/drawingStore';
import { useDailyRitualStore } from '@/state/dailyRitualStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useRitualPreferencesStore } from '@/state/ritualPreferencesStore';
import { HearthTheme } from '@/theme/hearth';
import { DrawingCanvas } from './DrawingCanvas';
import { PixelArt } from './PixelArt';
import { PopIn } from './PopIn';
import { PrivateSurfaceShield } from './PrivateSurfaceShield';
import { Sketchbook } from './Sketchbook';
import { PixelSpeechBubble } from './SpatialReactionOverlay';

/** Today's optional shared sketch and its dated archive. */
export function DailyDrawing({
  showTrigger = true,
  reviewMode = false,
  reviewInitialTab = 'theirs',
  reviewPreferencesOpen = false,
  reviewDeleteTarget = null,
}: {
  showTrigger?: boolean;
  reviewMode?: boolean;
  reviewInitialTab?: 'theirs' | 'yours';
  reviewPreferencesOpen?: boolean;
  reviewDeleteTarget?: { id: string; day: string } | null;
}) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'theirs' | 'yours'>(reviewInitialTab);
  const [drawingActive, setDrawingActive] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(reviewPreferencesOpen);
  const headingRef = useRef<Text>(null);

  const partnerGrid = useDrawingStore((state) => state.partnerGrid);
  const partnerTitle = useDrawingStore((state) => state.partnerTitle);
  const partnerSeen = useDrawingStore((state) => state.partnerSeen);
  const mineSaved = useDrawingStore((state) => state.mineSaved);
  const mySlotOpen = useDrawingStore((state) => state.mySlotOpen);
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
  const evaluateReminder = useDailyRitualStore((state) => state.evaluateSketchReminder);
  const sketchReminderEnabled = useRitualPreferencesStore((state) => state.sketchReminderEnabled);
  const hydratePreferences = useRitualPreferencesStore((state) => state.hydrate);
  const setSketchReminderEnabled = useRitualPreferencesStore(
    (state) => state.setSketchReminderEnabled,
  );

  const homeSurface = useMomentsSurfaceStore((state) => state.surface);
  const openDrawing = useMomentsSurfaceStore((state) => state.openDrawing);
  const closeSurface = useMomentsSurfaceStore((state) => state.closeSurface);
  const surface = homeSurface.kind === 'drawing' ? homeSurface.view : 'closed';
  const activeCard = useMomentV2Store((state) => state.snapshot?.active != null);

  const hasNews = Boolean(partnerGrid && !partnerSeen);
  const canSend = myGrid !== EMPTY_GRID && !mineSaved && mySlotOpen;
  const canvasWidth = Math.max(220, Math.min(480, width - 40));
  const canvasHeight = canvasWidth * 1.25;

  useEffect(
    () => useDrawingStore.subscribe((state, previous) => {
      if (state.openRequested && !previous.openRequested) {
        useMomentsSurfaceStore.getState().openDrawing('today');
        state.clearOpenRequest();
      }
      if (state.sketchbookRequested && !previous.sketchbookRequested) {
        useMomentsSurfaceStore.getState().openDrawing('sketchbook');
        state.clearSketchbookRequest();
      }
    }),
    [],
  );

  useEffect(() => {
    if (surface !== 'today' || reviewMode) return;
    void hydratePreferences().then(load).then(() => {
      const fresh = useDrawingStore.getState();
      setTab(fresh.partnerGrid ? 'theirs' : fresh.mineSaved ? 'theirs' : 'yours');
    });
  }, [hydratePreferences, load, reviewMode, surface]);

  useEffect(() => {
    if (homeDate && !reviewMode) void load();
  }, [homeDate, load, reviewMode]);

  useEffect(() => {
    if (surface !== 'today') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSurface();
      return true;
    });
    const focusTimer = setTimeout(() => {
      if (Platform.OS === 'web') return;
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 80);
    return () => {
      back.remove();
      clearTimeout(focusTimer);
    };
  }, [closeSurface, surface]);

  useEffect(() => {
    if (surface === 'today' && tab === 'theirs' && partnerGrid && !partnerSeen) {
      void markSeen();
    }
  }, [markSeen, partnerGrid, partnerSeen, surface, tab]);

  const openToday = () => openDrawing('today');
  const openReminder = () => {
    void dismissReminder();
    openToday();
  };
  const close = () => {
    setPreferencesOpen(false);
    setTitleOpen(false);
    closeSurface();
  };
  const toggleReminder = async (enabled: boolean) => {
    await setSketchReminderEnabled(enabled);
    if (enabled) await evaluateReminder(mineSaved);
    else await dismissReminder();
  };

  return (
    <>
      {showTrigger && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={openToday}
          accessibilityRole="button"
          accessibilityLabel="Today’s sketch"
        >
          <View style={styles.fabPencil} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.fabPencilBody} />
            <View style={styles.fabPencilTip} />
          </View>
          {hasNews && <View style={styles.badge} accessibilityLabel="Unread sketch" />}
        </Pressable>
      )}

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
          <PrivateSurfaceShield surface="drawing" />
          <PopIn style={styles.fullCard}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
              {surface === 'sketchbook' ? (
                <Sketchbook
                  onClose={close}
                  onOpenToday={openToday}
                  reviewMode={reviewMode}
                  reviewDeleteTarget={reviewDeleteTarget}
                />
              ) : (
                <KeyboardAvoidingView
                  style={styles.todayScreen}
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  accessibilityViewIsModal
                  onAccessibilityEscape={close}
                >
                  <View style={styles.header}>
                    <View style={styles.headingCopy}>
                      <Text ref={headingRef} accessible accessibilityRole="header" style={styles.title}>Today’s sketch</Text>
                      <Text style={styles.sub}>Draw something small—or leave today open.</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                      onPress={close}
                      accessibilityRole="button"
                      accessibilityLabel="Close today’s sketch"
                    >
                      <Text style={styles.closeText}>×</Text>
                    </Pressable>
                  </View>

                  {preferencesOpen ? (
                    <ScrollView
                      style={styles.body}
                      contentContainerStyle={styles.preferencesContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text accessibilityRole="header" style={styles.preferencesTitle}>
                        Your gentle prompt
                      </Text>
                      <Text style={styles.preferencesBody}>
                        Sketches are always optional. This setting only controls the private evening prompt on this phone.
                      </Text>
                      <View style={styles.preferenceRow}>
                        <View style={styles.preferenceCopy}>
                          <Text style={styles.preferenceLabel}>Tiny sketch reminder</Text>
                          <Text style={styles.preferenceHint}>Your partner cannot see this choice.</Text>
                        </View>
                        <Switch
                          value={sketchReminderEnabled}
                          onValueChange={(enabled) => void toggleReminder(enabled)}
                          trackColor={{ false: HearthTheme.color.twilightSoft, true: HearthTheme.color.sageSoft }}
                          thumbColor={sketchReminderEnabled ? HearthTheme.color.sage : HearthTheme.color.inkFaint}
                          accessibilityLabel="Tiny sketch evening reminder"
                        />
                      </View>
                      <View style={styles.preferenceNotice}>
                        <Text style={styles.preferenceNoticeText}>
                          Skipping a day never creates a streak, score, warning, or message about either person.
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                        onPress={() => setPreferencesOpen(false)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.secondaryActionText}>Done</Text>
                      </Pressable>
                    </ScrollView>
                  ) : (
                    <>
                      <Pressable
                        style={({ pressed }) => [styles.preferenceTrigger, pressed && styles.pressed]}
                        onPress={() => setPreferencesOpen(true)}
                        accessibilityRole="button"
                        accessibilityHint="Choose whether this phone gives you a private evening prompt"
                      >
                        <Text style={styles.preferenceTriggerText}>
                          Evening prompt: {sketchReminderEnabled ? 'On' : 'Off'}
                        </Text>
                      </Pressable>

                      <View style={styles.tabs}>
                        <Pressable
                          style={[styles.tab, tab === 'theirs' && styles.tabOn]}
                          onPress={() => setTab('theirs')}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: tab === 'theirs' }}
                        >
                          <Text style={[styles.tabText, tab === 'theirs' && styles.tabTextOn]}>For you</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.tab, tab === 'yours' && styles.tabOn]}
                          onPress={() => setTab('yours')}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: tab === 'yours' }}
                        >
                          <Text style={[styles.tabText, tab === 'yours' && styles.tabTextOn]}>Yours</Text>
                        </Pressable>
                      </View>

                      <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={!drawingActive}
                        keyboardShouldPersistTaps="handled"
                      >
                        {tab === 'theirs' ? (
                          <View style={[styles.viewer, { minHeight: canvasHeight }]}>
                            {loading ? (
                              <View style={styles.loadingState}>
                                <ActivityIndicator color={HearthTheme.color.clay} />
                                <Text style={styles.caption}>Opening today’s page…</Text>
                              </View>
                            ) : error ? (
                              <View style={styles.errorState}>
                                <Text accessibilityRole="alert" style={styles.err}>{error}</Text>
                                <Pressable style={styles.secondaryAction} onPress={() => void load()}>
                                  <Text style={styles.secondaryActionText}>Try again</Text>
                                </Pressable>
                              </View>
                            ) : partnerGrid ? (
                              <>
                                {!!partnerTitle && <Text style={styles.drawingTitle}>{partnerTitle}</Text>}
                                <PixelArt grid={partnerGrid} width={canvasWidth} />
                                <Text style={styles.caption}>A little page they left for you.</Text>
                              </>
                            ) : (
                              <View style={styles.emptyWrap}>
                                <View style={[styles.emptyCanvas, { width: canvasWidth, height: canvasHeight }]}>
                                  <View style={styles.emptySpark} accessibilityElementsHidden>
                                    <View style={styles.sparkCenter} />
                                    <View style={[styles.sparkDot, styles.sparkTop]} />
                                    <View style={[styles.sparkDot, styles.sparkRight]} />
                                    <View style={[styles.sparkDot, styles.sparkBottom]} />
                                    <View style={[styles.sparkDot, styles.sparkLeft]} />
                                  </View>
                                  <Text style={styles.empty}>Their page is quiet for now.</Text>
                                  <Text style={styles.emptyHint}>Nothing is waiting on either of you.</Text>
                                </View>
                                {mySlotOpen && !mineSaved && (
                                  <Pressable style={styles.primaryAction} onPress={() => setTab('yours')}>
                                    <Text style={styles.primaryActionText}>Draw yours</Text>
                                  </Pressable>
                                )}
                              </View>
                            )}
                          </View>
                        ) : mineSaved ? (
                          <View style={[styles.viewer, { minHeight: canvasHeight }]}>
                            {!!myTitle && <Text style={styles.drawingTitle}>{myTitle}</Text>}
                            <PixelArt grid={myGrid} width={canvasWidth} />
                            <Text style={styles.sentLine}>Saved in your shared sketchbook.</Text>
                          </View>
                        ) : !mySlotOpen ? (
                          <View style={styles.closedState}>
                            <Text accessibilityRole="header" style={styles.closedTitle}>Today’s page is closed</Text>
                            <Text style={styles.closedBody}>
                              You removed your sketch. It stays gone for both of you, and a fresh page opens tomorrow.
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.yours, { width: canvasWidth }]}>
                            <DrawingCanvas width={canvasWidth} onDrawingActiveChange={setDrawingActive} />
                            <Pressable
                              style={styles.titleToggle}
                              onPress={() => setTitleOpen((open) => !open)}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: titleOpen }}
                            >
                              <Text style={styles.titleToggleText}>
                                {titleOpen ? 'Hide title' : 'Add a title (optional)'}
                              </Text>
                            </Pressable>
                            {titleOpen && (
                              <View style={styles.titleField}>
                                <Text style={styles.titleLabel}>Sketch title</Text>
                                <TextInput
                                  style={styles.titleInput}
                                  value={myTitle}
                                  onChangeText={setMyTitle}
                                  placeholder="A name for this page"
                                  placeholderTextColor={HearthTheme.color.inkFaint}
                                  maxLength={DRAWING_TITLE_MAX_LENGTH}
                                  autoCapitalize="sentences"
                                  returnKeyType="done"
                                  accessibilityLabel="Optional sketch title"
                                />
                              </View>
                            )}
                            {!!error && <Text accessibilityRole="alert" style={styles.err}>{error}</Text>}
                            <Pressable
                              style={[styles.primaryAction, !canSend && styles.actionDim]}
                              onPress={() => void save()}
                              disabled={saving || !canSend}
                              accessibilityRole="button"
                              accessibilityLabel="Send sketch"
                            >
                              {saving ? (
                                <ActivityIndicator color={HearthTheme.color.onAccent} />
                              ) : (
                                <Text style={styles.primaryActionText}>Send sketch</Text>
                              )}
                            </Pressable>
                            <Text style={styles.hint}>
                              Sending keeps this page for both of you. You can remove your copy later from the sketchbook.
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </>
                  )}
                </KeyboardAvoidingView>
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
    position: 'absolute', top: 22, left: 18, width: 48, height: 48,
    borderRadius: HearthTheme.radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong, zIndex: 10, elevation: 5,
  },
  fabPencil: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-42deg' }] },
  fabPencilBody: { width: 7, height: 18, borderRadius: 3, backgroundColor: HearthTheme.color.clayPressed },
  fabPencilTip: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: HearthTheme.color.inkMuted },
  badge: {
    position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5,
    backgroundColor: HearthTheme.color.coral, borderWidth: 1,
    borderColor: HearthTheme.color.parchmentRaised,
  },
  reminderBubble: { left: 72, top: 78, width: 188 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: HearthTheme.color.scrim, zIndex: 100, elevation: 30 },
  fullCard: { flex: 1, backgroundColor: HearthTheme.color.parchment },
  safeArea: { flex: 1, backgroundColor: HearthTheme.color.parchment },
  todayScreen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: HearthTheme.space.lg,
    paddingTop: HearthTheme.space.md, paddingBottom: HearthTheme.space.sm,
  },
  headingCopy: { flex: 1, paddingRight: HearthTheme.space.md },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 30, lineHeight: 35 },
  sub: {
    marginTop: 2, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body,
    fontSize: 14, lineHeight: 20,
  },
  close: {
    width: HearthTheme.touch.minimum, height: HearthTheme.touch.minimum,
    borderRadius: HearthTheme.radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
  },
  closeText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.body, fontSize: 28, lineHeight: 30 },
  preferenceTrigger: {
    minHeight: HearthTheme.touch.minimum, alignSelf: 'flex-start', justifyContent: 'center',
    marginLeft: HearthTheme.space.lg, marginBottom: HearthTheme.space.sm,
    paddingHorizontal: HearthTheme.space.md, borderRadius: HearthTheme.radius.md,
  },
  preferenceTriggerText: {
    color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption,
  },
  preferencesContent: {
    flexGrow: 1, paddingHorizontal: HearthTheme.space.xl, paddingTop: HearthTheme.space.lg,
    paddingBottom: HearthTheme.space.xxl,
  },
  preferencesTitle: {
    color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display,
    fontSize: HearthTheme.type.title, lineHeight: HearthTheme.type.titleLine,
  },
  preferencesBody: {
    marginTop: HearthTheme.space.sm, color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.bodySize,
    lineHeight: HearthTheme.type.bodyLine,
  },
  preferenceRow: {
    minHeight: 76, marginTop: HearthTheme.space.xl, flexDirection: 'row', alignItems: 'center',
    gap: HearthTheme.space.lg, padding: HearthTheme.space.lg,
    borderRadius: HearthTheme.radius.lg, backgroundColor: HearthTheme.color.parchmentRaised,
    borderWidth: 1, borderColor: HearthTheme.color.lineStrong,
  },
  preferenceCopy: { flex: 1 },
  preferenceLabel: {
    color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.label, lineHeight: 20,
  },
  preferenceHint: {
    marginTop: 2, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine,
  },
  preferenceNotice: {
    marginTop: HearthTheme.space.lg, padding: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.sageSoft,
  },
  preferenceNoticeText: {
    color: HearthTheme.color.ink, fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine,
  },
  tabs: {
    alignSelf: 'center', flexDirection: 'row', gap: HearthTheme.space.xs,
    backgroundColor: HearthTheme.color.parchmentWarm, borderRadius: HearthTheme.radius.lg,
    padding: HearthTheme.space.xs, borderWidth: 1, borderColor: HearthTheme.color.line,
    marginBottom: HearthTheme.space.sm,
  },
  tab: {
    minHeight: HearthTheme.touch.minimum, minWidth: 116, paddingHorizontal: HearthTheme.space.lg,
    borderRadius: HearthTheme.radius.md, alignItems: 'center', justifyContent: 'center',
  },
  tabOn: { backgroundColor: HearthTheme.color.clayPressed },
  tabText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
  tabTextOn: { color: HearthTheme.color.onAccent },
  body: { flex: 1 },
  bodyContent: {
    flexGrow: 1, alignItems: 'center', paddingHorizontal: HearthTheme.space.lg,
    paddingTop: HearthTheme.space.sm, paddingBottom: HearthTheme.space.xxl,
  },
  viewer: { alignItems: 'center', justifyContent: 'center', gap: HearthTheme.space.md },
  loadingState: { alignItems: 'center', gap: HearthTheme.space.md },
  errorState: { maxWidth: 320, alignItems: 'center', gap: HearthTheme.space.md },
  drawingTitle: {
    maxWidth: 340, color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display,
    fontSize: 21, lineHeight: 26, textAlign: 'center',
  },
  caption: {
    color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine,
  },
  sentLine: {
    color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine,
  },
  emptyWrap: { alignItems: 'center', gap: HearthTheme.space.lg },
  emptyCanvas: {
    alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.lg,
    backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong, paddingHorizontal: HearthTheme.space.xl,
  },
  emptySpark: { width: 38, height: 38, marginBottom: HearthTheme.space.md },
  sparkCenter: { position: 'absolute', left: 15, top: 15, width: 8, height: 8, backgroundColor: HearthTheme.color.gold },
  sparkDot: { position: 'absolute', width: 5, height: 5, backgroundColor: HearthTheme.color.coral },
  sparkTop: { left: 17, top: 2 },
  sparkRight: { right: 2, top: 17 },
  sparkBottom: { left: 17, bottom: 2 },
  sparkLeft: { left: 2, top: 17 },
  empty: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 21, lineHeight: 26, textAlign: 'center' },
  emptyHint: {
    marginTop: HearthTheme.space.xs, color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body, fontSize: 14, lineHeight: 20, textAlign: 'center',
  },
  yours: { alignItems: 'stretch', gap: HearthTheme.space.md },
  titleToggle: {
    minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center',
    borderRadius: HearthTheme.radius.md,
  },
  titleToggleText: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  titleField: { gap: 6 },
  titleLabel: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
  titleInput: {
    minHeight: 54, borderRadius: HearthTheme.radius.md, borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong, backgroundColor: HearthTheme.color.parchmentRaised,
    color: HearthTheme.color.ink, fontFamily: HearthTheme.type.body,
    fontSize: HearthTheme.type.bodySize, paddingHorizontal: HearthTheme.space.lg,
  },
  err: {
    color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine, textAlign: 'center',
  },
  primaryAction: {
    minHeight: HearthTheme.touch.minimum, minWidth: 190, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: HearthTheme.space.xl, borderRadius: HearthTheme.radius.md,
    borderWidth: 1, borderColor: HearthTheme.color.ink,
    backgroundColor: HearthTheme.color.clayPressed,
  },
  primaryActionText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label, lineHeight: 20 },
  secondaryAction: {
    minHeight: HearthTheme.touch.minimum, minWidth: 148, alignItems: 'center', justifyContent: 'center',
    marginTop: HearthTheme.space.xl, paddingHorizontal: HearthTheme.space.lg,
    borderRadius: HearthTheme.radius.md, borderWidth: 1, borderColor: HearthTheme.color.sage,
    backgroundColor: HearthTheme.color.sageSoft,
  },
  secondaryActionText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
  actionDim: { opacity: 0.46 },
  hint: {
    maxWidth: 340, alignSelf: 'center', color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine, textAlign: 'center',
  },
  closedState: {
    maxWidth: 330, flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: HearthTheme.space.xl,
  },
  closedTitle: {
    color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display,
    fontSize: HearthTheme.type.title, lineHeight: HearthTheme.type.titleLine, textAlign: 'center',
  },
  closedBody: {
    marginTop: HearthTheme.space.sm, color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.bodySize,
    lineHeight: HearthTheme.type.bodyLine, textAlign: 'center',
  },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
});
