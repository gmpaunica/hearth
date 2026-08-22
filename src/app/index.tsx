import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CharacterButton } from '@/components/CharacterButton';
import { DailyDrawing } from '@/components/DailyDrawing';
import { DemoPanel } from '@/components/DemoPanel';
import { HomeGrewCard } from '@/components/HomeGrewCard';
import { GreenhouseButton } from '@/components/GreenhouseButton';
import { MomentsController } from '@/components/MomentsController';
import { FireplaceReconnectBubble } from '@/components/FireplaceReconnectBubble';
import { HearthStatusCard } from '@/components/HearthStatusCard';
import { SpatialReactionOverlay } from '@/components/SpatialReactionOverlay';
import { PixelHeartPayoff } from '@/components/PixelHeartPayoff';
import { Onboarding } from '@/components/Onboarding';
import { Pairing } from '@/components/Pairing';
import { RitualsButton } from '@/components/RitualsButton';
import { DailyMediaHomeActions } from '@/components/daily/DailyMediaHomeActions';
import { Settings } from '@/components/Settings';
import { HomeStudio } from '@/components/HomeStudio';
import { DecorateButton } from '@/components/DecorateButton';
import { HomeScene } from '@/scene/HomeScene';
import { LockedRoomNotice } from '@/scene/LockedRoomNotice';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useScenePan } from '@/scene/usePan';
import { useReduceMotion } from '@/scene/useReduceMotion';
import { useHearthSync } from '@/state/useHearthSync';
import { useAuthStore } from '@/state/authStore';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useHomeUiStore } from '@/state/homeUiStore';
import { useHomeProgress } from '@/state/homeProgress';
import { APP_NAME, editorial } from '@/theme/hearth';

export default function HomeScreen() {
  // Sign in, load the couple, and keep signals in sync with the partner.
  useHearthSync();
  // Respect the OS "reduce motion" setting for the reconciliation glow.
  useReduceMotion();
  // Drag to scroll the home around.
  const panHandlers = useScenePan();
  const paired = useAuthStore((s) => s.phase === 'paired');
  const activeGrowthDays = useHomeProgress().days;
  const togetherDay = Math.max(1, Math.floor(activeGrowthDays) + 1);
  const settingsOpen = useMomentsSurfaceStore((state) => state.settingsOpen);
  const controlsHidden = useHomeUiStore((state) => state.controlsHidden);
  const hydrateHomeUi = useHomeUiStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateHomeUi();
  }, [hydrateHomeUi]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.scene} {...panHandlers}>
        <SceneCanvas>
          <HomeScene />
        </SceneCanvas>
      </View>
      {!settingsOpen && <View style={styles.titleWrap} pointerEvents="none">
        <Text style={[styles.headerText, styles.title]}>{APP_NAME}</Text>
        {paired && (
          <Text style={[styles.headerText, styles.togetherLabel]}>
            Day {togetherDay} of being together
          </Text>
        )}
      </View>}
      {paired && !settingsOpen && <LockedRoomNotice />}
      {paired && !settingsOpen && <SpatialReactionOverlay />}
      {paired && !settingsOpen && <FireplaceReconnectBubble />}
      {paired && !settingsOpen && <PixelHeartPayoff />}
      {paired && !settingsOpen && <HearthStatusCard />}
      {paired && (
        <>
          <View
            style={[styles.lowerControls, controlsHidden && styles.lowerControlsHidden]}
            pointerEvents={controlsHidden ? 'none' : 'box-none'}
            accessibilityElementsHidden={controlsHidden}
            importantForAccessibility={controlsHidden ? 'no-hide-descendants' : 'auto'}
          >
            {!settingsOpen && <MomentsController />}
            {!settingsOpen && <CharacterButton />}
            {!settingsOpen && <RitualsButton />}
            {!settingsOpen && <GreenhouseButton />}
            {!settingsOpen && <DecorateButton />}
          </View>
          <Settings />
          <HomeStudio />
          {!settingsOpen && <DailyDrawing />}
          {!settingsOpen && <HomeGrewCard />}
          {!settingsOpen && <DailyMediaHomeActions />}
        </>
      )}
      {!settingsOpen && <Pairing />}
      {!settingsOpen && <Onboarding />}
      {!settingsOpen && <DemoPanel />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: editorial.canvas },
  scene: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  lowerControls: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  lowerControlsHidden: { display: 'none' },
  titleWrap: {
    position: 'absolute',
    top: 26,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerText: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontWeight: '700',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255, 250, 241, 0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
  title: {
    fontSize: 15,
    letterSpacing: 5.5,
  },
  togetherLabel: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
  },
});
