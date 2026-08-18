import { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { VoxMesh } from '@/scene/VoxMesh';
import type { Vox } from '@/scene/voxel';
import { appearanceToAvatarColors, type AvatarAppearance } from '@/state/avatarAppearance';
import { editorial } from '@/theme/hearth';

import { CharacterCanvas } from './CharacterCanvas';
import { CharacterRenderer } from './CharacterRenderer';
import { CHARACTER_PALETTE } from './characterPalette';
import type { CharacterPoseId } from './characterTypes';

export interface CharacterPreviewActor {
  appearance: AvatarAppearance;
  pose?: CharacterPoseId;
  position?: [number, number, number];
  rotationY?: number;
}

function buildBench(v: Vox) {
  v.box(0, 0, 0, 2, 4, 1, '#6c3f22');
  v.box(12, 0, 0, 2, 4, 1, '#6c3f22');
  v.box(0, 3, 0, 14, 2, 4, '#8b542b');
  v.box(0, 8, 0, 14, 2, 2, '#8b542b');
  v.box(0, 5, 0, 2, 5, 2, '#6c3f22');
  v.box(12, 5, 0, 2, 5, 2, '#6c3f22');
}

function PreviewActor({ actor, rotationY }: { actor: CharacterPreviewActor; rotationY: number }) {
  const colors = useMemo(() => appearanceToAvatarColors(actor.appearance), [actor.appearance]);
  return (
    <group
      position={actor.position ?? [0, 0, 0]}
      rotation={[0, rotationY + (actor.rotationY ?? 0), 0]}
    >
      <mesh position={[0, 0.006, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial
          color={CHARACTER_PALETTE.lab.shadow}
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </mesh>
      <CharacterRenderer colors={colors} pose={actor.pose} fixedPalette />
    </group>
  );
}

export function CharacterViewport({
  actors,
  height = 220,
  zoom = 98,
  interactive = false,
  bench = false,
  style,
}: {
  actors: CharacterPreviewActor[];
  height?: number;
  zoom?: number;
  interactive?: boolean;
  bench?: boolean;
  style?: ViewStyle;
}) {
  const rotationRef = useRef(0);
  const dragStartRef = useRef(0);
  const dragStartXRef = useRef(0);
  const [rotationY, setRotationY] = useState(0);
  const onGrant = useCallback((event: GestureResponderEvent) => {
    dragStartRef.current = rotationRef.current;
    dragStartXRef.current = event.nativeEvent.pageX;
  }, []);
  const onMove = useCallback((event: GestureResponderEvent) => {
    const next = dragStartRef.current + (event.nativeEvent.pageX - dragStartXRef.current) * 0.012;
    rotationRef.current = next;
    setRotationY(next);
  }, []);

  return (
    <View style={[styles.frame, { height }, style]}>
      <CharacterCanvas zoom={zoom}>
        <group position={[0, -0.71, 0]} scale={1.18}>
          {bench && (
            <VoxMesh
              build={buildBench}
              scale={0.085}
              position={[-0.595, 0, -0.26]}
            />
          )}
          {actors.map((actor, index) => (
            <PreviewActor
              key={`${actor.appearance.outfit}-${index}`}
              actor={actor}
              rotationY={interactive ? rotationY : 0}
            />
          ))}
        </group>
      </CharacterCanvas>
      {interactive && (
        <View
          onStartShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderTerminationRequest={() => false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Character preview. Swipe left or right to rotate."
          style={StyleSheet.absoluteFill}
        />
      )}
      {interactive && (
        <View pointerEvents="none" style={styles.hint}>
          <Text style={styles.hintText}>↔ rotate</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: editorial.paperTint,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hintText: {
    color: editorial.clay,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
