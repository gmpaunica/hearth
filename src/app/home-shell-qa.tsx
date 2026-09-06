import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomeChrome } from '@/components/HomeChrome';
import { MomentsController } from '@/components/MomentsController';
import { OurThingsDrawer } from '@/components/OurThingsDrawer';
import { HomeScene } from '@/scene/HomeScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useScenePan } from '@/scene/usePan';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { HearthTheme } from '@/theme/hearth';

/** Development-only deterministic shell used for responsive visual checks. */
export default function HomeShellQaScreen() {
  const panHandlers = useScenePan();
  const surface = useMomentsSurfaceStore((state) => state.surface);
  const momentsVisible = surface.kind === 'none' || surface.kind === 'moments';

  useEffect(() => {
    useMomentsSurfaceStore.getState().closeSurface();
    return () => useMomentsSurfaceStore.getState().closeSurface();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.scene} {...panHandlers}>
        <SceneCanvas>
          <HomeScene />
        </SceneCanvas>
      </View>
      <HomeChrome togetherDay={1} />
      {momentsVisible && <MomentsController />}
      <OurThingsDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HearthTheme.color.parchmentWarm },
  scene: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
