import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHomeAction, performHomeAction } from '@/home/actionRegistry';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { APP_NAME, HearthTheme } from '@/theme/hearth';
import { RoomRail } from './RoomRail';

export function HomeChrome({ togetherDay }: { togetherDay: number }) {
  const insets = useSafeAreaInsets();
  const surface = useMomentsSurfaceStore((state) => state.surface);
  const openDrawer = useMomentsSurfaceStore((state) => state.openDrawer);
  const account = getHomeAction('account');
  if (surface.kind !== 'none') return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.wordmark} pointerEvents="none">
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.day}>Day {togetherDay} together</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.account, pressed && styles.pressed]}
          onPress={() => performHomeAction('account')}
          accessibilityRole="button"
          accessibilityLabel={account.accessibilityLabel}
          accessibilityHint={account.accessibilityHint}
        >
          <Text style={styles.accountMark}>{account.icon}</Text>
          <Text style={styles.accountText}>Account</Text>
        </Pressable>
      </View>

      <RoomRail />

      <Pressable
        style={({ pressed }) => [
          styles.ourThings,
          { bottom: insets.bottom + 2 },
          pressed && styles.pressed,
        ]}
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityLabel="Open Our things"
        accessibilityHint="Find rituals, keepsakes, wardrobe, and decorating"
      >
        <Text style={styles.ourThingsMark}>⌂</Text>
        <Text style={styles.ourThingsText}>Our things</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 16 },
  header: {
    position: 'absolute',
    left: HearthTheme.space.lg,
    right: HearthTheme.space.lg,
    minHeight: HearthTheme.touch.minimum,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wordmark: {
    paddingHorizontal: HearthTheme.space.md,
    paddingVertical: 7,
    borderRadius: HearthTheme.radius.md,
    backgroundColor: 'rgba(255, 248, 238, 0.78)',
  },
  title: {
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.display,
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  day: {
    marginTop: 1,
    color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 11,
    lineHeight: 15,
  },
  account: {
    minWidth: 48,
    minHeight: HearthTheme.touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.pill,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: 'rgba(255, 248, 238, 0.94)',
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  accountMark: { marginRight: 6, color: HearthTheme.color.sage, fontSize: 10, lineHeight: 14 },
  accountText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 16 },
  ourThings: {
    position: 'absolute',
    left: 8,
    width: 60,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HearthTheme.radius.lg,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchment,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 20,
  },
  ourThingsMark: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.display, fontSize: 16, lineHeight: 18 },
  ourThingsText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, lineHeight: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
