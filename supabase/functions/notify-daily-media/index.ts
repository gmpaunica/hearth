import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DeliveryClaim = {
  media_id: string;
  couple_id: string;
  recipient_user_id: string;
  push_token: string | null;
  push_epoch: number;
  surface: 'daily-record' | 'daily-photo';
  attempt: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function secretsEqual(provided: string | null, expected: string) {
  if (!provided) return false;
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const expectedSecret = Deno.env.get('HEARTH_WEBHOOK_SECRET');
  if (!expectedSecret || !secretsEqual(request.headers.get('x-hearth-webhook-secret'), expectedSecret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: { media_id?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad payload' }, 400);
  }
  if (!payload.media_id || !UUID_PATTERN.test(payload.media_id)) {
    return json({ error: 'bad payload' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server configuration' }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('claim_daily_media_notification', {
    p_media_id: payload.media_id,
  });
  if (error) return json({ error: 'delivery claim failed' }, 500);
  const claim = (Array.isArray(data) ? data[0] : data) as DeliveryClaim | null;
  if (!claim) return json({ status: 'noop' });

  if (!claim.push_token) {
    await supabase.rpc('complete_daily_media_notification', {
      p_media_id: claim.media_id,
      p_attempt: claim.attempt,
      p_error: null,
    });
    return json({ status: 'no-token' });
  }

  let response: Response;
  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: claim.push_token,
        title: 'Hearth',
        body: 'Something new is waiting at home.',
        sound: 'default',
        data: {
          surface: claim.surface,
          mediaId: claim.media_id,
          recipientUserId: claim.recipient_user_id,
          coupleId: claim.couple_id,
        },
      }),
    });
  } catch (requestError) {
    await supabase.rpc('release_daily_media_notification', {
      p_media_id: claim.media_id,
      p_attempt: claim.attempt,
      p_error: `network failure: ${String(requestError)}`,
    });
    return json({ error: 'push service unavailable' }, 503);
  }

  let body: { data?: { status?: string; details?: { error?: string }; message?: string } } = {};
  try {
    body = await response.json();
  } catch {
    // Handled as a transient invalid response below.
  }
  const ticketError = body.data?.details?.error;
  if (!response.ok || !body.data || (response.status >= 500 || response.status === 429)) {
    await supabase.rpc('release_daily_media_notification', {
      p_media_id: claim.media_id,
      p_attempt: claim.attempt,
      p_error: `push HTTP ${response.status}`,
    });
    return json({ error: 'push service unavailable' }, 503);
  }

  if (ticketError === 'DeviceNotRegistered') {
    await supabase.rpc('invalidate_push_token', {
      p_user_id: claim.recipient_user_id,
      p_token: claim.push_token,
      p_epoch: claim.push_epoch,
    });
  }
  await supabase.rpc('complete_daily_media_notification', {
    p_media_id: claim.media_id,
    p_attempt: claim.attempt,
    p_error: body.data.status === 'error' ? (ticketError ?? body.data.message ?? 'push rejected') : null,
  });
  return json({ status: body.data.status === 'error' ? 'failed' : 'sent' });
});
