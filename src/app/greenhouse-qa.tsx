import { Asset } from 'expo-asset';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GreenhouseMemories } from '@/components/GreenhouseMemories';
import type { GreenhouseMemory } from '@/daily/model';
import { HearthTheme } from '@/theme/hearth';

type QaState = 'empty' | 'error' | 'chronology' | 'focused' | 'delete';

const PHOTO_URI = Asset.fromModule(require('../../assets/images/fireplace/fireplace-keepsake.webp')).uri;

const memory = (id: string, day: string, paired = false): GreenhouseMemory => ({
  id,
  home_date: day,
  planted_at: `${day}T19:00:00.000Z`,
  photos: Array.from({ length: paired ? 2 : 1 }, (_, index) => ({
    id: `${id}-photo-${index}`,
    author_id: index === 0 ? 'member-a' : 'member-b',
    storage_path: `qa/${id}-${index}.jpg`,
    mime_type: 'image/jpeg',
    width: 800,
    height: 1000,
    submitted_at: `${day}T18:00:00.000Z`,
  })),
});

const MEMORIES = [
  memory('early-september', '2026-09-08', true),
  memory('market-morning', '2026-09-05'),
  memory('late-august', '2026-08-29', true),
  memory('rainy-window', '2026-08-22'),
];

function GreenhouseQaExperience({ state }: { state: QaState }) {
  const memories = state === 'empty' || state === 'error' ? [] : MEMORIES;
  const focusDate = state === 'focused' ? '2026-09-05' : null;
  return <View style={styles.root}>
    <View style={styles.sky} />
    <View style={styles.ground} />
    <View style={styles.glassHouse}><View style={styles.glassDoor} /></View>
    <GreenhouseMemories
      memories={memories}
      activeBay={0}
      loading={false}
      hasMore={false}
      busy={false}
      error={state === 'error' ? 'Hearth can’t reach home right now. Check your connection and try again.' : null}
      focusDate={focusDate}
      localPhotoUri={PHOTO_URI}
      reviewConfirmDate={state === 'delete' ? '2026-09-08' : null}
      onBayChange={() => undefined}
      onLoadMore={() => undefined}
      onRetry={() => undefined}
      onUnplant={async () => false}
    />
  </View>;
}

/** Development-only, mutation-free greenhouse review states. */
export default function GreenhouseQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const states: QaState[] = ['empty', 'error', 'chronology', 'focused', 'delete'];
  const state = states.includes(requested as QaState) ? requested as QaState : 'chronology';
  return <GreenhouseQaExperience key={state} state={state} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: HearthTheme.color.parchment },
  sky: { position: 'absolute', top: 0, right: 0, bottom: '36%', left: 0, backgroundColor: HearthTheme.color.twilightSoft },
  ground: { position: 'absolute', right: 0, bottom: 0, left: 0, height: '43%', backgroundColor: HearthTheme.color.sageSoft },
  glassHouse: { position: 'absolute', top: 135, left: '50%', width: 190, height: 180, marginLeft: -95, borderWidth: 10, borderColor: HearthTheme.color.sage, borderRadius: 40, backgroundColor: 'rgba(255, 252, 247, 0.58)' },
  glassDoor: { position: 'absolute', width: 66, height: 116, bottom: -10, left: 52, borderWidth: 8, borderColor: HearthTheme.color.sage, borderBottomWidth: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
