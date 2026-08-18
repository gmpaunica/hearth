import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getAckStage, setAckStage } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { HOME_STAGES, useHomeProgress } from '@/state/homeProgress';
import { editorial } from '@/theme/hearth';

/**
 * A gentle "your home grew" moment. When the couple reaches a new growth stage
 * they haven't seen celebrated yet, this surfaces the milestone (title + blurb)
 * once, then remembers it. A brand-new couple gets the first "moving in" note.
 */
export function HomeGrewCard() {
  const coupleId = useAuthStore((s) => s.couple?.id ?? null);
  const { stageIndex } = useHomeProgress();
  // Tag the acknowledgement with its home so switching homes cannot briefly
  // show the previous home's milestone while the next value loads.
  const [acknowledgement, setAcknowledgement] = useState<{
    coupleId: string;
    stage: number;
  } | null>(null);
  const ack = acknowledgement?.coupleId === coupleId ? acknowledgement.stage : null;

  useEffect(() => {
    let active = true;
    if (!coupleId) return;
    void getAckStage(coupleId).then((n) => {
      if (active) setAcknowledgement({ coupleId, stage: n });
    });
    return () => {
      active = false;
    };
  }, [coupleId]);

  if (ack == null || !coupleId) return null;
  if (stageIndex <= ack || stageIndex < 0) return null;

  const stage = HOME_STAGES[stageIndex];
  if (!stage) return null;

  const dismiss = () => {
    setAcknowledgement({ coupleId, stage: stageIndex });
    void setAckStage(coupleId, stageIndex);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Your home grew</Text>
        <Text style={styles.title}>{stage.title}</Text>
        <Text style={styles.blurb}>{stage.blurb}</Text>
        <Pressable style={styles.button} onPress={dismiss}>
          <Text style={styles.buttonText}>Lovely</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: editorial.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 26,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  kicker: {
    color: editorial.clay,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  blurb: {
    color: editorial.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: editorial.clay,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  buttonText: {
    color: editorial.onAccent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
