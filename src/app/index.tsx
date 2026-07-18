import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { DemoPanel } from '@/components/DemoPanel';
import { HomeScene } from '@/scene/HomeScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { APP_NAME, ui } from '@/theme/hearth';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SceneCanvas>
        <HomeScene />
      </SceneCanvas>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title}>{APP_NAME}</Text>
      </View>
      <DemoPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2340' },
  titleWrap: { position: 'absolute', top: 26, alignSelf: 'center' },
  title: {
    color: ui.textDim,
    fontSize: 14,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
});
