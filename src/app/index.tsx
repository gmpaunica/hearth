import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { DemoPanel } from '@/components/DemoPanel';
import { Onboarding } from '@/components/Onboarding';
import { Pairing } from '@/components/Pairing';
import { Settings } from '@/components/Settings';
import { MySignalCard, PartnerSignalCard, ReconciliationPrompt } from '@/components/SignalCards';
import { SignalSheet } from '@/components/SignalSheet';
import { HomeScene } from '@/scene/HomeScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useReduceMotion } from '@/scene/useReduceMotion';
import { useHearthSync } from '@/state/useHearthSync';
import { useAuthStore } from '@/state/authStore';
import { APP_NAME, ui } from '@/theme/hearth';

export default function HomeScreen() {
  // Sign in, load the couple, and keep signals in sync with the partner.
  useHearthSync();
  // Respect the OS "reduce motion" setting for the reconciliation glow.
  useReduceMotion();
  const paired = useAuthStore((s) => s.phase === 'paired');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SceneCanvas>
        <HomeScene />
      </SceneCanvas>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title}>{APP_NAME}</Text>
      </View>
      {paired && (
        <>
          <MySignalCard />
          <PartnerSignalCard />
          <SignalSheet />
          <ReconciliationPrompt />
          <Settings />
        </>
      )}
      <Pairing />
      <Onboarding />
      <DemoPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2340' },
  titleWrap: { position: 'absolute', top: 26, alignSelf: 'center' },
  title: {
    color: ui.textDim,
    fontSize: 14,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
});
