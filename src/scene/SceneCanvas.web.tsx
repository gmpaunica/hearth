import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';

interface SceneCanvasProps {
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActionLabel?: string;
  onAccessibilityActivate?: (() => void) | null;
}

/** Web canvas host (browser preview). */
export function SceneCanvas({
  children,
  accessibilityLabel = 'Shared Hearth home',
  accessibilityHint = 'Open Moments to inspect and activate fireplace outcomes',
  accessibilityActionLabel = 'Open Moments and fireplace outcomes',
  onAccessibilityActivate = () => useMomentsSurfaceStore.getState().openMoments(),
}: SceneCanvasProps) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole={onAccessibilityActivate ? 'imagebutton' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={onAccessibilityActivate
        ? [{ name: 'activate', label: accessibilityActionLabel }]
        : undefined}
      onAccessibilityAction={onAccessibilityActivate
        ? (event) => {
            if (event.nativeEvent.actionName === 'activate') onAccessibilityActivate();
          }
        : undefined}
    >
      {/* flat = no tone mapping; hex colors round-trip exactly (see native). */}
      <Canvas
        orthographic
        flat
        camera={{ position: [12, 9.8, 12], zoom: 50, near: 0.1, far: 60 }}
        gl={{ antialias: false }}
      >
        {children}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3e5d2' },
});
