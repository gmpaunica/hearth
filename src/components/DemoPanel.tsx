import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSceneStore, type AtmosphereMode, type AvatarKey, type SpotId } from '@/state/sceneStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { editorial } from '@/theme/hearth';

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
  const interactionActive = useMomentV2Store((s) => s.snapshot?.active != null);

  if (!__DEV__) return null;

  return (
    <>
      <Pressable
        style={[styles.fab, interactionActive && !open && styles.fabHidden]}
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
      >
        <Text style={styles.fabText}>{open ? '×' : '⚙'}</Text>
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <ScrollView bounces={false}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Character QA</Text>
              <View style={styles.row}>
                <Chip label="Open Character Lab" onPress={() => router.push('/character-lab' as never)} />
              </View>
            </View>
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
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: editorial.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: { color: editorial.clay, fontSize: 20, lineHeight: 22 },
  fabHidden: { display: 'none' },
  panel: {
    position: 'absolute',
    left: 14,
    right: 74,
    bottom: 24,
    maxHeight: 260,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.17,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  section: { marginBottom: 8 },
  sectionLabel: {
    color: editorial.clay,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: editorial.paperTint,
    borderColor: editorial.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: editorial.clay },
  chipText: { color: editorial.inkSoft, fontSize: 13 },
  chipTextActive: { color: editorial.onAccent, fontWeight: '700' },
});
