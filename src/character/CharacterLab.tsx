import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';

import { editorial } from '@/theme/hearth';

import { REFERENCE_CHARACTER_PRESETS } from './characterPresets';
import { CharacterViewport } from './CharacterViewport';

const [CHARACTER_01, CHARACTER_02] = REFERENCE_CHARACTER_PRESETS;

const DIRECTION_CAMERA_AZIMUTH = Math.PI / 4;
const DIRECTION_CAPTURE_ZOOM = 78;
const DIRECTION_ACTOR_SCALE = 1.18;
const DIRECTION_VIEWS = [
  { label: 'FRONT', relativeRotation: 0 },
  { label: 'FRONT 3/4', relativeRotation: Math.PI / 4 },
  { label: 'SIDE', relativeRotation: Math.PI / 2 },
  { label: 'BACK 3/4', relativeRotation: (Math.PI * 3) / 4 },
  { label: 'BACK', relativeRotation: Math.PI },
] as const;

function DirectionValidation({
  viewportWidth,
  preset,
}: {
  viewportWidth: number;
  preset: (typeof REFERENCE_CHARACTER_PRESETS)[number];
}) {
  // CharacterCanvas looks toward the origin from (+x, +z), so its screen-right
  // world axis is (+x, -z). Placing the actors on that axis keeps every pair of
  // feet on one baseline while still using one GL context for the whole sheet.
  // Account for the screen padding and the sheet's own padding so each actor
  // lands directly above the centre of its flex label at capture width.
  const canvasWidth = Math.max(viewportWidth - 60, 280);
  const actors = DIRECTION_VIEWS.map((view, index) => {
    const screenOffset = (index - 2) * canvasWidth * 0.2;
    const rowOffset = screenOffset / (DIRECTION_CAPTURE_ZOOM * DIRECTION_ACTOR_SCALE);
    const worldOffset = rowOffset / Math.SQRT2;
    return {
      appearance: preset.appearance,
      position: [worldOffset, 0, -worldOffset] as [number, number, number],
      rotationY: DIRECTION_CAMERA_AZIMUTH - view.relativeRotation,
    };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.directionContent}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.kicker}>Development only · single canvas</Text>
            <Text style={styles.title}>Direction validation</Text>
          </View>
        </View>

        <View testID="character-direction-validation" style={styles.directionSheet}>
          <View style={styles.directionHeadingRow}>
            <View>
              <Text style={styles.directionEyebrow}>
                {preset.name} · {preset.id}
              </Text>
              <Text style={styles.directionHeading}>Fixed full-body directions</Text>
            </View>
            <Text style={styles.directionBadge}>909 × 608 target</Text>
          </View>
          <CharacterViewport
            actors={actors}
            height={260}
            zoom={DIRECTION_CAPTURE_ZOOM}
            style={styles.directionViewport}
          />
          <View style={styles.directionLabels}>
            {DIRECTION_VIEWS.map((view) => (
              <Text key={view.label} style={styles.directionLabel}>
                {view.label}
              </Text>
            ))}
          </View>
          <Text style={styles.directionNote}>
            Fixed 0° · 45° · 90° · 135° · 180° relative views. Compare eye visibility,
            crown closure, rear hair, clothing silhouette, and foot baseline.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CharacterLab() {
  const params = useLocalSearchParams<{
    view?: string | string[];
    preset?: string | string[];
  }>();
  const { width } = useWindowDimensions();
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const requestedPreset = Array.isArray(params.preset) ? params.preset[0] : params.preset;
  const directionPreset = requestedPreset === CHARACTER_02.id ? CHARACTER_02 : CHARACTER_01;

  if (__DEV__ && requestedView === 'directions') {
    return <DirectionValidation viewportWidth={width} preset={directionPreset} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.kicker}>Development only</Text>
            <Text style={styles.title}>Character Lab</Text>
          </View>
        </View>
        <View style={styles.introCard}>
          <Text style={styles.intro}>
            The eight reference presets use one renderer, one voxel unit and the same three-quarter camera.
            Drag any figure to inspect its complete hair and clothing silhouette.
          </Text>
        </View>

        <View style={styles.grid}>
          {REFERENCE_CHARACTER_PRESETS.map((preset) => (
            <View key={preset.id} style={styles.card}>
              <CharacterViewport actors={[{ appearance: preset.appearance }]} interactive height={224} />
              <Text style={styles.cardName}>{preset.name}</Text>
              <Text style={styles.cardId}>{preset.id}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Couples preview</Text>
          <Text style={styles.sectionCopy}>Character 01 + Character 02</Text>
        </View>
        <View style={styles.coupleCard}>
          <CharacterViewport
            actors={[
              { appearance: CHARACTER_01.appearance, position: [-0.37, 0, 0] },
              { appearance: CHARACTER_02.appearance, position: [0.37, 0, 0] },
            ]}
            height={245}
            zoom={96}
          />
          <Text style={styles.coupleLabel}>Standing beside each other · idle</Text>
        </View>
        <View style={styles.coupleCard}>
          <CharacterViewport
            actors={[
              { appearance: CHARACTER_01.appearance, pose: 'sitTogether', position: [-0.34, 0.13, 0.08] },
              { appearance: CHARACTER_02.appearance, pose: 'sitTogether', position: [0.34, 0.13, 0.08] },
            ]}
            height={245}
            zoom={96}
            bench
          />
          <Text style={styles.coupleLabel}>Sitting beside each other · sitTogether</Text>
        </View>

        <Text style={styles.footer}>
          Pose contract: idle · sit · wave · holdObject · sitTogether · hug · holdHands
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: editorial.canvas },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 56 },
  directionContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  backButtonPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  backText: { color: editorial.clay, fontSize: 34, lineHeight: 36 },
  kicker: {
    color: editorial.clay,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700',
  },
  introCard: {
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 16,
  },
  intro: { color: editorial.inkSoft, fontSize: 13, lineHeight: 20 },
  directionSheet: {
    padding: 12,
    borderRadius: 22,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  directionHeadingRow: {
    minHeight: 48,
    paddingHorizontal: 4,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  directionEyebrow: {
    color: editorial.clay,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  directionHeading: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: 2,
  },
  directionBadge: {
    color: editorial.clayDark,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: editorial.claySoft,
  },
  directionViewport: { borderRadius: 15 },
  directionLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 1,
    paddingTop: 9,
  },
  directionLabel: {
    flex: 1,
    color: editorial.inkSoft,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.45,
    textAlign: 'center',
  },
  directionNote: {
    color: editorial.inkSoft,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  card: {
    width: '48.5%',
    padding: 7,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardName: { color: editorial.ink, fontSize: 14, fontWeight: '800', marginTop: 8 },
  cardId: { color: editorial.clay, fontSize: 10, letterSpacing: 0.5, marginTop: 1 },
  sectionHeader: { marginTop: 30, marginBottom: 11, paddingHorizontal: 2 },
  sectionTitle: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
  },
  sectionCopy: { color: editorial.clay, fontSize: 12, fontWeight: '700', marginTop: 2 },
  coupleCard: {
    marginBottom: 14,
    padding: 8,
    paddingBottom: 11,
    borderRadius: 24,
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  coupleLabel: { color: editorial.inkSoft, fontSize: 12, fontWeight: '700', marginTop: 8 },
  footer: {
    color: editorial.inkSoft,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 17,
    backgroundColor: editorial.paperTint,
  },
});
