import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GreenhouseMemory } from '@/daily/model';
import { getGreenhouseBayCount, memoriesForBay } from '@/memories/greenhouseModel';
import { editorial, momentsTypography } from '@/theme/hearth';
import { PrivatePhoto } from './daily/PrivatePhoto';

interface Props {
  memories: GreenhouseMemory[];
  activeBay: number;
  loading: boolean;
  hasMore: boolean;
  busy: boolean;
  error: string | null;
  onBayChange: (bay: number) => void;
  onLoadMore: () => void;
  onUnplant: (homeDate: string) => void;
}

const prettyDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export function GreenhouseMemories({
  memories,
  activeBay,
  loading,
  hasMore,
  busy,
  error,
  onBayChange,
  onLoadMore,
  onUnplant,
}: Props) {
  const bayCount = getGreenhouseBayCount(memories.length);
  const bayMemories = memoriesForBay(memories, activeBay);
  const canGoLater = activeBay > 0;
  const canGoEarlier = activeBay < bayCount - 1 || hasMore;

  const goEarlier = () => {
    if (activeBay < bayCount - 1) onBayChange(activeBay + 1);
    else if (hasMore && !loading) onLoadMore();
  };

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="box-none" edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header} pointerEvents="box-none">
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}
          hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to the garden">
          <Text style={styles.backText}>{'\u2039'}</Text>
        </Pressable>
        <View style={styles.titleCard} pointerEvents="none">
          <Text style={styles.eyebrow}>PLANTED DAYS</Text>
          <Text style={styles.title}>Memory greenhouse</Text>
          <Text style={styles.subtitle}>Four memories live in each sunlit bay.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Bay {activeBay + 1}</Text>
            <Text style={styles.capacity}>{memories.length} planted {memories.length === 1 ? 'day' : 'days'}</Text>
          </View>
          <View style={styles.bayNav}>
            <Pressable style={styles.navButton} disabled={!canGoLater} onPress={() => onBayChange(activeBay - 1)}
              accessibilityRole="button" accessibilityLabel="Newer greenhouse bay" accessibilityState={{ disabled: !canGoLater }}>
              <Text style={[styles.navText, !canGoLater && styles.disabled]}>{'\u2039'}</Text>
            </Pressable>
            <Text style={styles.bayCount}>{activeBay + 1} / {bayCount}{hasMore ? '+' : ''}</Text>
            <Pressable style={styles.navButton} disabled={!canGoEarlier || loading} onPress={goEarlier}
              accessibilityRole="button" accessibilityLabel="Older greenhouse bay" accessibilityState={{ disabled: !canGoEarlier || loading }}>
              <Text style={[styles.navText, (!canGoEarlier || loading) && styles.disabled]}>{'\u203a'}</Text>
            </Pressable>
          </View>
        </View>

        {bayMemories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u25a7'}</Text>
            <Text style={styles.emptyTitle}>{loading ? 'Opening the greenhouse\u2026' : 'No days have been planted yet.'}</Text>
            <Text style={styles.emptyBody}>Keep a daily photo day and it will grow here. A single becomes a pair if your partner answers before the day ends.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memoryRow}
            accessibilityLabel={`Greenhouse bay ${activeBay + 1}`}>
            {bayMemories.map((memory) => (
              <View key={memory.id} style={styles.memoryCard}>
                <View style={styles.photos}>
                  {memory.photos.map((photo) => (
                    <View key={photo.id} style={memory.photos.length === 2 ? styles.pairedPhoto : styles.singlePhoto}>
                      <PrivatePhoto item={photo} accessibilityLabel={`Private greenhouse photo from ${prettyDate(memory.home_date)}`} />
                    </View>
                  ))}
                </View>
                <Text style={styles.memoryDate}>{prettyDate(memory.home_date)}</Text>
                <Text style={styles.memoryKind}>{memory.photos.length === 2 ? 'A paired memory' : 'A single memory'}</Text>
                <Pressable disabled={busy} style={({ pressed }) => [styles.unplant, pressed && styles.pressed]}
                  onPress={() => Alert.alert('Remove this memory?', 'This is final for this photo-day.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => onUnplant(memory.home_date) },
                  ])}
                  accessibilityRole="button" accessibilityLabel={`Remove greenhouse memory from ${prettyDate(memory.home_date)}`}>
                  <Text style={styles.unplantText}>Remove from greenhouse</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 8 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong, elevation: 5 },
  backText: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 34, lineHeight: 35, marginTop: -3 },
  titleCard: { flex: 1, maxWidth: 310, marginHorizontal: 10, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, alignItems: 'center', backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.line },
  eyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 10, lineHeight: 13, letterSpacing: 1.2 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 24, lineHeight: 28 },
  subtitle: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 1 },
  headerSpacer: { width: 44 },
  sheet: { maxHeight: '62%', marginHorizontal: 10, marginBottom: 8, borderRadius: 28, padding: 16, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong, elevation: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  sheetTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 20, lineHeight: 24 },
  capacity: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 15 },
  bayNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navButton: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.sageSoft },
  navText: { color: editorial.sage, fontFamily: momentsTypography.heading, fontSize: 27 },
  bayCount: { color: editorial.inkSoft, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  disabled: { opacity: 0.3 },
  empty: { alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: editorial.paperTint },
  emptyIcon: { color: editorial.sage, fontSize: 30 },
  emptyTitle: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13, marginTop: 6 },
  emptyBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  memoryRow: { gap: 10, paddingRight: 2 },
  memoryCard: { width: 240, padding: 9, borderRadius: 18, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  photos: { flexDirection: 'row', gap: 5, height: 190 },
  singlePhoto: { flex: 1, maxWidth: 152, alignSelf: 'center' },
  pairedPhoto: { flex: 1 },
  memoryDate: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 16, marginTop: 7 },
  memoryKind: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 10, lineHeight: 13 },
  unplant: { minHeight: 34, justifyContent: 'center', marginTop: 5 },
  unplantText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  error: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.72 },
});
