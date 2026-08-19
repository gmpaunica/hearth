import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GreenhouseMemories } from '@/components/GreenhouseMemories';
import { useDailyCollectionStore } from '@/daily/collectionStore';
import { memoriesForBay } from '@/memories/greenhouseModel';
import { GreenhouseScene } from '@/scene/GreenhouseScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { editorial } from '@/theme/hearth';

export default function GreenhouseRoute() {
  const [activeBay, setActiveBay] = useState(0);
  const memories = useDailyCollectionStore((state) => state.greenhouse);
  const loading = useDailyCollectionStore((state) => state.greenhouseLoading);
  const hasMore = useDailyCollectionStore((state) => state.greenhouseHasMore);
  const busy = useDailyCollectionStore((state) => state.busy);
  const error = useDailyCollectionStore((state) => state.error);
  const load = useDailyCollectionStore((state) => state.loadGreenhouse);
  const unplant = useDailyCollectionStore((state) => state.unplantMemory);

  useEffect(() => { void load(true); }, [load]);
  const maxBay = Math.max(0, Math.ceil(memories.length / 4) - 1);
  const visibleBay = Math.min(activeBay, maxBay);
  const visibleCount = memoriesForBay(memories, visibleBay).length;
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.scene}>
        <SceneCanvas
          accessibilityLabel={`Memory greenhouse bay ${visibleBay + 1} with ${visibleCount} planted memories`}
          accessibilityHint="Use the bay controls below to browse four memories at a time"
          onAccessibilityActivate={null}
        >
          <GreenhouseScene memoryCount={visibleCount} />
        </SceneCanvas>
      </View>
      <GreenhouseMemories memories={memories} activeBay={visibleBay} loading={loading} hasMore={hasMore}
        busy={busy != null} error={error} onBayChange={setActiveBay}
        onLoadMore={() => { void load(false).then(() => setActiveBay((bay) => bay + 1)); }}
        onUnplant={(homeDate) => void unplant(homeDate)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: editorial.canvas },
  scene: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
