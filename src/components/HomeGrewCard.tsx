import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAckStage, setAckStage } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { HOME_STAGES, useHomeProgress } from '@/state/homeProgress';
import { HearthTheme } from '@/theme/hearth';

interface HomeGrewCardProps {
  reviewStageIndex?: number;
  reviewVisible?: boolean;
}

/** A one-time, pressure-free celebration of newly available home details. */
export function HomeGrewCard({
  reviewStageIndex,
  reviewVisible = false,
}: HomeGrewCardProps = {}) {
  const insets = useSafeAreaInsets();
  const coupleId = useAuthStore((state) => state.couple?.id ?? null);
  const { stageIndex } = useHomeProgress();
  const [acknowledgement, setAcknowledgement] = useState<{
    coupleId: string;
    stage: number;
  } | null>(null);
  const titleRef = useRef<Text>(null);
  const reviewMode = reviewStageIndex !== undefined;
  const effectiveStageIndex = reviewStageIndex ?? stageIndex;
  const ack = acknowledgement?.coupleId === coupleId ? acknowledgement.stage : null;
  const visible = reviewMode ? reviewVisible : Boolean(ack != null && coupleId && stageIndex > ack && stageIndex >= 0);

  useEffect(() => {
    if (reviewMode || !coupleId) return;
    let active = true;
    void getAckStage(coupleId).then((stage) => {
      if (active) setAcknowledgement({ coupleId, stage });
    });
    return () => {
      active = false;
    };
  }, [coupleId, reviewMode]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => titleRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || effectiveStageIndex < 0) return null;
  const stage = HOME_STAGES[effectiveStageIndex];
  if (!stage) return null;

  const dismiss = () => {
    if (reviewMode || !coupleId) return;
    setAcknowledgement({ coupleId, stage: effectiveStageIndex });
    void setAckStage(coupleId, effectiveStageIndex);
  };

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
      <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>A NEW CHAPTER AT HOME</Text>
        <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{stage.title}</Text>
        <Text style={styles.blurb}>{stage.blurb}</Text>
        <View style={styles.discoveryCard} accessible accessibilityLabel={`Now at home: ${stage.discoveries.join(', ')}`}>
          <Text style={styles.discoveryLabel}>Now at home</Text>
          {stage.discoveries.map((discovery) => (
            <View key={discovery} style={styles.discoveryRow}>
              <View style={styles.spark} />
              <Text style={styles.discoveryText}>{discovery}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.reassurance}>Nothing needs to be earned or rushed. Your home grows from the days you naturally share here.</Text>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={dismiss} accessibilityRole="button">
          <Text style={styles.buttonText}>{reviewVisible ? 'Continue review' : 'See it at home'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 500, backgroundColor: HearthTheme.color.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.xl },
  card: { width: '100%', maxWidth: 352, maxHeight: '100%', backgroundColor: HearthTheme.color.parchmentRaised, borderColor: HearthTheme.color.lineStrong, borderWidth: 1, borderRadius: HearthTheme.radius.page, shadowColor: HearthTheme.shadow.color, shadowOpacity: HearthTheme.shadow.opacity, shadowRadius: HearthTheme.shadow.radius, shadowOffset: HearthTheme.shadow.offset, elevation: HearthTheme.shadow.elevation },
  cardContent: { paddingHorizontal: HearthTheme.space.xl, paddingVertical: HearthTheme.space.xl, alignItems: 'center', gap: HearthTheme.space.md },
  kicker: { color: HearthTheme.color.clay, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11, letterSpacing: 1.6, textAlign: 'center' },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 28, lineHeight: 33, textAlign: 'center' },
  blurb: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  discoveryCard: { alignSelf: 'stretch', gap: 7, borderRadius: HearthTheme.radius.md, padding: HearthTheme.space.md, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.line },
  discoveryLabel: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  discoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  spark: { width: 8, height: 8, borderRadius: 4, backgroundColor: HearthTheme.color.gold },
  discoveryText: { flex: 1, color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14, lineHeight: 19 },
  reassurance: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: HearthTheme.touch.minimum, borderRadius: HearthTheme.radius.md, paddingHorizontal: HearthTheme.space.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.clay },
  buttonPressed: { backgroundColor: HearthTheme.color.clayPressed },
  buttonText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: HearthTheme.type.label },
});
