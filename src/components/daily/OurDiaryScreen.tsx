import { router } from 'expo-router';
import { AccessibilityInfo, findNodeHandle, FlatList, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { useDailyCollectionStore } from '@/daily/collectionStore';
import type { DiaryDay } from '@/daily/model';
import { useAuthStore } from '@/state/authStore';
import { HearthTheme } from '@/theme/hearth';
import { PixelArt } from '../PixelArt';
import { VoiceNotePlayer } from './VoiceNotePlayer';

const prettyDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function DeleteButton({ label, onDelete, disabled, initiallyConfirming = false }: { label: string; onDelete: () => Promise<boolean>; disabled: boolean; initiallyConfirming?: boolean }) {
  const [confirming, setConfirming] = useState(initiallyConfirming);
  if (confirming) return (
    <View style={styles.deleteConfirm} accessibilityLiveRegion="polite">
      <Text style={styles.deleteConfirmTitle}>Remove your {label}?</Text>
      <Text style={styles.deleteConfirmBody}>It disappears for both of you and that day’s submission slot stays closed.</Text>
      <View style={styles.deleteActions}>
        <Pressable disabled={disabled} style={styles.keepButton} onPress={() => setConfirming(false)}><Text style={styles.keepText}>Keep it</Text></Pressable>
        <Pressable disabled={disabled} style={styles.removeButton} onPress={() => void onDelete()}><Text style={styles.removeText}>{disabled ? 'Removing…' : 'Remove forever'}</Text></Pressable>
      </View>
    </View>
  );
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
      onPress={() => setConfirming(true)}
      accessibilityRole="button" accessibilityLabel={`Permanently delete ${label}`}>
      <Text style={styles.deleteText}>Remove</Text>
    </Pressable>
  );
}

