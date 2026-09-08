import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

function NativePrivateSurfaceShield({ surface }: { surface: string }) {
  usePreventScreenCapture(`hearth-private-${surface}`);
  return null;
}

/** Mount only while sensitive notes, drawings, or media are visible. */
export function PrivateSurfaceShield({ surface }: { surface: string }) {
  if (Platform.OS === 'web') return null;
  return <NativePrivateSurfaceShield surface={surface} />;
}
