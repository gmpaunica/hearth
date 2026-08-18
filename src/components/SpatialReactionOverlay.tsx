import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestMomentCameraFocus } from '@/scene/cameraState';
import { useDrawingStore } from '@/state/drawingStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { useWorldAnchorStore } from '@/state/worldAnchorStore';

type TailDirection = 'left' | 'right' | 'up' | 'down';

export function PixelSpeechBubble({
  copy,
  onPress,
  style,
  tail = 'down',
  children,
}: {
  copy: string;
  onPress: () => void;
  style?: ViewStyle;
  tail?: TailDirection;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy}
      onPress={onPress}
      style={({ pressed }) => [styles.bubble, style, pressed && styles.pressed]}
    >
      <View style={[styles.tail, styles[`tail${tail}`]]} />
      <Text style={styles.bubbleText}>{copy}</Text>
      {children}
    </Pressable>
  );
}

export function SpatialReactionOverlay() {
  const reaction = useMomentV2Store((state) => state.liveReaction);
  const anchor = useWorldAnchorStore((state) => reaction ? state.anchors[reaction.anchor] : null);
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (!reaction || !anchor) return null;

  const safeX = Math.min(width - 118, Math.max(118, anchor.x));
  const safeY = Math.min(height - insets.bottom - 110, Math.max(insets.top + 128, anchor.y));
  const deltaX = anchor.x - safeX;
  const deltaY = anchor.y - safeY;
  const tail: TailDirection = anchor.occluded || Math.abs(deltaX) > Math.abs(deltaY)
    ? (deltaX < 0 ? 'left' : 'right')
    : Math.abs(deltaY) > 2
      ? (deltaY < 0 ? 'up' : 'down')
      : 'down';

  const open = () => {
    if (reaction.anchor === 'drawing') {
      useDrawingStore.getState().requestOpen();
      return;
    }
    requestMomentCameraFocus(reaction.anchor, reduceMotion);
    useMomentsSurfaceStore.getState().openMoments();
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <PixelSpeechBubble
        copy={reaction.copy}
        onPress={open}
        tail={tail}
        style={{ left: safeX - 108, top: safeY - 52 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: 216,
    minHeight: 48,
    zIndex: 28,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3D211B',
    borderWidth: 2,
    borderColor: '#B96C4C',
    borderRadius: 6,
    shadowColor: '#2B1712',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  bubbleText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  tail: { position: 'absolute', width: 10, height: 10, backgroundColor: '#3D211B', borderColor: '#B96C4C', transform: [{ rotate: '45deg' }] },
  tailleft: { left: -6, top: 18, borderLeftWidth: 2, borderBottomWidth: 2 },
  tailright: { right: -6, top: 18, borderRightWidth: 2, borderTopWidth: 2 },
  tailup: { top: -6, left: 101, borderLeftWidth: 2, borderTopWidth: 2 },
  taildown: { bottom: -6, left: 101, borderRightWidth: 2, borderBottomWidth: 2 },
  pressed: { opacity: 0.78 },
});
