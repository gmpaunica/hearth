import { Canvas } from '@react-three/fiber/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { CharacterRenderer } from '@/character/CharacterRenderer';
import { appearanceToAvatarColors, type AvatarAppearance } from '@/state/avatarAppearance';
import { HearthTheme } from '@/theme/hearth';

// Face the coarse character toward the camera at the same readable three-quarter
// angle as the approved concept sheet; drag still allows a complete rotation.
const INITIAL_ROTATION = 0;

/** The wardrobe renders the exact same voxel figure builder as the home. */
export function WardrobePreview({ appearance }: { appearance: AvatarAppearance }) {
  const colors = useMemo(() => appearanceToAvatarColors(appearance), [appearance]);
  const rotationRef = useRef(INITIAL_ROTATION);
  const dragStartRef = useRef(INITIAL_ROTATION);
  const dragStartXRef = useRef(0);
  const [rotationY, setRotationY] = useState(INITIAL_ROTATION);
  const handleDragGrant = useCallback((event: GestureResponderEvent) => {
    dragStartRef.current = rotationRef.current;
    dragStartXRef.current = event.nativeEvent.pageX;
  }, []);
  const handleDragMove = useCallback((event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - dragStartXRef.current;
    const nextRotation = dragStartRef.current + dx * 0.012;
    rotationRef.current = nextRotation;
    setRotationY(nextRotation);
  }, []);
  const rotateBy = useCallback((amount: number) => {
    const nextRotation = rotationRef.current + amount;
    rotationRef.current = nextRotation;
    setRotationY(nextRotation);
  }, []);

  return (
    <View style={styles.frame}>
      <Canvas
        orthographic
        flat
        camera={{ position: [3, 2.5, 3], zoom: 104, near: 0.1, far: 20 }}
        gl={{ antialias: false }}
      >
        <mesh position={[0, -0.675, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.48, 24]} />
          <meshBasicMaterial color="#8f6846" transparent opacity={0.14} depthWrite={false} />
        </mesh>
        <group position={[0, -0.7, 0]} rotation={[0, rotationY, 0]} scale={1.22}>
          <CharacterRenderer colors={colors} fixedPalette />
        </group>
      </Canvas>
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleDragGrant}
        onResponderMove={handleDragMove}
        onResponderTerminationRequest={() => false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Character preview. Swipe left or right to rotate."
        accessibilityHint="Use swipe gestures or accessibility increment and decrement actions to turn the character"
        accessibilityActions={[{ name: 'increment', label: 'Turn right' }, { name: 'decrement', label: 'Turn left' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            rotateBy(Math.PI / 4);
          } else if (event.nativeEvent.actionName === 'decrement') {
            rotateBy(-Math.PI / 4);
          }
        }}
        style={styles.gestureLayer}
      />
      <View pointerEvents="none" style={styles.rotateHint}>
        <Text style={styles.rotateHintIcon}>↔</Text>
        <Text style={styles.rotateHintText}>Drag to rotate</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 4 / 3,
    minHeight: 220,
    maxHeight: 290,
    borderRadius: HearthTheme.radius.lg,
    overflow: 'hidden',
    backgroundColor: HearthTheme.color.parchmentWarm,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  gestureLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  rotateHint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: HearthTheme.color.parchmentRaised,
    borderColor: HearthTheme.color.line,
    borderWidth: 1,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rotateHintIcon: {
    color: HearthTheme.color.clayPressed,
    fontSize: 15,
  },
  rotateHintText: {
    color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 12,
    fontWeight: '700',
  },
});
