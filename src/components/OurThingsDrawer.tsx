import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  performHomeAction,
  type HomeActionGroup,
  useHomeActions,
} from '@/home/actionRegistry';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { HearthTheme } from '@/theme/hearth';

const GROUPS: HomeActionGroup[] = ['Today & rituals', 'Keepsakes', 'Make it ours'];

export function OurThingsDrawer() {
  const surface = useMomentsSurfaceStore((state) => state.surface);
  const closeSurface = useMomentsSurfaceStore((state) => state.closeSurface);
  const actions = useHomeActions();
  const headingRef = useRef<Text>(null);
  const open = surface.kind === 'drawer';
  const grouped = useMemo(() => GROUPS.map((group) => ({
    group,
    actions: actions
      .filter((action) => action.drawerGroup === group)
      .sort((left, right) => left.drawerOrder - right.drawerOrder),
  })), [actions]);

  useEffect(() => {
    if (!open) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSurface();
      return true;
    });
    const focusTimer = setTimeout(() => {
      if (Platform.OS === 'web') return;
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 80);
    return () => {
      back.remove();
      clearTimeout(focusTimer);
    };
  }, [closeSurface, open]);

  if (!open) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={closeSurface}>
      <Pressable
        style={styles.scrim}
        onPress={closeSurface}
        accessibilityRole="button"
        accessibilityLabel="Close Our things"
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>THE LITTLE LIFE INSIDE YOUR HOME</Text>
              <Text ref={headingRef} accessible accessibilityRole="header" style={styles.title}>Our things</Text>
              <Text style={styles.intro}>Rituals, keepsakes, and ways to make the rooms feel like yours.</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              onPress={closeSurface}
              accessibilityRole="button"
              accessibilityLabel="Close Our things"
              hitSlop={6}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {grouped.map(({ group, actions: groupActions }) => (
              <View key={group} style={styles.group}>
                <Text style={styles.groupTitle}>{group}</Text>
                {groupActions.map((action) => (
                  <Pressable
                    key={action.id}
                    style={({ pressed }) => [
                      styles.action,
                      !action.enabled && styles.actionDisabled,
                      pressed && action.enabled && styles.pressed,
                    ]}
                    onPress={() => performHomeAction(action.id)}
                    disabled={!action.enabled}
                    accessibilityRole="button"
                    accessibilityLabel={`${action.accessibilityLabel}${action.badgeLabel ? `, ${action.badgeLabel}` : ''}`}
                    accessibilityHint={action.disabledReason ?? action.accessibilityHint}
                    accessibilityState={{ disabled: !action.enabled }}
                  >
                    <View style={styles.iconWrap} pointerEvents="none">
                      <Text style={styles.icon}>{action.icon}</Text>
                    </View>
                    <View style={styles.actionCopy}>
                      <View style={styles.actionTitleRow}>
                        <Text style={styles.actionTitle}>{action.label}</Text>
                        {action.badgeLabel && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{action.badgeLabel}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.actionDescription}>
                        {action.disabledReason ?? action.description}
                      </Text>
                    </View>
                    <Text style={styles.chevron} aria-hidden>{action.enabled ? '›' : '◇'}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: HearthTheme.color.scrim },
  safeArea: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    overflow: 'hidden',
    borderTopLeftRadius: HearthTheme.radius.page,
    borderTopRightRadius: HearthTheme.radius.page,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchment,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: HearthTheme.shadow.opacity,
    shadowRadius: HearthTheme.shadow.radius,
    shadowOffset: HearthTheme.shadow.offset,
    elevation: HearthTheme.shadow.elevation,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: HearthTheme.space.xl,
    paddingTop: HearthTheme.space.xl,
    paddingBottom: HearthTheme.space.md,
  },
  headingCopy: { flex: 1, paddingRight: HearthTheme.space.md },
  eyebrow: {
    color: HearthTheme.color.sage,
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 2,
    color: HearthTheme.color.ink,
    fontFamily: HearthTheme.type.display,
    fontSize: 30,
    lineHeight: 35,
  },
  intro: {
    marginTop: 4,
    color: HearthTheme.color.inkMuted,
    fontFamily: HearthTheme.type.body,
    fontSize: 14,
    lineHeight: 20,
  },
  close: {
    width: HearthTheme.touch.minimum,
    height: HearthTheme.touch.minimum,
    borderRadius: HearthTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchmentRaised,
  },
  closeText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.body, fontSize: 26, lineHeight: 28 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: HearthTheme.space.lg, paddingBottom: HearthTheme.space.xl },
  group: { marginTop: HearthTheme.space.md },
  groupTitle: {
    marginBottom: HearthTheme.space.sm,
    marginLeft: HearthTheme.space.sm,
    color: HearthTheme.color.clayPressed,
    fontFamily: HearthTheme.type.display,
    fontSize: 17,
    lineHeight: 22,
  },
  action: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HearthTheme.space.sm,
    paddingHorizontal: HearthTheme.space.md,
    paddingVertical: HearthTheme.space.sm,
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.line,
    backgroundColor: HearthTheme.color.parchmentRaised,
  },
  actionDisabled: { opacity: 0.62 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.md,
    backgroundColor: HearthTheme.color.parchmentWarm,
  },
  icon: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.display, fontSize: 21, lineHeight: 25 },
  actionCopy: { flex: 1 },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  actionTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 15, lineHeight: 20 },
  actionDescription: { marginTop: 1, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17 },
  badge: { marginLeft: 7, paddingHorizontal: 7, paddingVertical: 2, borderRadius: HearthTheme.radius.pill, backgroundColor: HearthTheme.color.coralSoft },
  badgeText: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, lineHeight: 13 },
  chevron: { marginLeft: HearthTheme.space.sm, color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.display, fontSize: 24, lineHeight: 28 },
});
