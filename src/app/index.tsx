import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { DailyDrawing } from '@/components/DailyDrawing';
import { DemoPanel } from '@/components/DemoPanel';
import { HomeGrewCard } from '@/components/HomeGrewCard';
import { HomeChrome } from '@/components/HomeChrome';
import { MomentsController } from '@/components/MomentsController';
import { FireplaceReconnectBubble } from '@/components/FireplaceReconnectBubble';
import { HearthStatusCard } from '@/components/HearthStatusCard';
import { OurThingsDrawer } from '@/components/OurThingsDrawer';
import { SpatialReactionOverlay } from '@/components/SpatialReactionOverlay';
import { PixelHeartPayoff } from '@/components/PixelHeartPayoff';
import { Onboarding } from '@/components/Onboarding';
import { Pairing } from '@/components/Pairing';
import { Settings } from '@/components/Settings';
import { HomeStudio } from '@/components/HomeStudio';
import { HomeScene } from '@/scene/HomeScene';
import { LockedRoomNotice } from '@/scene/LockedRoomNotice';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useScenePan } from '@/scene/usePan';
import { useReduceMotion } from '@/scene/useReduceMotion';
import { useHearthSync } from '@/state/useHearthSync';
import { useAuthStore } from '@/state/authStore';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useHomeProgress } from '@/state/homeProgress';
import { editorial } from '@/theme/hearth';

export default function HomeScreen() {
  // Sign in, load the couple, and keep signals in sync with the partner.
  useHearthSync();
  // Respect the OS "reduce motion" setting for the reconciliation glow.
  useReduceMotion();
  // Horizontal-dominant drags move between named rooms on the bounded rail.
  const panHandlers = useScenePan();
  const paired = useAuthStore((s) => s.phase === 'paired');
  const activeGrowthDays = useHomeProgress().days;
  const togetherDay = Math.max(1, Math.floor(activeGrowthDays) + 1);
  const surface = useMomentsSurfaceStore((state) => state.surface);
  const homeAvailable = surface.kind === 'none';
  const momentsVisible = surface.kind === 'none' || surface.kind === 'moments';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.scene} {...panHandlers}>
        <SceneCanvas>
          <HomeScene />
        </SceneCanvas>
      </View>
      {paired && <HomeChrome togetherDay={togetherDay} />}
      {paired && homeAvailable && <LockedRoomNotice />}
      {paired && homeAvailable && <SpatialReactionOverlay />}
      {paired && homeAvailable && <FireplaceReconnectBubble />}
      {paired && homeAvailable && <PixelHeartPayoff />}
      {paired && <HearthStatusCard />}
      {paired && (
        <>
          {momentsVisible && <MomentsController />}
          <Settings />
          <HomeStudio />
          <DailyDrawing showTrigger={false} />
          {homeAvailable && <HomeGrewCard />}
          <OurThingsDrawer />
        </>
      )}
      {homeAvailable && <Pairing />}
      {homeAvailable && <Onboarding />}
      {homeAvailable && <DemoPanel />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: editorial.canvas },
  scene: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
