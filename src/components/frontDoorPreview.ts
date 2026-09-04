import { Platform } from 'react-native';

export type FrontDoorPreview =
  | 'welcome'
  | 'name'
  | 'loading'
  | 'choose'
  | 'join'
  | 'waiting'
  | 'waiting-error'
  | 'error';

const PREVIEWS = new Set<FrontDoorPreview>([
  'welcome',
  'name',
  'loading',
  'choose',
  'join',
  'waiting',
  'waiting-error',
  'error',
]);

/**
 * Development-only visual QA hook. Production and native clients always
 * return null, so a query string can never bypass the real authentication or
 * pairing state machine.
 */
export function readFrontDoorPreview(): FrontDoorPreview | null {
  if (!__DEV__ || Platform.OS !== 'web') return null;

  const runtime = globalThis as typeof globalThis & {
    location?: { search?: string };
  };
  const requested = new URLSearchParams(runtime.location?.search ?? '').get('frontDoor');
  return requested && PREVIEWS.has(requested as FrontDoorPreview)
    ? (requested as FrontDoorPreview)
    : null;
}
