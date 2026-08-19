import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

/** The Three scene remains visually tappable; these tiny semantic controls give
 * screen-reader users independent access without adding a floating HUD. */
export function DailyMediaHomeActions() {
  return (
    <Pressable
      style={styles.screenReaderAction}
      onPress={() => router.push('/daily-record' as never)}
      accessibilityRole="button"
      accessibilityLabel="Open today’s record player voice prompt"
      accessibilityHint="Record or listen to a daily voice note"
    />
  );
}

const styles = StyleSheet.create({
  screenReaderAction: { position: 'absolute', width: 1, height: 1, left: 1, bottom: 1, opacity: 0.01 },
});
