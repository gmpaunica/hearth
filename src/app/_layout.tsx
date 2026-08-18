import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BackgroundMusic } from '@/components/BackgroundMusic';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HearthFredoka: require('../../assets/fonts/Fredoka-SemiBold.ttf'),
    HearthNunito: require('../../assets/fonts/Nunito-Regular.ttf'),
    'HearthNunito-ExtraBold': require('../../assets/fonts/Nunito-ExtraBold.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <BackgroundMusic />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1a2340' },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
