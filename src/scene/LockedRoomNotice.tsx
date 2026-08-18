import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHomeProgress } from '@/state/homeProgress';
import { useDrawingStore } from '@/state/drawingStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { ui } from '@/theme/hearth';
import { getFocusedRoom, subscribeFocusedRoom } from './cameraState';
import { lockedRoomCopy } from './roomNavigation';

export function LockedRoomNotice() {
  const focusedRoom = useSyncExternalStore(
    subscribeFocusedRoom,
    getFocusedRoom,
    getFocusedRoom,
  );
  const { components, days } = useHomeProgress();
  const hasAnyMoment = useMomentV2Store((state) => state.snapshot?.active != null);
  const hasDrawingNews = useDrawingStore((state) => !!state.partnerGrid && !state.partnerSeen);
  // DailyDrawing suppresses its banner whenever either signal is active. Match
  // that rule so this notice only shifts for overlays that are actually visible.
  const hasTopOverlay = hasAnyMoment || hasDrawingNews;
  const isLocked =
    (focusedRoom === 'bedroom' && !components.has('bed')) ||
    (focusedRoom === 'garden' && !components.has('garden'));
  const copy = focusedRoom && isLocked ? lockedRoomCopy(focusedRoom, days) : null;

  if (!copy) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, hasTopOverlay && styles.wrapShifted]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${copy.title} locked. ${copy.detail}.`}
    >
      <View style={styles.pill}>
        <Text style={styles.eyebrow}>LOCKED ROOM</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.detail}>{copy.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wrapShifted: {
    top: 176,
  },
  pill: {
    minWidth: 152,
    alignItems: 'center',
    backgroundColor: 'rgba(24, 29, 46, 0.88)',
    borderColor: 'rgba(221, 188, 119, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  eyebrow: {
    color: '#d0ae68',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: ui.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  detail: {
    color: ui.textDim,
    fontSize: 12,
    marginTop: 1,
  },
});
