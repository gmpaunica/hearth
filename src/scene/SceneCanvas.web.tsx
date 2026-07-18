import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Web canvas host (browser preview). */
export function SceneCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0.35, 5.1, 8.7], fov: 38, near: 0.1, far: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        {children}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#191009' },
});
