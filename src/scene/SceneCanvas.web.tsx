import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Web canvas host (browser preview). */
export function SceneCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: '#1a2340' },
});
