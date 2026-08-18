import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GreenhouseMemories } from '@/components/GreenhouseMemories';
import {
  createGreenhousePreviewMemory,
  MAX_GREENHOUSE_PREVIEW_MEMORIES,
  type GreenhouseMemory,
} from '@/memories/greenhouseModel';
import { GreenhouseScene } from '@/scene/GreenhouseScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { editorial } from '@/theme/hearth';

export default function GreenhouseRoute() {
  const [memories, setMemories] = useState<GreenhouseMemory[]>([]);

  const addPreviewMemory = () => {
    setMemories((current) => current.length >= MAX_GREENHOUSE_PREVIEW_MEMORIES
      ? current
      : [...current, createGreenhousePreviewMemory(current.length)]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.scene}>
        <SceneCanvas
          accessibilityLabel={`Memory greenhouse with ${memories.length} preview memories`}
          accessibilityHint="The voxel greenhouse adds one bay for every four memories"
          onAccessibilityActivate={null}
        >
          <GreenhouseScene memoryCount={memories.length} />
        </SceneCanvas>
      </View>
      <GreenhouseMemories
        memories={memories}
        onAddPreviewMemory={addPreviewMemory}
        onResetPreview={() => setMemories([])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: editorial.canvas },
  scene: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
