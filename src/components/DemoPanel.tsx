import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SIGNALS, type SignalType } from '@/copy';
import { useSceneStore, type AtmosphereMode, type AvatarKey, type SpotId } from '@/state/sceneStore';
import { ui } from '@/theme/hearth';

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
 * Phase-1 demo controls: tour every atmosphere, signal spot and the
 * reconciliation glow. Replaced by the real signal flows in later phases.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(true);
  const atmosphere = useSceneStore((s) => s.atmosphere);
  const setAtmosphere = useSceneStore((s) => s.setAtmosphere);
  const triggerGlow = useSceneStore((s) => s.triggerGlow);
  const spotA = useSceneStore((s) => s.spots.a);

  const signal: SignalType | null = spotA !== 'idle' ? (spotA as SignalType) : null;

  return (
    <>
      {signal && (
        <View style={styles.signalCard} pointerEvents="none">
          <Text style={styles.signalText}>“{SIGNALS[signal].selfText}”</Text>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => setOpen((v) => !v)} hitSlop={8}>
        <Text style={styles.fabText}>{open ? '×' : '✦'}</Text>
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
            <AvatarRow avatar="a" name="Avatar A (you)" />
            <AvatarRow avatar="b" name="Avatar B (partner)" />
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  signalCard: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  signalText: { color: ui.text, fontSize: 15, fontStyle: 'italic' },
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
