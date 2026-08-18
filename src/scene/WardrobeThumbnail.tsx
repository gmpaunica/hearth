import { Canvas } from '@react-three/fiber/native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CharacterRenderer } from '@/character/CharacterRenderer';
import { appearanceToAvatarColors, type AvatarAppearance } from '@/state/avatarAppearance';
import { editorial } from '@/theme/hearth';

export type WardrobeThumbnailFocus = 'full' | 'head' | 'eyes' | 'top' | 'bottom' | 'shoes' | 'accessory';

const FOCUS_CAMERA: Record<WardrobeThumbnailFocus, { zoom: number; groupY: number }> = {
  full: { zoom: 38, groupY: -0.66 },
  head: { zoom: 72, groupY: -1.12 },
  eyes: { zoom: 118, groupY: -1.08 },
  top: { zoom: 76, groupY: -0.56 },
  bottom: { zoom: 76, groupY: -0.18 },
  shoes: { zoom: 118, groupY: -0.08 },
  accessory: { zoom: 58, groupY: -0.62 },
};

/**
 * A small, live render of the same coarse voxel character used in the main
 * home and wardrobe hero preview. Rendering the option itself keeps clothing
 * silhouettes and layered details legible instead of reducing them to swatches.
 */
export function WardrobeThumbnail({
  appearance,
  focus = 'full',
}: {
  appearance: AvatarAppearance;
  focus?: WardrobeThumbnailFocus;
}) {
  const colors = useMemo(() => appearanceToAvatarColors(appearance), [appearance]);
  const camera = FOCUS_CAMERA[focus];

  return (
    <View style={styles.frame} pointerEvents="none">
      <Canvas
        orthographic
        flat
        frameloop="demand"
        camera={{ position: [3, 2.5, 3], zoom: camera.zoom, near: 0.1, far: 20 }}
        gl={{ antialias: false }}
      >
        {focus === 'full' && (
          <mesh position={[0, -0.675, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.46, 20]} />
            <meshBasicMaterial color="#8f6846" transparent opacity={0.14} depthWrite={false} />
          </mesh>
        )}
        <group position={[0, camera.groupY, 0]} rotation={[0, 0, 0]} scale={1.22}>
          <CharacterRenderer colors={colors} fixedPalette />
        </group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 86,
    height: 104,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
  },
});
