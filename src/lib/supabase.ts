// The single Supabase client for the app. Sessions persist in AsyncStorage
// (localStorage on web) so an anonymous user keeps the same identity — and the
// same home — across launches. The URL polyfill is required by supabase-js on
// React Native; it is a harmless no-op on web where URL already exists.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// Expo's web build prerenders routes in Node (`output: "static"`), where there
// is no `window` and AsyncStorage's web shim throws. Fall back to an in-memory
// store during SSR so importing the client never crashes the render; the real
// AsyncStorage takes over in the browser and on native, where `window` exists.
const memoryStore = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => Promise.resolve(map.get(k) ?? null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
      return Promise.resolve();
    },
    removeItem: (k: string) => {
      map.delete(k);
      return Promise.resolve();
    },
  };
};

const storage = typeof window === 'undefined' ? memoryStore() : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth redirects here — anonymous sign-in only, so never try to parse a
    // session out of the URL (would break web deep links otherwise).
    detectSessionInUrl: false,
  },
});
