// Supabase connection details. These are the *publishable* anon values — safe
// to ship in the client bundle; every real permission is enforced by Row Level
// Security on the server (see supabase/schema.sql). Override per-environment
// with EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (Expo inlines
// any EXPO_PUBLIC_* var at build time); the fallbacks keep dev friction low.

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gtdigidqsczptqpbplar.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';
