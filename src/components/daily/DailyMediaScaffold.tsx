import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { editorial, hearthUi, momentsTypography } from '@/theme/hearth';

interface Props {
  eyebrow: string;
  title: string;
  icon: string;
  prompt: string | null;
  sharedCopy?: string | null;
  children: ReactNode;
}

export function DailyMediaScaffold({ eyebrow, title, icon, prompt, sharedCopy, children }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back home"
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.promptCard}>
          <View style={styles.tape} />
          <Text style={styles.promptLabel}>TODAY’S PROMPT</Text>
          <Text style={styles.prompt}>{prompt ?? 'Opening today’s prompt…'}</Text>
          {!!sharedCopy && <Text style={styles.sharedCopy}>{sharedCopy}</Text>}
        </View>
        {children}
        <Text style={styles.optional}>Optional, always. Close this page whenever you like.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: editorial.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  back: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.lineStrong,
  },
  backText: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 34, lineHeight: 36, marginTop: -3 },
  heading: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 10, letterSpacing: 1.4 },
  title: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 27, lineHeight: 31 },
  icon: {
    width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: hearthUi.blush, borderWidth: 1, borderColor: hearthUi.outline,
  },
  iconText: { fontSize: 24 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 34, gap: 14 },
  promptCard: {
    borderRadius: 27, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 20,
    backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.lineStrong,
    shadowColor: editorial.shadow, shadowOpacity: 0.14, shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 }, elevation: 7,
  },
  tape: {
    position: 'absolute', top: -7, alignSelf: 'center', width: 78, height: 20,
    borderRadius: 4, backgroundColor: 'rgba(245, 211, 155, 0.72)', transform: [{ rotate: '-2deg' }],
  },
  promptLabel: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 10, letterSpacing: 1.5 },
  prompt: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 24, lineHeight: 31, marginTop: 8 },
  sharedCopy: { color: editorial.inkSoft, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 17, marginTop: 12 },
  optional: { color: editorial.inkFaint, fontFamily: momentsTypography.body, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  pressed: { opacity: 0.7 },
});
