import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  focusRoom,
  getFocusedRoom,
  subscribeFocusedRoom,
} from '@/scene/cameraState';
import { activeRoomStops, ROOM_UNLOCK_DAYS, type RoomId } from '@/scene/roomNavigation';
import { useHomeProgress } from '@/state/homeProgress';
import { useSceneStore } from '@/state/sceneStore';
import { HearthTheme } from '@/theme/hearth';

const ROOM_LABELS: Record<RoomId, string> = {
  garden: 'Garden',
  living: 'Living room',
  bedroom: 'Bedroom',
};

export function RoomRail() {
  const insets = useSafeAreaInsets();
  const focusedRoom = useSyncExternalStore(subscribeFocusedRoom, getFocusedRoom, getFocusedRoom);
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const { days } = useHomeProgress();
  const rooms = activeRoomStops();
  const selectedIndex = Math.max(0, rooms.findIndex((room) => room.id === focusedRoom));

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 66 }]}
      pointerEvents="box-none"
      accessibilityRole="tablist"
      accessibilityLabel="Rooms"
    >
      <Text style={[styles.edgeHint, selectedIndex === 0 && styles.edgeHintMuted]} aria-hidden>
        ‹
      </Text>
      <View style={styles.rail}>
        {rooms.map((room) => {
          const selected = focusedRoom === room.id;
          const unlockDay = room.id === 'living' ? 0 : ROOM_UNLOCK_DAYS[room.id];
          const locked = days < unlockDay;
          return (
            <Pressable
              key={room.id}
              style={({ pressed }) => [
                styles.room,
                selected && styles.roomSelected,
                pressed && styles.roomPressed,
              ]}
              onPress={() => focusRoom(room.id, reduceMotion)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${ROOM_LABELS[room.id]}${locked ? `, opens on day ${unlockDay}` : ''}`}
              accessibilityHint="Move the home view to this room"
            >
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={2}
                style={[styles.roomText, selected && styles.roomTextSelected]}
              >
                {locked ? '◇ ' : ''}{ROOM_LABELS[room.id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[styles.edgeHint, selectedIndex === rooms.length - 1 && styles.edgeHintMuted]}
        aria-hidden
      >
        ›
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    minHeight: HearthTheme.touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 18,
  },
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: HearthTheme.radius.pill,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: 'rgba(255, 248, 238, 0.92)',
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  room: {
    minHeight: HearthTheme.touch.minimum,
    minWidth: 74,
    maxWidth: 110,
    paddingHorizontal: 10,
    borderRadius: HearthTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomSelected: { backgroundColor: HearthTheme.color.ink },
  roomPressed: { opacity: 0.74 },
  roomText: {
    color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  roomTextSelected: { color: HearthTheme.color.onAccent },
  edgeHint: {
    width: 24,
    color: HearthTheme.color.clayPressed,
    fontFamily: HearthTheme.type.display,
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
  },
  edgeHintMuted: { opacity: 0.2 },
});
