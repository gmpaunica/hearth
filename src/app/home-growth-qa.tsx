import { Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { HomeGrewCard } from '@/components/HomeGrewCard';
import { HearthTheme } from '@/theme/hearth';

type QaState = 'moving' | 'details' | 'bedroom' | 'garden' | 'landmark' | 'grand';

const STAGES: Record<QaState, number> = {
  moving: 0,
  details: 1,
  bedroom: 4,
  garden: 5,
  landmark: 7,
  grand: 8,
};

/** Development-only, persistence-free home growth celebrations. */
export default function HomeGrowthQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const states = Object.keys(STAGES) as QaState[];
  const state = states.includes(requested as QaState) ? requested as QaState : 'garden';

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <Text style={styles.backdropTitle}>Your shared home</Text>
      <HomeGrewCard reviewStageIndex={STAGES[state]} reviewVisible />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentWarm },
  backdropTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 24 },
});
