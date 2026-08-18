import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  type GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAuthStore } from '@/state/authStore';
import { type SketchbookDay, useDrawingStore } from '@/state/drawingStore';
import { PixelArt } from './PixelArt';

const BOOK_SHELL = require('../../assets/images/sketchbook/voxel-open-book.png');
const TURN_DURATION = 320;
const REDUCED_TURN_DURATION = 140;

type TurnDirection = 'earlier' | 'later';

interface PageLayout {
  bookWidth: number;
  stageHeight: number;
  pageTop: number;
  pageWidth: number;
  pageHeight: number;
  leftPageLeft: number;
  rightPageLeft: number;
}

function dayTogether(day: string, togetherSince: string | null): number | null {
  if (!togetherSince) return null;
  const start = Date.parse(`${togetherSince.slice(0, 10)}T00:00:00Z`);
  const current = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(current)) return null;
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}

function prettyDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

function BookPage({
  name,
  title,
  grid,
  day,
  relationshipDay,
  width,
  height,
}: {
  name: string;
  title: string;
  grid: string | null;
  day: string;
  relationshipDay: number | null;
  width: number;
  height: number;
}) {
  const artWidth = Math.min(width - 10, (height - 53) / 1.25);
  const artHeight = artWidth * 1.25;
  return (
    <View style={[styles.page, { width, height }]}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.sketchTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.artFrame, { width: artWidth, height: artHeight }]}>
        {grid && (
          <PixelArt
            grid={grid}
            width={artWidth}
            borderRadius={4}
            backgroundColor="#fff2d6"
          />
        )}
      </View>
      <Text style={styles.pageFooter} numberOfLines={1}>
        {prettyDate(day)}
        {relationshipDay ? `  ·  Day ${relationshipDay} together` : ''}
      </Text>
    </View>
  );
}

function SpreadLayer({
  spread,
  layout,
  memberAName,
  memberBName,
  togetherSince,
}: {
  spread: SketchbookDay;
  layout: PageLayout;
  memberAName: string;
  memberBName: string;
  togetherSince: string | null;
}) {
  const relationshipDay = dayTogether(spread.day, togetherSince);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: layout.pageTop, left: layout.leftPageLeft }}>
        <BookPage
          name={memberAName}
          title={spread.memberATitle}
          grid={spread.memberAGrid}
          day={spread.day}
          relationshipDay={relationshipDay}
          width={layout.pageWidth}
          height={layout.pageHeight}
        />
      </View>
      <View style={{ position: 'absolute', top: layout.pageTop, left: layout.rightPageLeft }}>
        <BookPage
          name={memberBName}
          title={spread.memberBTitle}
          grid={spread.memberBGrid}
          day={spread.day}
          relationshipDay={relationshipDay}
          width={layout.pageWidth}
          height={layout.pageHeight}
        />
      </View>
    </View>
  );
}

