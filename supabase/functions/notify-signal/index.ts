// Supabase Edge Function (Phase 6) — push the partner a notification whenever a
// new signal is left. Invoked by a database webhook / trigger on
// `public.signals` INSERT (see ../../notifications.sql). Runs on Deno.
//
// Deploy:
//   supabase functions deploy notify-signal --no-verify-jwt
// It reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the function
// environment (both are provided automatically by the platform).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Mirror of NOTIFICATIONS in src/copy/index.ts. Kept verbatim here because a
// Deno Edge Function can't import the React Native app source; if the copy
// changes there, change it here too.
const NOTIFICATIONS = {
  somethingChanged: 'Something has changed at home.',
  fireplaceGlowing: 'The fireplace is glowing.',
  partnerSignal: 'Your partner has left a signal.',
  newSeed: 'A new seed was planted.',
  gardenWaiting: 'Someone is waiting in the garden.',
} as const;

/** The exact copy line for a given signal type. */
function bodyFor(type: string): string {
  switch (type) {
    case 'fireplace':
      return NOTIFICATIONS.fireplaceGlowing;
    case 'garden':
      return NOTIFICATIONS.gardenWaiting;
    case 'sofa':
    case 'table':
    case 'rest':
      return NOTIFICATIONS.partnerSignal;
    default:
      return NOTIFICATIONS.somethingChanged;
  }
}

interface SignalRecord {
  id: string;
  couple_id: string;
  from_user: string;
  type: string;
  resolved_at: string | null;
}

Deno.serve(async (req) => {
  let payload: { type?: string; record?: SignalRecord };
  try {
    payload = await req.json();
  } catch {
    return new Response('bad payload', { status: 400 });
  }

  const signal = payload.record;
  // Only brand-new, still-open signals warrant a nudge.
  if (payload.type !== 'INSERT' || !signal || signal.resolved_at) {
    return new Response('skip', { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Who is the other member of this couple?
  const { data: couple } = await supabase
    .from('couples')
    .select('member_a, member_b')
    .eq('id', signal.couple_id)
    .single();
  if (!couple) return new Response('no couple', { status: 200 });

  const partnerId =
    couple.member_a === signal.from_user ? couple.member_b : couple.member_a;
  if (!partnerId) return new Response('no partner yet', { status: 200 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', partnerId)
    .single();
  const token = profile?.push_token;
  if (!token) return new Response('partner has no push token', { status: 200 });

  // Hand it to Expo's push service, deep-linking into the room on tap.
  const message = {
    to: token,
    title: 'Hearth',
    body: bodyFor(signal.type),
    data: { url: 'hearth://' },
    sound: null as string | null,
    channelId: 'default',
  };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(message),
  });

  return new Response(await res.text(), {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
});
