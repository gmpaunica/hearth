import { usePreventScreenCapture } from 'expo-screen-capture';

/** Mount only while sensitive notes, drawings, or media are visible. */
export function PrivateSurfaceShield({ surface }: { surface: string }) {
  usePreventScreenCapture(`hearth-private-${surface}`);
  return null;
}