function DiaryPage({ day, width, onRemoved, reviewDeleteId, reviewMode, reviewAudioUri }: { day: DiaryDay; width: number; onRemoved: (label: string) => void; reviewDeleteId?: string | null; reviewMode: boolean; reviewAudioUri?: string | null }) {
  const userId = useAuthStore((state) => state.userId);
  const busy = useDailyCollectionStore((state) => state.busy != null);
  const remove = useDailyCollectionStore((state) => state.deleteFromDiary);
  const sketchWidth = Math.min(148, Math.max(112, (width - 70) / 2));

  return (
    <View style={styles.page}>
      <View style={styles.tape} />
      <Text style={styles.date}>{prettyDate(day.home_date)}</Text>
      {day.sketches.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>SKETCHES</Text>
          <View style={styles.sketches}>
            {day.sketches.map((sketch) => (
              <View key={sketch.id} style={styles.sketchCard}>
                <PixelArt grid={sketch.grid} width={sketchWidth} borderRadius={12} backgroundColor="#fff2d6" />
                <Text style={styles.author}>{sketch.author_id === userId ? 'Your sketch' : 'Your partner\u2019s sketch'}</Text>
                {sketch.author_id === userId && <DeleteButton label="sketch" disabled={busy} initiallyConfirming={reviewDeleteId === sketch.id}
                  onDelete={async () => { if (reviewMode) return false; const removed = await remove('sketch', sketch.id); if (removed) onRemoved('sketch'); return removed; }} />}
              </View>
            ))}
          </View>
        </View>
      )}
      {day.voices.length > 0 && (
        <View style={styles.voiceSection}>
          <Text style={styles.sectionLabel}>VOICE NOTES</Text>
          {day.voices.map((voice) => (
            <View key={voice.id} style={styles.voiceCard}>
              <Text style={styles.author}>{voice.author_id === userId ? 'Your voice note' : 'Your partner\u2019s voice note'}</Text>
              <VoiceNotePlayer item={voice} localUri={reviewAudioUri} label={`voice note from ${prettyDate(day.home_date)}`} />
              {voice.author_id === userId && <DeleteButton label="voice note" disabled={busy} initiallyConfirming={reviewDeleteId === voice.id}
                onDelete={async () => { if (reviewMode) return false; const removed = await remove('voice', voice.id); if (removed) onRemoved('voice note'); return removed; }} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function OurDiaryScreen({ reviewMode = false, reviewDeleteId = null, reviewAudioUri = null }: { reviewMode?: boolean; reviewDeleteId?: string | null; reviewAudioUri?: string | null } = {}) {
  const { width } = useWindowDimensions();
  const headingRef = useRef<Text>(null);
  const days = useDailyCollectionStore((state) => state.diary);
  const loading = useDailyCollectionStore((state) => state.diaryLoading);
  const hasMore = useDailyCollectionStore((state) => state.diaryHasMore);
  const error = useDailyCollectionStore((state) => state.error);
  const load = useDailyCollectionStore((state) => state.loadDiary);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  useEffect(() => { if (!reviewMode) void load(true); }, [load, reviewMode]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Platform.OS === 'web') return;
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Back home" hitSlop={8}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>TOGETHER</Text>
          <Text ref={headingRef} accessible accessibilityRole="header" style={styles.title}>Our Diary</Text>
          <Text style={styles.subtitle}>Voice notes and sketches, one page per date.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={days}
        keyExtractor={(day) => day.home_date}
        renderItem={({ item }) => <DiaryPage day={item} width={width} reviewDeleteId={reviewDeleteId} reviewMode={reviewMode} reviewAudioUri={reviewAudioUri} onRemoved={(label) => setDeleteNotice(`Your ${label} was removed. That day’s slot stays closed.`)} />}
        contentContainerStyle={[styles.list, days.length === 0 && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => { if (hasMore && !loading) void load(false); }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyMark} accessibilityElementsHidden><View style={styles.emptyMarkInner} /></View>
          <Text style={styles.emptyTitle}>{loading ? 'Opening Our Diary\u2026' : 'Your first page is waiting.'}</Text>
          <Text style={styles.emptyBody}>Daily voice notes and sketches will gather here. Photos stay in the greenhouse.</Text></View>}
        ListFooterComponent={loading && days.length > 0 ? <Text style={styles.loading}>Opening earlier pages\u2026</Text> : null}
      />
      {!!deleteNotice && <View style={styles.notice} accessibilityLiveRegion="polite"><Text style={styles.noticeText}>{deleteNotice}</Text></View>}
      {!!error && <View style={styles.errorCard} accessibilityLiveRegion="polite">
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void load(true)} accessibilityRole="button"><Text style={styles.retryText}>Try again</Text></Pressable>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: HearthTheme.color.parchment },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  back: { width: HearthTheme.touch.minimum, height: HearthTheme.touch.minimum, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  backText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 34, lineHeight: 36, marginTop: -3 },
  heading: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  eyebrow: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 9, letterSpacing: 1.5 },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 27, lineHeight: 30 },
  subtitle: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 10, textAlign: 'center' },
  headerSpacer: { width: 44 },
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 34 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  page: { padding: 18, borderRadius: HearthTheme.radius.page, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, elevation: 5 },
  tape: { position: 'absolute', top: -7, alignSelf: 'center', width: 76, height: 19, borderRadius: 4, backgroundColor: 'rgba(245, 211, 155, 0.72)', transform: [{ rotate: '-2deg' }] },
  date: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 21, textAlign: 'center', marginBottom: 14 },
  sectionLabel: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 9, letterSpacing: 1.5, marginBottom: 8 },
  sketches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  sketchCard: { width: '100%', alignItems: 'center', padding: 8, borderRadius: 17, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.line },
  author: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, marginTop: 6 },
  voiceSection: { marginTop: 15 },
  voiceCard: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 17, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.line, marginBottom: 8 },
  delete: { minHeight: 48, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10 },
  deleteConfirm: { width: '100%', alignSelf: 'stretch', marginTop: 8, padding: 12, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.coral },
  deleteConfirmTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 17, lineHeight: 21 },
  deleteConfirmBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 16, marginTop: 3 },
  deleteActions: { width: '100%', gap: 8, marginTop: 10 },
  keepButton: { flex: 1, minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  keepText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  removeButton: { flex: 1, minHeight: HearthTheme.touch.minimum, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.danger },
  removeText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  separator: { height: 14 },
  empty: { alignItems: 'center', paddingHorizontal: 35 },
  emptyMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.coralSoft },
  emptyMarkInner: { width: 14, height: 14, transform: [{ rotate: '45deg' }], backgroundColor: HearthTheme.color.coral },
  emptyTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 22, marginTop: 8 },
  emptyBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  loading: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, textAlign: 'center', padding: 14 },
  notice: { marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.successSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  noticeText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  errorCard: { marginHorizontal: 14, marginBottom: 8, padding: 12, alignItems: 'center', borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  error: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  retryButton: { minHeight: 48, minWidth: 120, alignItems: 'center', justifyContent: 'center', marginTop: 4, borderRadius: 16 },
  retryText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
