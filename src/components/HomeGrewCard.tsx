import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getAckStage, setAckStage } from '@/lib/prefs';
import { useAuthStore } from '@/state/authStore';
import { HOME_STAGES, useHomeProgress } from '@/state/homeProgress';
import { ui } from '@/theme/hearth';

/**
 * A gentle "your home grew" moment. When the couple reaches a new growth stage
 * they haven't seen celebrated yet, this surfaces the milestone (title + blurb)
 * once, then remembers it. A brand-new couple gets the first "moving in" note.
 */
export function HomeGrewCard() {
  const coupleId = useAuthStore((s) => s.couple?.id ?? null);
  const { stageIndex } = useHomeProgress();
  // -1 = still loading the acknowledged stage; don't flash anything yet.
  const [ack, setAck] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setAck(null);
    if (!coupleId) return;
    void getAckStage(coupleId).then((n) => {
      if (active) setAck(n);
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
    setAck(stageIndex);
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
    backgroundColor: 'rgba(12, 8, 20, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: ui.overlayBg,
    borderColor: ui.accentSoft,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    color: ui.textDim,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: { color: ui.accent, fontSize: 22, textAlign: 'center' },
  blurb: {
    color: ui.text,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  button: {
    backgroundColor: ui.chipActiveBg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  buttonText: { color: ui.text, fontSize: 15, letterSpacing: 0.3 },
});
