import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getGreenhouseBayCount,
  getGreenhouseCapacity,
  MAX_GREENHOUSE_PREVIEW_MEMORIES,
  type GreenhouseMemory,
} from '@/memories/greenhouseModel';
import { editorial, momentsTypography } from '@/theme/hearth';

interface GreenhouseMemoriesProps {
  memories: GreenhouseMemory[];
  onAddPreviewMemory: () => void;
  onResetPreview: () => void;
}

export function GreenhouseMemories({
  memories,
  onAddPreviewMemory,
  onResetPreview,
}: GreenhouseMemoriesProps) {
  const bayCount = getGreenhouseBayCount(memories.length);
  const capacity = getGreenhouseCapacity(memories.length);
  const previewFull = memories.length >= MAX_GREENHOUSE_PREVIEW_MEMORIES;

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="box-none" edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the garden"
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.titleCard} pointerEvents="none">
          <Text style={styles.eyebrow}>Garden memories</Text>
          <Text style={styles.title}>The greenhouse</Text>
          <Text style={styles.subtitle}>
            {memories.length === 0
              ? 'A quiet first room, ready for your history.'
              : `${memories.length} preview ${memories.length === 1 ? 'memory' : 'memories'} · ${bayCount} ${bayCount === 1 ? 'bay' : 'bays'}`}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleWrap}>
            <Text style={styles.sheetTitle}>Memory spaces</Text>
            <Text style={styles.capacity}>{memories.length} of {capacity} in this shape</Text>
          </View>
          <View style={styles.previewPill}>
            <Text style={styles.previewPillText}>Layout preview</Text>
          </View>
        </View>

        {memories.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyFrame}>
              <Text style={styles.emptyFrameIcon}>▧</Text>
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>Photos and videos will live here.</Text>
              <Text style={styles.emptyBody}>
                Media adding comes in a later update. For now, preview how the greenhouse grows without saving anything.
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.memoryRow}
            accessibilityLabel="Preview memory spaces"
          >
            {memories.map((memory, index) => (
              <View key={memory.id} style={styles.memoryCard}>
                <View style={[styles.mediaPlaceholder, memory.kind === 'video' && styles.videoPlaceholder]}>
                  <Text style={styles.mediaIcon}>{memory.kind === 'video' ? '▶' : '▧'}</Text>
                </View>
                <Text style={styles.memoryTitle}>{memory.caption}</Text>
                <Text style={styles.memoryKind}>
                  {memory.kind === 'video' ? 'Video placeholder' : 'Photo placeholder'} · bay {Math.floor(index / 4) + 1}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primary, (pressed || previewFull) && styles.primaryDim]}
            onPress={onAddPreviewMemory}
            disabled={previewFull}
            accessibilityRole="button"
            accessibilityLabel="Preview one more memory"
            accessibilityState={{ disabled: previewFull }}
          >
            <Text style={styles.primaryText}>{previewFull ? 'Preview is full' : 'Preview one more'}</Text>
          </Pressable>
          {memories.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              onPress={onResetPreview}
              accessibilityRole="button"
              accessibilityLabel="Reset greenhouse preview"
            >
              <Text style={styles.secondaryText}>Reset</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    justifyContent: 'space-between',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 8 },
  back: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  backText: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 34, lineHeight: 35, marginTop: -3 },
  titleCard: {
    flex: 1, maxWidth: 310, marginHorizontal: 10, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 22, alignItems: 'center', backgroundColor: editorial.paper,
    borderWidth: 1, borderColor: editorial.line,
  },
  eyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 10, lineHeight: 13 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 24, lineHeight: 28 },
  subtitle: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 1 },
  headerSpacer: { width: 44 },
  sheet: {
    marginHorizontal: 10, marginBottom: 8, borderRadius: 28, padding: 16,
    backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sheetTitleWrap: { flex: 1 },
  sheetTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 20, lineHeight: 24 },
  capacity: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 15 },
  previewPill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: editorial.sageSoft },
  previewPillText: { color: editorial.sage, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  empty: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: editorial.paperTint },
  emptyFrame: {
    width: 58, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.sageSoft, borderWidth: 1, borderColor: editorial.line,
  },
  emptyFrameIcon: { color: editorial.sage, fontSize: 25 },
  emptyCopy: { flex: 1, marginLeft: 12 },
  emptyTitle: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13, lineHeight: 17 },
  emptyBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 15, marginTop: 2 },
  memoryRow: { gap: 10, paddingRight: 2 },
  memoryCard: { width: 142, padding: 9, borderRadius: 18, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  mediaPlaceholder: { height: 70, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.sageSoft },
  videoPlaceholder: { backgroundColor: editorial.claySoft },
  mediaIcon: { color: editorial.clay, fontSize: 22 },
  memoryTitle: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 16, marginTop: 7 },
  memoryKind: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 9, lineHeight: 12, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: { flex: 1, minHeight: 44, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.clay },
  primaryDim: { opacity: 0.55 },
  primaryText: { color: editorial.onAccent, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  secondary: {
    minWidth: 78, minHeight: 44, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.lineStrong,
  },
  secondaryText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  pressed: { opacity: 0.72 },
});
