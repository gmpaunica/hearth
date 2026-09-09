import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BackgroundMusic } from '@/components/BackgroundMusic';
import { AppErrorBoundary, AppLoadingScreen } from '@/components/AppErrorBoundary';
import { AppPrivacyGate } from '@/components/AppPrivacyGate';

const subscribeHydration = () => () => {};

export default function RootLayout() {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  if (Platform.OS === 'web' && !hydrated) return <AppLoadingScreen />;
  return <HydratedRootLayout />;
}

function HydratedRootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HearthFredoka: require('../../assets/fonts/Fredoka-SemiBold.ttf'),
    HearthNunito: require('../../assets/fonts/Nunito-Regular.ttf'),
    'HearthNunito-ExtraBold': require('../../assets/fonts/Nunito-ExtraBold.ttf'),
  });

  if (!fontsLoaded && !fontError) return <AppLoadingScreen />;

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <BackgroundMusic />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1a2340' },
            }}
          >
          <Stack.Screen
            name="daily-photo"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="daily-record"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="greenhouse"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          </Stack>
          <AppPrivacyGate />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
