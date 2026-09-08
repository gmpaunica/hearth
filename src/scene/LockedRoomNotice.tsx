import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHomeProgress } from '@/state/homeProgress';
import { useDrawingStore } from '@/state/drawingStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { HearthTheme } from '@/theme/hearth';
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
      accessibilityLabel={`${copy.title}. ${copy.detail}`}
    >
      <View style={styles.pill}>
        <Text style={styles.eyebrow}>A FUTURE CHAPTER</Text>
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
    backgroundColor: HearthTheme.color.cover,
    borderColor: HearthTheme.color.gold,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  eyebrow: {
    color: HearthTheme.color.gold,
    fontSize: 9,
    fontFamily: HearthTheme.type.bodyStrong,
    letterSpacing: 1.8,
  },
  title: {
    color: HearthTheme.color.onAccent,
    fontFamily: HearthTheme.type.display,
    fontSize: 16,
    marginTop: 2,
  },
  detail: {
    color: HearthTheme.color.twilightSoft,
    fontFamily: HearthTheme.type.body,
    fontSize: 12,
    marginTop: 1,
  },
});
