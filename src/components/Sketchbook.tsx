import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  findNodeHandle,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuthStore } from '@/state/authStore';
import { type SketchbookDay, useDrawingStore } from '@/state/drawingStore';
import { HearthTheme } from '@/theme/hearth';
import { PixelArt } from './PixelArt';

const BOOK_SHELL = require('../../assets/images/sketchbook/voxel-open-book.png');

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
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function shortDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function BookPage({
  name,
  title,
  grid,
  width,
  height,
}: {
  name: string;
  title: string;
  grid: string | null;
  width: number;
  height: number;
}) {
  const artWidth = Math.min(width - 10, (height - 49) / 1.25);
  const artHeight = artWidth * 1.25;
  return (
    <View
      style={[styles.page, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text maxFontSizeMultiplier={1.15} style={styles.name} numberOfLines={1}>{name}</Text>
      <Text maxFontSizeMultiplier={1.15} style={styles.sketchTitle} numberOfLines={1}>
        {title || 'A quiet page'}
      </Text>
      <View style={[styles.artFrame, { width: artWidth, height: artHeight }]}>
        {grid ? (
          <PixelArt grid={grid} width={artWidth} borderRadius={4} backgroundColor="#FFF2D6" />
        ) : (
          <View style={styles.blankPage}><View style={styles.blankPageMark} /></View>
        )}
      </View>
    </View>
  );
}

function Spread({
  spread,
  layout,
  memberAName,
  memberBName,
}: {
  spread: SketchbookDay;
  layout: PageLayout;
  memberAName: string;
  memberBName: string;
}) {
  return (
    <View style={[styles.bookStage, { width: layout.bookWidth, height: layout.stageHeight }]}>
      <Image
        source={BOOK_SHELL}
        resizeMode="contain"
        accessible={false}
        style={[
          styles.bookImage,
          { width: layout.bookWidth, height: layout.bookWidth, top: -layout.bookWidth * 0.14 },
        ]}
      />
      <View style={{ position: 'absolute', top: layout.pageTop, left: layout.leftPageLeft }}>
        <BookPage name={memberAName} title={spread.memberATitle} grid={spread.memberAGrid} width={layout.pageWidth} height={layout.pageHeight} />
      </View>
      <View style={{ position: 'absolute', top: layout.pageTop, left: layout.rightPageLeft }}>
        <BookPage name={memberBName} title={spread.memberBTitle} grid={spread.memberBGrid} width={layout.pageWidth} height={layout.pageHeight} />
      </View>
    </View>
  );
}

export function Sketchbook({
  onClose,
  onOpenToday,
  reviewMode = false,
  reviewDeleteTarget = null,
}: {
  onClose: () => void;
  onOpenToday: () => void;
  reviewMode?: boolean;
  reviewDeleteTarget?: { id: string; day: string } | null;
}) {
  const headingRef = useRef<Text>(null);
  const { width, height } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; day: string } | null>(reviewDeleteTarget);

  const days = useDrawingStore((state) => state.sketchbookDays);
  const pages = useDrawingStore((state) => state.sketchbookPages);
  const loadingDays = useDrawingStore((state) => state.sketchbookLoadingDays);
  const dayErrors = useDrawingStore((state) => state.sketchbookDayErrors);
  const memberAName = useDrawingStore((state) => state.memberAName);
  const memberBName = useDrawingStore((state) => state.memberBName);
  const loading = useDrawingStore((state) => state.sketchbookLoading);
  const error = useDrawingStore((state) => state.sketchbookError);
  const deletingSketchId = useDrawingStore((state) => state.deletingSketchId);
  const deleteError = useDrawingStore((state) => state.deleteError);
  const loadSketchbook = useDrawingStore((state) => state.loadSketchbook);
  const loadSketchbookDay = useDrawingStore((state) => state.loadSketchbookDay);
  const deleteSketch = useDrawingStore((state) => state.deleteSketch);
  const userId = useAuthStore((state) => state.userId);
  const memberA = useAuthStore((state) => state.couple?.member_a ?? null);
  const togetherSince = useAuthStore((state) => state.couple?.created_at ?? null);

  const bookWidth = Math.max(280, Math.min(width - 16, 620, Math.max(280, (height - 330) / 0.72)));
  const layout = useMemo<PageLayout>(() => ({
    bookWidth,
    stageHeight: bookWidth * 0.72,
    pageTop: bookWidth * 0.105,
    pageWidth: bookWidth * 0.334,
    pageHeight: bookWidth * 0.515,
    leftPageLeft: bookWidth * 0.109,
    rightPageLeft: bookWidth * 0.556,
  }), [bookWidth]);

  useEffect(() => {
    if (reviewMode) return;
    let active = true;
    void loadSketchbook().then(() => {
      if (active) setPageIndex(Math.max(0, useDrawingStore.getState().sketchbookDays.length - 1));
    });
    return () => { active = false; };
  }, [loadSketchbook, reviewMode]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
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
  }, [onClose]);

  const activePageIndex = Math.min(pageIndex, Math.max(0, days.length - 1));
  const activeDay = days[activePageIndex]?.day ?? null;
  const spread = useMemo(() => activeDay
    ? pages[activeDay] ?? {
      day: activeDay,
      memberAId: null,
      memberAGrid: null,
      memberATitle: '',
      memberBId: null,
      memberBGrid: null,
      memberBTitle: '',
    }
    : null, [activeDay, pages]);

  useEffect(() => {
    if (!activeDay || reviewMode) return;
    void loadSketchbookDay(activeDay);
    const earlier = days[activePageIndex - 1]?.day;
    const later = days[activePageIndex + 1]?.day;
    if (earlier) void loadSketchbookDay(earlier, true);
    if (later) void loadSketchbookDay(later, true);
  }, [activeDay, activePageIndex, days, loadSketchbookDay, reviewMode]);

  const currentLoading = Boolean(activeDay && loadingDays.includes(activeDay) && !pages[activeDay]);
  const currentError = activeDay ? dayErrors[activeDay] : '';
  const relationshipDay = activeDay ? dayTogether(activeDay, togetherSince) : null;
  const mySketchId = spread ? userId === memberA ? spread.memberAId : spread.memberBId : null;
  const pageSummary = spread
    ? `${memberAName}: ${spread.memberAGrid ? spread.memberATitle || 'sketch saved' : 'page left open'}. ${memberBName}: ${spread.memberBGrid ? spread.memberBTitle || 'sketch saved' : 'page left open'}.`
    : '';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const removed = await deleteSketch(deleteTarget.id, deleteTarget.day);
    if (removed) setDeleteTarget(null);
  };

  return (
    <View style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text ref={headingRef} accessible accessibilityRole="header" style={styles.title}>Sketchbook</Text>
          <Text style={styles.sub}>The little pages you chose to keep.</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.close, pressed && styles.pressed]} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && days.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={HearthTheme.color.clay} />
            <Text style={styles.stateBody}>Opening your sketchbook…</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text accessibilityRole="header" style={styles.stateTitle}>The book stayed closed</Text>
            <Text accessibilityRole="alert" style={styles.stateBody}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void loadSketchbook()}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : spread && activeDay ? (
          <>
            <Text style={styles.activeDate}>{prettyDate(activeDay)}</Text>
            {!!relationshipDay && <Text style={styles.relationshipDay}>Day {relationshipDay} together</Text>}

            <ScrollView style={styles.dateRailViewport} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRail} accessibilityLabel="Sketchbook dates">
              {days.map((entry, index) => (
                <Pressable
                  key={entry.day}
                  style={[styles.dateChip, index === activePageIndex && styles.dateChipOn]}
                  onPress={() => { setDeleteTarget(null); setPageIndex(index); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: index === activePageIndex }}
                  accessibilityLabel={`Open sketches from ${prettyDate(entry.day)}`}
                >
                  <Text style={[styles.dateChipText, index === activePageIndex && styles.dateChipTextOn]}>{shortDate(entry.day)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View accessible accessibilityLabel={`${prettyDate(activeDay)}. ${pageSummary}`}>
              <Spread spread={spread} layout={layout} memberAName={memberAName} memberBName={memberBName} />
            </View>

            {currentLoading && <View style={styles.inlineState}><ActivityIndicator color={HearthTheme.color.clay} /><Text style={styles.stateBody}>Opening this page…</Text></View>}
            {!!currentError && (
              <View style={styles.inlineState}>
                <Text accessibilityRole="alert" style={styles.errorText}>{currentError}</Text>
                <Pressable style={styles.quietButton} onPress={() => void loadSketchbookDay(activeDay)}>
                  <Text style={styles.quietButtonText}>Try again</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.pager}>
              <Pressable
                style={[styles.pageButton, activePageIndex === 0 && styles.buttonDim]}
                onPress={() => { setDeleteTarget(null); setPageIndex((index) => Math.max(0, index - 1)); }}
                disabled={activePageIndex === 0}
                accessibilityRole="button"
                accessibilityLabel="Earlier sketchbook day"
              >
                <Text style={styles.pageButtonText}>Earlier</Text>
              </Pressable>
              <Text style={styles.pageCount}>{activePageIndex + 1} of {days.length}</Text>
              <Pressable
                style={[styles.pageButton, activePageIndex === days.length - 1 && styles.buttonDim]}
                onPress={() => { setDeleteTarget(null); setPageIndex((index) => Math.min(days.length - 1, index + 1)); }}
                disabled={activePageIndex === days.length - 1}
                accessibilityRole="button"
                accessibilityLabel="Later sketchbook day"
              >
                <Text style={styles.pageButtonText}>Later</Text>
              </Pressable>
            </View>

            {deleteTarget ? (
              <View style={styles.deleteConfirm} accessibilityLiveRegion="polite">
                <Text style={styles.deleteTitle}>Remove your sketch from {prettyDate(deleteTarget.day)}?</Text>
                <Text style={styles.deleteBody}>It disappears for both of you and cannot be added again for that day.</Text>
                {!!deleteError && <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text>}
                <View style={styles.deleteActions}>
                  <Pressable style={styles.keepButton} onPress={() => setDeleteTarget(null)} disabled={Boolean(deletingSketchId)}>
                    <Text style={styles.keepButtonText}>Keep sketch</Text>
                  </Pressable>
                  <Pressable style={styles.deleteButton} onPress={() => void confirmDelete()} disabled={Boolean(deletingSketchId)}>
                    {deletingSketchId ? <ActivityIndicator color={HearthTheme.color.danger} /> : <Text style={styles.deleteButtonText}>Remove forever</Text>}
                  </Pressable>
                </View>
              </View>
            ) : mySketchId ? (
              <Pressable
                style={styles.removeTrigger}
                onPress={() => setDeleteTarget({ id: mySketchId, day: activeDay })}
                accessibilityRole="button"
                accessibilityLabel={`Remove your sketch from ${prettyDate(activeDay)}`}
              >
                <Text style={styles.removeTriggerText}>Remove my sketch from this day</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.state}>
            <View style={styles.emptyMark}><View style={styles.emptyMarkInner} /></View>
            <Text accessibilityRole="header" style={styles.stateTitle}>Your first page is waiting</Text>
            <Text style={styles.stateBody}>A sketch appears here only when one of you chooses to send it.</Text>
            <Pressable style={styles.primaryButton} onPress={onOpenToday}>
              <Text style={styles.primaryButtonText}>Open today’s page</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {spread && (
        <Pressable style={styles.todayButton} onPress={onOpenToday} accessibilityRole="button">
          <Text style={styles.todayButtonText}>Today’s sketch</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: HearthTheme.color.cover, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: HearthTheme.space.lg, paddingTop: HearthTheme.space.md, paddingBottom: HearthTheme.space.sm },
  headingCopy: { flex: 1, paddingRight: HearthTheme.space.md },
  title: { color: HearthTheme.color.parchment, fontFamily: HearthTheme.type.display, fontSize: 30, lineHeight: 35 },
  sub: { marginTop: 2, color: '#D4C5D9', fontFamily: HearthTheme.type.body, fontSize: 14, lineHeight: 20 },
  close: { minWidth: 64, minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.md, borderRadius: HearthTheme.radius.md, borderWidth: 1, borderColor: 'rgba(255,248,238,0.28)', backgroundColor: HearthTheme.color.coverRaised },
  closeLabel: { color: HearthTheme.color.parchment, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: HearthTheme.space.sm, paddingBottom: HearthTheme.space.xl },
  activeDate: { marginTop: HearthTheme.space.sm, color: HearthTheme.color.parchment, fontFamily: HearthTheme.type.display, fontSize: 21, lineHeight: 26, textAlign: 'center' },
  relationshipDay: { marginTop: 2, color: '#D4C5D9', fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine },
  dateRailViewport: { flexGrow: 0, flexShrink: 0, height: 76 },
  dateRail: { gap: HearthTheme.space.sm, paddingHorizontal: HearthTheme.space.sm, paddingVertical: HearthTheme.space.md },
  dateChip: { minHeight: HearthTheme.touch.minimum, minWidth: 78, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.md, borderRadius: HearthTheme.radius.pill, borderWidth: 1, borderColor: 'rgba(255,248,238,0.28)', backgroundColor: HearthTheme.color.coverRaised },
  dateChipOn: { backgroundColor: HearthTheme.color.parchmentWarm, borderColor: HearthTheme.color.coral },
  dateChipText: { color: '#E3D7E6', fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  dateChipTextOn: { color: HearthTheme.color.ink },
  bookStage: { overflow: 'hidden' },
  bookImage: { position: 'absolute', left: 0 },
  page: { alignItems: 'center', paddingTop: 2 },
  name: { width: '100%', height: 18, color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  sketchTitle: { width: '94%', height: 14, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 8.5, lineHeight: 11, textAlign: 'center' },
  artFrame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#FFF2D6' },
  blankPage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  blankPageMark: { width: 8, height: 8, backgroundColor: HearthTheme.color.gold, opacity: 0.45 },
  inlineState: { alignItems: 'center', gap: HearthTheme.space.sm, marginVertical: HearthTheme.space.sm },
  pager: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: HearthTheme.space.sm, paddingHorizontal: HearthTheme.space.sm },
  pageButton: { minWidth: 96, minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.md, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.coverRaised, borderWidth: 1, borderColor: 'rgba(255,248,238,0.28)' },
  pageButtonText: { color: HearthTheme.color.parchment, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  pageCount: { color: '#D4C5D9', fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.caption },
  buttonDim: { opacity: 0.38 },
  state: { flex: 1, minHeight: 380, maxWidth: 330, alignItems: 'center', justifyContent: 'center', gap: HearthTheme.space.md, paddingHorizontal: HearthTheme.space.lg },
  stateTitle: { color: HearthTheme.color.parchment, fontFamily: HearthTheme.type.display, fontSize: HearthTheme.type.title, lineHeight: HearthTheme.type.titleLine, textAlign: 'center' },
  stateBody: { color: '#D4C5D9', fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine, textAlign: 'center' },
  emptyMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.coverRaised },
  emptyMarkInner: { width: 13, height: 13, backgroundColor: HearthTheme.color.gold },
  primaryButton: { minHeight: HearthTheme.touch.minimum, minWidth: 180, alignItems: 'center', justifyContent: 'center', marginTop: HearthTheme.space.sm, paddingHorizontal: HearthTheme.space.xl, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.clayPressed, borderWidth: 1, borderColor: HearthTheme.color.parchment },
  primaryButtonText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
  quietButton: { minHeight: HearthTheme.touch.minimum, justifyContent: 'center', paddingHorizontal: HearthTheme.space.lg },
  quietButtonText: { color: '#FFD0C8', fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  errorText: { maxWidth: 330, color: '#FFD0C8', fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine, textAlign: 'center' },
  removeTrigger: { minHeight: HearthTheme.touch.minimum, justifyContent: 'center', marginTop: HearthTheme.space.sm, paddingHorizontal: HearthTheme.space.lg, borderRadius: HearthTheme.radius.md },
  removeTriggerText: { color: '#FFD0C8', fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  deleteConfirm: { width: '100%', maxWidth: 440, marginTop: HearthTheme.space.md, padding: HearthTheme.space.lg, borderRadius: HearthTheme.radius.lg, borderWidth: 1, borderColor: '#D9867F', backgroundColor: '#4A2C3B' },
  deleteTitle: { color: '#FFF0EC', fontFamily: HearthTheme.type.display, fontSize: 19, lineHeight: 24 },
  deleteBody: { marginTop: HearthTheme.space.xs, color: '#E8C8C5', fontFamily: HearthTheme.type.body, fontSize: HearthTheme.type.caption, lineHeight: HearthTheme.type.captionLine },
  deleteActions: { flexDirection: 'row', gap: HearthTheme.touch.gap, marginTop: HearthTheme.space.md },
  keepButton: { minHeight: HearthTheme.touch.minimum, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.parchmentRaised },
  keepButtonText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  deleteButton: { minHeight: HearthTheme.touch.minimum, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, borderWidth: 1, borderColor: '#E69A93', backgroundColor: '#F8D9D5' },
  deleteButtonText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.caption },
  todayButton: { alignSelf: 'center', minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.xl, marginBottom: HearthTheme.space.sm, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.coral },
  todayButtonText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
});
