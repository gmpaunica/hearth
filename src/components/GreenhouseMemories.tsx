import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GreenhouseMemory } from '@/daily/model';
import { getGreenhouseBayCount, greenhouseBayDateRange, memoriesForBay } from '@/memories/greenhouseModel';
import { HearthTheme } from '@/theme/hearth';
import { PrivatePhoto } from './daily/PrivatePhoto';

interface Props {
  memories: GreenhouseMemory[];
  activeBay: number;
  loading: boolean;
  hasMore: boolean;
  busy: boolean;
  error: string | null;
  focusDate?: string | null;
  localPhotoUri?: string | null;
  reviewConfirmDate?: string | null;
  onBayChange: (bay: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onUnplant: (homeDate: string) => Promise<boolean>;
}

const prettyDate = (day: string, includeYear = true) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
  month: 'long', day: 'numeric', ...(includeYear ? { year: 'numeric' as const } : {}), timeZone: 'UTC',
});

const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', timeZone: 'UTC',
});

export function GreenhouseMemories({
  memories,
  activeBay,
  loading,
  hasMore,
  busy,
  error,
  focusDate = null,
  localPhotoUri = null,
  reviewConfirmDate = null,
  onBayChange,
  onLoadMore,
  onRetry,
  onUnplant,
}: Props) {
  const titleRef = useRef<Text>(null);
  const [confirmDate, setConfirmDate] = useState<string | null>(reviewConfirmDate);
  const [notice, setNotice] = useState<string | null>(null);
  const bayCount = getGreenhouseBayCount(memories.length);
  const bayMemories = memoriesForBay(memories, activeBay);
  const range = greenhouseBayDateRange(memories, activeBay);
  const canGoNewer = activeBay > 0;
  const canGoOlder = activeBay < bayCount - 1 || hasMore;

  useEffect(() => {
    const timer = setTimeout(() => titleRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, []);

  const rangeLabel = useMemo(() => {
    if (!range) return 'Waiting for your first planted day';
    if (range.newest === range.oldest) return prettyDate(range.newest);
    return `${shortDate(range.oldest)} – ${prettyDate(range.newest)}`;
  }, [range]);

  const goOlder = () => {
    setConfirmDate(null);
    setNotice(null);
    if (activeBay < bayCount - 1) onBayChange(activeBay + 1);
    else if (hasMore && !loading) onLoadMore();
  };

  const remove = async (memory: GreenhouseMemory) => {
    if (await onUnplant(memory.home_date)) {
      setConfirmDate(null);
      setNotice(`${prettyDate(memory.home_date)} was removed from the greenhouse.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="box-none" edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header} pointerEvents="box-none">
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}
          hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to the garden">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.titleCard}>
          <Text style={styles.eyebrow}>PLANTED DAYS</Text>
          <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>Memory greenhouse</Text>
          <Text style={styles.subtitle}>Small views of days you chose to keep.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.rangeCopy}>
            <Text style={styles.sheetTitle}>{activeBay === 0 ? 'Newest bay' : `Earlier bay ${activeBay + 1}`}</Text>
            <Text style={styles.capacity}>{rangeLabel}</Text>
          </View>
          <View style={styles.bayNav}>
            {activeBay > 0 && <Pressable style={({ pressed }) => [styles.newestButton, pressed && styles.pressed]}
              onPress={() => { setConfirmDate(null); setNotice(null); onBayChange(0); }} accessibilityRole="button" accessibilityLabel="Return to newest greenhouse memories">
              <Text style={styles.newestText}>Newest</Text>
            </Pressable>}
            <Pressable style={styles.navButton} disabled={!canGoNewer} onPress={() => onBayChange(activeBay - 1)}
              accessibilityRole="button" accessibilityLabel="Newer greenhouse bay" accessibilityState={{ disabled: !canGoNewer }}>
              <Text style={[styles.navText, !canGoNewer && styles.disabled]}>‹</Text>
            </Pressable>
            <Text style={styles.bayCount}>{activeBay + 1} / {bayCount}{hasMore ? '+' : ''}</Text>
            <Pressable style={styles.navButton} disabled={!canGoOlder || loading} onPress={goOlder}
              accessibilityRole="button" accessibilityLabel="Older greenhouse bay" accessibilityState={{ disabled: !canGoOlder || loading }}>
              <Text style={[styles.navText, (!canGoOlder || loading) && styles.disabled]}>›</Text>
            </Pressable>
          </View>
        </View>

        {!!notice && <View style={styles.notice} accessibilityLiveRegion="polite"><Text style={styles.noticeText}>{notice}</Text></View>}

        {error && memories.length === 0 ? (
          <View style={[styles.empty, styles.errorCard]} accessibilityLiveRegion="polite">
            <Text style={styles.emptyIcon}>◇</Text>
            <Text style={styles.emptyTitle}>The greenhouse did not open yet</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try opening the greenhouse again">
              <Text style={styles.primaryActionText}>Try again</Text>
            </Pressable>
          </View>
        ) : bayMemories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>♧</Text>
            <Text style={styles.emptyTitle}>{loading ? 'Opening the greenhouse…' : 'Your first kept day will grow here'}</Text>
            <Text style={styles.emptyBody}>After sharing a daily photo, choose Keep. A single photo can become a pair if another arrives before the day ends.</Text>
            {!loading && <Pressable style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]} onPress={() => router.push('/daily-photo' as never)} accessibilityRole="button" accessibilityLabel="Open today’s daily photo">
              <Text style={styles.primaryActionText}>Go to today’s photo</Text>
            </Pressable>}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memoryRow}
            snapToInterval={252} decelerationRate="fast" accessibilityLabel={`Greenhouse bay ${activeBay + 1}, ${rangeLabel}`}>
            {bayMemories.map((memory) => {
              const confirming = confirmDate === memory.home_date;
              const focused = focusDate === memory.home_date;
              return <View key={memory.id} style={[styles.memoryCard, focused && styles.focusedCard]} accessibilityLabel={`${prettyDate(memory.home_date)}. ${memory.photos.length === 2 ? 'A paired memory' : 'A single memory'}.`}>
                {focused && <Text style={styles.arrivalLabel}>THE DAY YOU OPENED</Text>}
                <View style={styles.photos}>
                  {memory.photos.map((photo) => (
                    <View key={photo.id} style={memory.photos.length === 2 ? styles.pairedPhoto : styles.singlePhoto}>
                      <PrivatePhoto item={photo} localUri={localPhotoUri} accessibilityLabel={`Private greenhouse photo from ${prettyDate(memory.home_date)}`} />
                    </View>
                  ))}
                </View>
                <Text style={styles.memoryDate}>{prettyDate(memory.home_date)}</Text>
                <Text style={styles.memoryKind}>{memory.photos.length === 2 ? 'A paired memory' : 'A single memory'}</Text>
                <Text style={styles.plantedDate}>Kept {prettyDate(memory.planted_at.slice(0, 10), false)}</Text>
                {confirming ? <View style={styles.deleteConfirm} accessibilityLiveRegion="polite">
                  <Text style={styles.deleteTitle}>Remove this memory?</Text>
                  <Text style={styles.deleteBody}>This is final for this photo-day. Both photos here will disappear from the greenhouse.</Text>
                  <View style={styles.confirmRow}>
                    <Pressable style={styles.keepAction} disabled={busy} onPress={() => setConfirmDate(null)} accessibilityRole="button"><Text style={styles.keepActionText}>Keep it</Text></Pressable>
                    <Pressable style={styles.removeAction} disabled={busy} onPress={() => void remove(memory)} accessibilityRole="button" accessibilityLabel={`Remove greenhouse memory from ${prettyDate(memory.home_date)}`}><Text style={styles.removeActionText}>{busy ? 'Removing…' : 'Remove forever'}</Text></Pressable>
                  </View>
                </View> : <Pressable disabled={busy} style={({ pressed }) => [styles.unplant, pressed && styles.pressed]}
                  onPress={() => { setNotice(null); setConfirmDate(memory.home_date); }} accessibilityRole="button" accessibilityLabel={`Remove greenhouse memory from ${prettyDate(memory.home_date)}`}>
                  <Text style={styles.unplantText}>Remove from greenhouse</Text>
                </Pressable>}
              </View>;
            })}
          </ScrollView>
        )}
        {!!error && memories.length > 0 && <View style={styles.inlineError} accessibilityLiveRegion="polite"><Text style={styles.errorText}>{error}</Text><Pressable style={styles.inlineRetry} onPress={onRetry} accessibilityRole="button"><Text style={styles.inlineRetryText}>Try again</Text></Pressable></View>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 8 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, elevation: 5 },
  backText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 34, lineHeight: 35, marginTop: -3 },
  titleCard: { flex: 1, maxWidth: 310, marginHorizontal: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: HearthTheme.radius.lg, alignItems: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.line },
  eyebrow: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, lineHeight: 13, letterSpacing: 1.2 },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 23, lineHeight: 28, textAlign: 'center' },
  subtitle: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 1 },
  headerSpacer: { width: 48 },
  sheet: { maxHeight: '68%', marginHorizontal: 10, marginBottom: 8, borderRadius: HearthTheme.radius.page, padding: 16, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, elevation: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  rangeCopy: { flex: 1, minWidth: 0 },
  sheetTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 20, lineHeight: 24 },
  capacity: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 15 },
  bayNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newestButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 9 },
  newestText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  navButton: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.sageSoft },
  navText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.display, fontSize: 27 },
  bayCount: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10 },
  disabled: { opacity: 0.3 },
  empty: { alignItems: 'center', padding: 18, borderRadius: HearthTheme.radius.lg, backgroundColor: HearthTheme.color.parchmentWarm },
  errorCard: { backgroundColor: HearthTheme.color.dangerSoft },
  emptyIcon: { color: HearthTheme.color.sage, fontSize: 30 },
  emptyTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 17, lineHeight: 22, textAlign: 'center', marginTop: 6 },
  emptyBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4, maxWidth: 330 },
  primaryAction: { minHeight: 48, marginTop: 14, paddingHorizontal: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.sage },
  primaryActionText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  notice: { padding: 11, marginBottom: 10, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.successSoft },
  noticeText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  memoryRow: { gap: 12, paddingRight: 2 },
  memoryCard: { width: 240, padding: 10, borderRadius: HearthTheme.radius.lg, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.line },
  focusedCard: { borderWidth: 2, borderColor: HearthTheme.color.focus },
  arrivalLabel: { color: HearthTheme.color.focus, fontFamily: HearthTheme.type.bodyStrong, fontSize: 9, letterSpacing: 1.1, marginBottom: 6 },
  photos: { flexDirection: 'row', gap: 5, height: 174 },
  singlePhoto: { flex: 1, maxWidth: 145, alignSelf: 'center' },
  pairedPhoto: { flex: 1 },
  memoryDate: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13, lineHeight: 17, marginTop: 7 },
  memoryKind: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 15 },
  plantedDate: { color: HearthTheme.color.inkFaint, fontFamily: HearthTheme.type.body, fontSize: 10, lineHeight: 14 },
  unplant: { minHeight: 48, justifyContent: 'center', marginTop: 3 },
  unplantText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  deleteConfirm: { marginTop: 7, padding: 10, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.dangerSoft },
  deleteTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 15, lineHeight: 19 },
  deleteBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 10, lineHeight: 14, marginTop: 2 },
  confirmRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  keepAction: { flex: 1, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  keepActionText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  removeAction: { flex: 1.25, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.danger },
  removeActionText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, padding: 10, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.dangerSoft },
  errorText: { flex: 1, color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11, lineHeight: 15 },
  inlineRetry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  inlineRetryText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
