import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SIGNALS, type SignalType } from '@/copy';
import { useSceneStore, type AtmosphereMode, type AvatarKey, type SpotId } from '@/state/sceneStore';
import { useSignalStore } from '@/state/signalStore';
import { ui } from '@/theme/hearth';

const SIGNAL_TYPES = Object.keys(SIGNALS) as SignalType[];

const ATMOSPHERES: { id: AtmosphereMode; label: string }[] = [
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'rain', label: 'Rain' },
];

const SPOT_OPTIONS: { id: SpotId; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'fireplace', label: 'Fire' },
  { id: 'sofa', label: 'Sofa' },
  { id: 'table', label: 'Table' },
  { id: 'garden', label: 'Garden' },
  { id: 'rest', label: 'Rest' },
  { id: 'romantic', label: 'Bed' },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      hitSlop={4}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AvatarRow({ avatar, name }: { avatar: AvatarKey; name: string }) {
  const spot = useSceneStore((s) => s.spots[avatar]);
  const setSpot = useSceneStore((s) => s.setSpot);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{name}</Text>
      <View style={styles.row}>
        {SPOT_OPTIONS.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            active={spot === o.id}
            onPress={() => setSpot(avatar, o.id)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Dev-only QA controls: atmosphere presets, raw spot control, and a partner
 * simulator that stands in for the Phase-5 realtime sync. Never shipped.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const atmosphere = useSceneStore((s) => s.atmosphere);
  const setAtmosphere = useSceneStore((s) => s.setAtmosphere);
  const triggerGlow = useSceneStore((s) => s.triggerGlow);
  const mySignal = useSignalStore((s) => s.mySignal);
  const simulatePartnerSignal = useSignalStore((s) => s.simulatePartnerSignal);
  const simulatePartnerResponse = useSignalStore((s) => s.simulatePartnerResponse);

  if (!__DEV__) return null;

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen((v) => !v)} hitSlop={8}>
        <Text style={styles.fabText}>{open ? '×' : '⚙'}</Text>
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <ScrollView bounces={false}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Atmosphere</Text>
              <View style={styles.row}>
                {ATMOSPHERES.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.label}
                    active={atmosphere === a.id}
                    onPress={() => setAtmosphere(a.id)}
                  />
                ))}
                <Chip label="✨ Reconcile" onPress={triggerGlow} />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Partner sends (sim)</Text>
              <View style={styles.row}>
                {SIGNAL_TYPES.map((t) => (
                  <Chip key={t} label={SIGNALS[t].label} onPress={() => simulatePartnerSignal(t)} />
                ))}
              </View>
            </View>
            {mySignal && !mySignal.response && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Partner answers (sim)</Text>
                <View style={styles.row}>
                  {SIGNALS[mySignal.type].responses.map((r) => (
                    <Chip key={r} label={r} onPress={() => simulatePartnerResponse(r)} />
                  ))}
                </View>
              </View>
            )}
            <AvatarRow avatar="a" name="Avatar A (you)" />
            <AvatarRow avatar="b" name="Avatar B (partner)" />
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: ui.accent, fontSize: 20, lineHeight: 22 },
  panel: {
    position: 'absolute',
    left: 14,
    right: 74,
    bottom: 24,
    maxHeight: 260,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  section: { marginBottom: 8 },
  sectionLabel: {
    color: ui.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: ui.chipBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: ui.chipActiveBg },
  chipText: { color: ui.textDim, fontSize: 13 },
  chipTextActive: { color: ui.text },
});
