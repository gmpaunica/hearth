import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { useDailyCollectionStore } from '@/daily/collectionStore';
import type { DiaryDay } from '@/daily/model';
import { useAuthStore } from '@/state/authStore';
import { editorial, momentsTypography } from '@/theme/hearth';
import { PixelArt } from '../PixelArt';
import { VoiceNotePlayer } from './VoiceNotePlayer';

const prettyDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function DeleteButton({ label, onDelete, disabled }: { label: string; onDelete: () => void; disabled: boolean }) {
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
      onPress={() => Alert.alert(`Delete ${label}?`, 'This is permanent and does not reopen that day\u2019s submission slot.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ])}
      accessibilityRole="button" accessibilityLabel={`Permanently delete ${label}`}>
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );
}

function DiaryPage({ day, width }: { day: DiaryDay; width: number }) {
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
                {sketch.author_id === userId && <DeleteButton label="sketch" disabled={busy}
                  onDelete={() => void remove('sketch', sketch.id)} />}
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
              <VoiceNotePlayer item={voice} label={`voice note from ${prettyDate(day.home_date)}`} />
              {voice.author_id === userId && <DeleteButton label="voice note" disabled={busy}
                onDelete={() => void remove('voice', voice.id)} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function OurDiaryScreen() {
  const { width } = useWindowDimensions();
  const days = useDailyCollectionStore((state) => state.diary);
  const loading = useDailyCollectionStore((state) => state.diaryLoading);
  const hasMore = useDailyCollectionStore((state) => state.diaryHasMore);
  const error = useDailyCollectionStore((state) => state.error);
  const load = useDailyCollectionStore((state) => state.loadDiary);

  useEffect(() => { void load(true); }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Back home" hitSlop={8}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>TOGETHER</Text>
          <Text style={styles.title}>Our Diary</Text>
          <Text style={styles.subtitle}>Voice notes and sketches, one page per date.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={days}
        keyExtractor={(day) => day.home_date}
        renderItem={({ item }) => <DiaryPage day={item} width={width} />}
        contentContainerStyle={[styles.list, days.length === 0 && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => { if (hasMore && !loading) void load(false); }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyHeart}>{'\u2665'}</Text>
          <Text style={styles.emptyTitle}>{loading ? 'Opening Our Diary\u2026' : 'Your first page is waiting.'}</Text>
          <Text style={styles.emptyBody}>Daily voice notes and sketches will gather here. Photos stay in the greenhouse.</Text></View>}
        ListFooterComponent={loading && days.length > 0 ? <Text style={styles.loading}>Opening earlier pages\u2026</Text> : null}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: editorial.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.lineStrong },
  backText: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 34, lineHeight: 36, marginTop: -3 },
  heading: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  eyebrow: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 9, letterSpacing: 1.5 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 27, lineHeight: 30 },
  subtitle: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 10, textAlign: 'center' },
  headerSpacer: { width: 44 },
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 34 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  page: { padding: 18, borderRadius: 27, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.lineStrong, elevation: 5 },
  tape: { position: 'absolute', top: -7, alignSelf: 'center', width: 76, height: 19, borderRadius: 4, backgroundColor: 'rgba(245, 211, 155, 0.72)', transform: [{ rotate: '-2deg' }] },
  date: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 21, textAlign: 'center', marginBottom: 14 },
  sectionLabel: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 9, letterSpacing: 1.5, marginBottom: 8 },
  sketches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  sketchCard: { flexGrow: 1, alignItems: 'center', padding: 8, borderRadius: 17, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  author: { color: editorial.inkSoft, fontFamily: momentsTypography.bodyBold, fontSize: 10, marginTop: 6 },
  voiceSection: { marginTop: 15 },
  voiceCard: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 17, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line, marginBottom: 8 },
  delete: { minHeight: 30, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  separator: { height: 14 },
  empty: { alignItems: 'center', paddingHorizontal: 35 },
  emptyHeart: { color: editorial.rose, fontSize: 32 },
  emptyTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 22, marginTop: 8 },
  emptyBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  loading: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, textAlign: 'center', padding: 14 },
  error: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 11, textAlign: 'center', padding: 8 },
  pressed: { opacity: 0.7 },
});
