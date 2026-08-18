// The single Supabase client for the app. Sessions persist in AsyncStorage
// (localStorage on web) so an anonymous user keeps the same identity — and the
// same home — across launches. The URL polyfill is required by supabase-js on
// React Native; it is a harmless no-op on web where URL already exists.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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

const isWebBrowser = Platform.OS === 'web' && typeof window !== 'undefined';

// A Chrome tab is a separate Hearth player while it is open. AsyncStorage's
// web implementation uses localStorage, which made every tab share the same
// anonymous Supabase user; the second tab was therefore trying to join its own
// home. sessionStorage keeps reloads stable but gives a newly opened tab its
// own identity. A per-tab storage key also isolates Supabase Auth's internal
// BroadcastChannel, which would otherwise copy sign-in events between tabs.
const webAuth = (() => {
  if (!isWebBrowser) return null;
  try {
    const session = window.sessionStorage;
    const tabKeyName = 'hearth.auth.tab-key';
    let tabKey = session.getItem(tabKeyName);
    if (!tabKey) {
      tabKey = globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      session.setItem(tabKeyName, tabKey);
    }
    return {
      storageKey: `hearth-auth-${tabKey}`,
      storage: {
        getItem: (key: string) => Promise.resolve(session.getItem(key)),
        setItem: (key: string, value: string) => {
          session.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          session.removeItem(key);
          return Promise.resolve();
        },
      },
    };
  } catch {
    // Restricted browser storage (or static rendering) still gets an isolated
    // in-memory session for this page rather than falling back to localStorage.
    return {
      storageKey: `hearth-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      storage: memoryStore(),
    };
  }
})();

const storage = webAuth?.storage ?? (typeof window === 'undefined' ? memoryStore() : AsyncStorage);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    ...(webAuth ? { storageKey: webAuth.storageKey } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth redirects here — anonymous sign-in only, so never try to parse a
    // session out of the URL (would break web deep links otherwise).
    detectSessionInUrl: false,
  },
});
