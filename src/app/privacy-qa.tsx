import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Settings } from '@/components/Settings';

/** Development-only visual harness for the native privacy controls. */
export default function PrivacyQaRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1 }}>
      <Settings previewOpen />
    </View>
  );
}
