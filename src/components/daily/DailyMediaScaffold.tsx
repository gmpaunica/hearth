import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HearthTheme } from '@/theme/hearth';

interface Props {
  eyebrow: string;
  title: string;
  prompt: string | null;
  sharedCopy?: string | null;
  onBack?: () => void;
  backDisabled?: boolean;
  children: ReactNode;
}

export function DailyMediaScaffold({
  eyebrow,
  title,
  prompt,
  sharedCopy,
  onBack,
  backDisabled = false,
  children,
}: Props) {
  const headingRef = useRef<Text>(null);
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
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={onBack ?? (() => router.back())}
          disabled={backDisabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back home"
          accessibilityState={{ disabled: backDisabled }}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text ref={headingRef} accessible accessibilityRole="header" style={styles.title}>{title}</Text>
        </View>
        {/* Preserve the centered title without presenting decoration as a fake button. */}
        <View style={styles.headerSpacer} pointerEvents="none" />
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
  safeArea: { flex: 1, backgroundColor: HearthTheme.color.parchment },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  back: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong,
  },
  backText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 34, lineHeight: 36, marginTop: -3 },
  heading: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, letterSpacing: 1.4 },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 27, lineHeight: 31 },
  headerSpacer: { width: 44, height: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 34, gap: 14 },
  promptCard: {
    borderRadius: 27, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 20,
    backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong,
    shadowColor: HearthTheme.shadow.color, shadowOpacity: 0.14, shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 }, elevation: 7,
  },
  tape: {
    position: 'absolute', top: -7, alignSelf: 'center', width: 78, height: 20,
    borderRadius: 4, backgroundColor: 'rgba(245, 211, 155, 0.72)', transform: [{ rotate: '-2deg' }],
  },
  promptLabel: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, letterSpacing: 1.5 },
  prompt: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 24, lineHeight: 31, marginTop: 8 },
  sharedCopy: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17, marginTop: 12 },
  optional: { color: HearthTheme.color.inkFaint, fontFamily: HearthTheme.type.body, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  pressed: { opacity: 0.7 },
});