export function Sketchbook({
  onClose,
  onOpenToday,
}: {
  onClose: () => void;
  onOpenToday: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [pageIndex, setPageIndex] = useState(0);
  const [turning, setTurning] = useState<{
    direction: TurnDirection;
    spread: SketchbookDay;
  } | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const inputLockedRef = useRef(false);
  const swipeStartX = useRef(0);
  const turnProgress = useSharedValue(0);

  const days = useDrawingStore((state) => state.sketchbookDays);
  const pages = useDrawingStore((state) => state.sketchbookPages);
  const loadingDays = useDrawingStore((state) => state.sketchbookLoadingDays);
  const dayErrors = useDrawingStore((state) => state.sketchbookDayErrors);
  const memberAName = useDrawingStore((state) => state.memberAName);
  const memberBName = useDrawingStore((state) => state.memberBName);
  const loading = useDrawingStore((state) => state.sketchbookLoading);
  const error = useDrawingStore((state) => state.sketchbookError);
  const loadSketchbook = useDrawingStore((state) => state.loadSketchbook);
  const loadSketchbookDay = useDrawingStore((state) => state.loadSketchbookDay);
  const togetherSince = useAuthStore((state) => state.couple?.created_at ?? null);

  const bookWidth = Math.max(
    280,
    Math.min(width - 8, 680, Math.max(280, (height - 250) / 0.72)),
  );
  const layout = useMemo<PageLayout>(
    () => ({
      bookWidth,
      stageHeight: bookWidth * 0.72,
      pageTop: bookWidth * 0.105,
      pageWidth: bookWidth * 0.334,
      pageHeight: bookWidth * 0.515,
      leftPageLeft: bookWidth * 0.109,
      rightPageLeft: bookWidth * 0.556,
    }),
    [bookWidth],
  );

  useEffect(() => {
    let active = true;
    void loadSketchbook().then(() => {
      if (active) {
        setPageIndex(Math.max(0, useDrawingStore.getState().sketchbookDays.length - 1));
      }
    });
    return () => {
      active = false;
    };
  }, [loadSketchbook]);

  const activePageIndex = Math.min(pageIndex, Math.max(0, days.length - 1));
  const activeDay = days[activePageIndex]?.day ?? null;
  const spread = useMemo(
    () =>
      activeDay
        ? pages[activeDay] ?? {
            day: activeDay,
            memberAGrid: null,
            memberATitle: '',
            memberBGrid: null,
            memberBTitle: '',
          }
        : null,
    [activeDay, pages],
  );

  useEffect(() => {
    if (!activeDay) return;
    void loadSketchbookDay(activeDay);
    const earlier = days[activePageIndex - 1]?.day;
    const later = days[activePageIndex + 1]?.day;
    if (earlier) void loadSketchbookDay(earlier, true);
    if (later) void loadSketchbookDay(later, true);
  }, [activeDay, activePageIndex, days, loadSketchbookDay]);

  const finishTurn = useCallback(() => {
    inputLockedRef.current = false;
    setInputLocked(false);
    setTurning(null);
    turnProgress.set(0);
  }, [turnProgress]);

  const navigate = useCallback(
    (direction: TurnDirection) => {
      if (inputLockedRef.current || !spread) return;
      const target = direction === 'earlier' ? activePageIndex - 1 : activePageIndex + 1;
      if (target < 0 || target >= days.length) return;

      inputLockedRef.current = true;
      setInputLocked(true);
      setTurning({ direction, spread });
      setPageIndex(target);
      turnProgress.set(0);
      turnProgress.set(withTiming(
        1,
        {
          duration: reducedMotion ? REDUCED_TURN_DURATION : TURN_DURATION,
          easing: Easing.inOut(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(finishTurn)();
        },
      ));
    },
    [activePageIndex, days.length, finishTurn, reducedMotion, spread, turnProgress],
  );

  const beginSwipe = useCallback((event: GestureResponderEvent) => {
    swipeStartX.current = event.nativeEvent.pageX;
  }, []);

  const endSwipe = useCallback(
    (event: GestureResponderEvent) => {
      const deltaX = event.nativeEvent.pageX - swipeStartX.current;
      if (deltaX > 45) navigate('earlier');
      if (deltaX < -45) navigate('later');
    },
    [navigate],
  );

  const turningPageStyle = useAnimatedStyle(() => {
    const direction = turning?.direction ?? 'later';
    const angle = direction === 'later' ? -105 : 105;
    const originShift = direction === 'later' ? -layout.pageWidth / 2 : layout.pageWidth / 2;
    const progress = turnProgress.get();
    return {
      opacity: 1 - progress * 0.16,
      transform: [
        { perspective: 900 },
        { translateX: originShift },
        { rotateY: `${progress * angle}deg` },
        { translateX: -originShift },
      ],
    };
  }, [layout.pageWidth, turning?.direction]);

  const crossfadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - turnProgress.get(),
  }));

  const currentLoading = !!activeDay && loadingDays.includes(activeDay) && !pages[activeDay];
  const currentError = activeDay ? dayErrors[activeDay] : '';

  return (
    <View style={styles.screen}>
      <View style={styles.ambientOrbOne} />
      <View style={styles.ambientOrbTwo} />
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.kicker}>RITUALS</Text>
          <Text style={styles.title}>Sketchbook</Text>
          <Text style={styles.sub}>A dark little place for the days you kept.</Text>
        </View>
        <Pressable
          style={styles.close}
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close sketchbook"
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && days.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#d7aa62" />
            <Text style={styles.loadingText}>Opening your sketchbook…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>The book stayed closed</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void loadSketchbook()}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : spread ? (
          <>
            <View
              style={[styles.bookStage, { width: layout.bookWidth, height: layout.stageHeight }]}
              onStartShouldSetResponder={() => !inputLockedRef.current}
              onMoveShouldSetResponder={() => !inputLockedRef.current}
              onResponderGrant={beginSwipe}
              onResponderRelease={endSwipe}
            >
              <Image
                source={BOOK_SHELL}
                resizeMode="contain"
                style={{
                  position: 'absolute',
                  width: layout.bookWidth,
                  height: layout.bookWidth,
                  top: -layout.bookWidth * 0.14,
                  left: 0,
                }}
              />
              <SpreadLayer
                spread={spread}
                layout={layout}
                memberAName={memberAName}
                memberBName={memberBName}
                togetherSince={togetherSince}
              />

              {turning && reducedMotion && (
                <Animated.View style={[StyleSheet.absoluteFill, crossfadeStyle]} pointerEvents="none">
                  <SpreadLayer
                    spread={turning.spread}
                    layout={layout}
                    memberAName={memberAName}
                    memberBName={memberBName}
                    togetherSince={togetherSince}
                  />
                </Animated.View>
              )}

              {turning && !reducedMotion && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.turningPage,
                    {
                      top: layout.pageTop,
                      left:
                        turning.direction === 'later'
                          ? layout.rightPageLeft
                          : layout.leftPageLeft,
                    },
                    turningPageStyle,
                  ]}
                >
                  <BookPage
                    name={turning.direction === 'later' ? memberBName : memberAName}
                    title={
                      turning.direction === 'later'
                        ? turning.spread.memberBTitle
                        : turning.spread.memberATitle
                    }
                    grid={
                      turning.direction === 'later'
                        ? turning.spread.memberBGrid
                        : turning.spread.memberAGrid
                    }
                    day={turning.spread.day}
                    relationshipDay={dayTogether(turning.spread.day, togetherSince)}
                    width={layout.pageWidth}
                    height={layout.pageHeight}
                  />
                </Animated.View>
              )}

              {currentLoading && (
                <View style={styles.pageLoading} pointerEvents="none">
                  <ActivityIndicator color="#8e5c34" size="small" />
                </View>
              )}
            </View>

            {!!currentError && (
              <View style={styles.dayError}>
                <Text style={styles.dayErrorText}>{currentError}</Text>
                <Pressable onPress={() => activeDay && void loadSketchbookDay(activeDay)}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.pager}>
              <Pressable
                style={[
                  styles.pageButton,
                  (activePageIndex === 0 || inputLocked) && styles.pageButtonDim,
                ]}
                onPress={() => navigate('earlier')}
                disabled={activePageIndex === 0 || inputLocked}
                accessibilityRole="button"
                accessibilityLabel="Earlier sketchbook day"
              >
                <Text style={styles.pageButtonText}>‹ Earlier</Text>
              </Pressable>
              <Text style={styles.pageCount}>
                {activePageIndex + 1} of {days.length}
              </Text>
              <Pressable
                style={[
                  styles.pageButton,
                  (activePageIndex === days.length - 1 || inputLocked) && styles.pageButtonDim,
                ]}
                onPress={() => navigate('later')}
                disabled={activePageIndex === days.length - 1 || inputLocked}
                accessibilityRole="button"
                accessibilityLabel="Later sketchbook day"
              >
                <Text style={styles.pageButtonText}>Later ›</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGlyph}>□</Text>
            <Text style={styles.emptyTitle}>Your first page is waiting</Text>
            <Text style={styles.emptyBody}>Today can become the first day kept here.</Text>
            <Pressable style={styles.primaryButton} onPress={onOpenToday}>
              <Text style={styles.primaryButtonText}>Sketch today</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {spread && (
        <Pressable style={styles.todayButton} onPress={onOpenToday}>
          <Text style={styles.todayButtonText}>Today’s sketch</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#140d12', overflow: 'hidden' },
  ambientOrbOne: {
    position: 'absolute',
    top: -110,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(111, 50, 38, 0.2)',
  },
  ambientOrbTwo: {
    position: 'absolute',
    right: -130,
    bottom: 60,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(61, 35, 49, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headingCopy: { flex: 1, alignItems: 'center', paddingLeft: 42 },
  kicker: { color: '#c57b5c', fontSize: 9, fontWeight: '800', letterSpacing: 2.2 },
  title: {
    color: '#f4dfbf',
    fontFamily: 'serif',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700',
  },
  sub: { color: '#aa8f83', fontSize: 11, marginTop: 1 },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(73, 40, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(205, 150, 103, 0.26)',
  },
  closeText: { color: '#efd7b5', fontSize: 27, lineHeight: 29, fontWeight: '400' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  loading: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#bda292', fontSize: 13 },
  bookStage: { overflow: 'visible' },
  page: { alignItems: 'center', paddingTop: 2, paddingBottom: 1 },
  name: {
    width: '100%',
    height: 18,
    color: '#442a22',
    fontFamily: 'serif',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  sketchTitle: {
    width: '94%',
    height: 14,
    color: '#6f4532',
    fontFamily: 'serif',
    fontSize: 8.5,
    lineHeight: 11,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
  },
  artFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#fff2d6',
  },
  pageFooter: {
    width: '100%',
    height: 18,
    paddingTop: 3,
    color: '#795846',
    fontSize: 6.7,
    lineHeight: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  turningPage: { position: 'absolute', backfaceVisibility: 'hidden' },
  pageLoading: {
    position: 'absolute',
    top: '43%',
    left: '47%',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 239, 207, 0.84)',
  },
  dayError: { alignItems: 'center', gap: 3, marginTop: -4 },
  dayErrorText: { color: '#c9a999', fontSize: 11 },
  retryText: { color: '#df9a70', fontSize: 11, fontWeight: '800' },
  pager: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 9,
  },
  pageButton: {
    minWidth: 86,
    minHeight: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(65, 34, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(197, 123, 92, 0.3)',
    paddingHorizontal: 12,
  },
  pageButtonDim: { opacity: 0.32 },
  pageButtonText: { color: '#df9a70', fontSize: 12, fontWeight: '800' },
  pageCount: { color: '#a8887c', fontSize: 11, fontWeight: '700' },
  emptyState: {
    flex: 1,
    minHeight: 360,
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyGlyph: { color: '#c79551', fontSize: 46, lineHeight: 52 },
  emptyTitle: {
    color: '#f4dfbf',
    fontFamily: 'serif',
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: { color: '#b39889', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  primaryButton: {
    minHeight: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ad5d43',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff1dc', fontSize: 14, fontWeight: '800' },
  todayButton: {
    alignSelf: 'center',
    minHeight: 42,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 43, 43, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(197, 123, 92, 0.3)',
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  todayButtonText: { color: '#e0a07a', fontSize: 13, fontWeight: '800' },
});
