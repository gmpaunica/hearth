import { Canvas } from '@react-three/fiber/native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Native (iOS/Android) canvas host — expo-gl under the hood. */
export function SceneCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      {/* flat = no tone mapping. With color management on and no tone curve,
          an authored hex color decodes to linear and re-encodes on output —
          an exact round-trip, so the art shows exactly as written (hero F). */}
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
  container: { flex: 1, backgroundColor: '#1a2340' },
});
