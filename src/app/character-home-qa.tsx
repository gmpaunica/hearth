import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { atmo } from '@/scene/atmoState';
import { HomeScene } from '@/scene/HomeScene';
import type { RoomId } from '@/scene/roomNavigation';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useSceneStore } from '@/state/sceneStore';
import { editorial } from '@/theme/hearth';

function CharacterHomeValidation() {
  const { room } = useLocalSearchParams<{ room?: string }>();

  useEffect(() => {
    const scene = useSceneStore.getState();
    const previousSpots = { ...scene.spots };
    const previousReduceMotion = atmo.reduceMotion;

    // One standing figure and one real sofa pose exercise the exact HomeScene,
    // Avatar rig, camera and pixel pass without requiring a paired QA account.
    scene.setSpot('a', 'idle');
    scene.setSpot('b', 'sofa');
    atmo.reduceMotion = true;
    scene.requestSnap();

    return () => {
      const current = useSceneStore.getState();
      current.setSpot('a', previousSpots.a);
      current.setSpot('b', previousSpots.b);
      atmo.reduceMotion = previousReduceMotion;
      current.requestSnap();
    };
  }, [room]);

  const requestedRoom: RoomId =
    room === 'garden' || room === 'bedroom' ? room : 'living';

  return (
    <View testID="character-home-validation" style={styles.root}>
      <SceneCanvas>
        <HomeScene initialRoom={requestedRoom} />
      </SceneCanvas>
    </View>
  );
}

export default function CharacterHomeQaRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <CharacterHomeValidation />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: editorial.canvas },
});
