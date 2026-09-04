// Supabase Edge Function — authenticated, outbox-backed Expo push delivery.
// Postgres captures the insertion-time recipient and atomically claims each send
// or receipt check. The request body supplies only an action and signal id.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NOTIFICATIONS = {
  somethingChanged: 'Something has changed at home.',
  fireplaceGlowing: 'The fireplace is glowing.',
  partnerSignal: 'Your partner has left a signal.',
  gardenWaiting: 'Someone is waiting in the garden.',
  feelingClose: 'Someone is thinking of you.',
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SignalPayload {
  id: string;
}

interface DeliveryClaim {
  signal_id: string;
  couple_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  signal_type: string;
  push_token: string | null;
  push_epoch: number;
  attempt: number;
}

interface ReceiptClaim {
  signal_id: string;
  recipient_user_id: string;
  push_token: string | null;
  push_epoch: number;
  expo_ticket_id: string;
  receipt_attempt: number;
}

interface ExpoTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoReceipt {
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function bodyFor(type: string): string {
  switch (type) {
    case 'fireplace':
      return NOTIFICATIONS.fireplaceGlowing;
    case 'garden':
      return NOTIFICATIONS.gardenWaiting;
    case 'romantic':
      return NOTIFICATIONS.feelingClose;
    case 'sofa':
    case 'table':
    case 'rest':
      return NOTIFICATIONS.partnerSignal;
    default:
      return NOTIFICATIONS.somethingChanged;
  }
}

function secretsEqual(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function expoRequest(url: string, body: unknown): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === 2) return response;
      await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }
    await delay(250 * 2 ** attempt);
  }
  throw lastError ?? new Error('Expo request failed');
}

function firstRow<T>(data: T[] | T | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const expectedSecret = Deno.env.get('HEARTH_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-hearth-webhook-secret');
  if (!expectedSecret || !secretsEqual(providedSecret, expectedSecret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: {
    type?: string;
    table?: string;
    action?: string;
    record?: SignalPayload;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad payload' }, 400);
  }

  const signal = payload.record;
  const action = payload.action ?? 'send';
  if (
    payload.type !== 'INSERT' ||
    payload.table !== 'signals' ||
    !['send', 'receipt'].includes(action) ||
    !signal ||
    typeof signal.id !== 'string' ||
    !UUID_PATTERN.test(signal.id)
  ) {
    return json({ error: 'bad payload' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('NOTIFICATION CONFIG missing Supabase environment');
    return json({ error: 'server configuration' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'receipt') {
    const { data, error } = await supabase.rpc('claim_signal_receipt', {
      p_signal_id: signal.id,
    });
    if (error) {
      console.error('RECEIPT CLAIM failed:', error.message);
      return json({ error: 'receipt claim failed' }, 500);
    }
    const claim = firstRow(data as ReceiptClaim[] | null);
    if (!claim) return json({ status: 'noop', reason: 'not due or already claimed' });

    let response: Response;
    try {
      response = await expoRequest('https://exp.host/--/api/v2/push/getReceipts', {
        ids: [claim.expo_ticket_id],
      });
    } catch (requestError) {
      await supabase.rpc('release_signal_receipt', {
        p_signal_id: signal.id,
        p_receipt_attempt: claim.receipt_attempt,
        p_error: `receipt network failure: ${String(requestError)}`,
      });
      return json({ error: 'receipt service unavailable' }, 503);
    }

    let responseBody: { data?: Record<string, ExpoReceipt> } = {};
    try {
      responseBody = await response.json();
    } catch {
      await supabase.rpc('release_signal_receipt', {
        p_signal_id: signal.id,
        p_receipt_attempt: claim.receipt_attempt,
        p_error: `invalid receipt response: HTTP ${response.status}`,
      });
      return json({ error: 'invalid receipt response' }, 503);
    }

    const receipt = responseBody.data?.[claim.expo_ticket_id];
    if (!response.ok || !receipt) {
      await supabase.rpc('release_signal_receipt', {
        p_signal_id: signal.id,
        p_receipt_attempt: claim.receipt_attempt,
        p_error: `receipt unavailable: HTTP ${response.status}`,
      });
      return json({ error: 'receipt unavailable' }, 503);
    }

    if (receipt.status === 'ok') {
      const { error: completeError } = await supabase.rpc('complete_signal_receipt', {
        p_signal_id: signal.id,
        p_receipt_attempt: claim.receipt_attempt,
        p_status: 'sent',
        p_error: null,
      });
      if (completeError) return json({ error: 'receipt completion failed' }, 500);
      return json({ status: 'delivered' });
    }

    const receiptCode = receipt.details?.error ?? 'UnknownReceiptError';
    if (receiptCode === 'MessageRateExceeded' || receiptCode === 'UnknownReceiptError') {
      await supabase.rpc('release_signal_receipt', {
        p_signal_id: signal.id,
        p_receipt_attempt: claim.receipt_attempt,
        p_error: receiptCode,
      });
      return json({ error: 'receipt reported a temporary failure', code: receiptCode }, 503);
    }
    if (receiptCode === 'DeviceNotRegistered' && claim.push_token) {
      const { error: invalidateError } = await supabase.rpc('invalidate_push_token', {
        p_user_id: claim.recipient_user_id,
        p_token: claim.push_token,
        p_epoch: claim.push_epoch,
      });
      if (invalidateError) {
        await supabase.rpc('release_signal_receipt', {
          p_signal_id: signal.id,
          p_receipt_attempt: claim.receipt_attempt,
          p_error: `token invalidation failed: ${invalidateError.message}`,
        });
        return json({ error: 'token invalidation failed' }, 500);
      }
    }
    const { error: completeError } = await supabase.rpc('complete_signal_receipt', {
      p_signal_id: signal.id,
      p_receipt_attempt: claim.receipt_attempt,
      p_status: 'permanent_failure',
      p_error: receiptCode,
    });
    if (completeError) return json({ error: 'receipt completion failed' }, 500);
    return json({ status: 'failed', code: receiptCode });
  }

  // This RPC atomically claims the outbox row and returns only the fixed
  // insertion-time recipient if the original membership is still current.
  const { data, error } = await supabase.rpc('claim_signal_notification', {
    p_signal_id: signal.id,
  });
  if (error) {
    console.error('DELIVERY CLAIM failed:', error.message);
    return json({ error: 'delivery claim failed' }, 500);
  }
  const claim = firstRow(data as DeliveryClaim[] | null);
  if (!claim) return json({ status: 'noop', reason: 'not due or already claimed' });

  if (!claim.push_token) {
    const { error: skipError } = await supabase.rpc('complete_signal_delivery', {
      p_signal_id: signal.id,
      p_attempt: claim.attempt,
      p_status: 'skipped',
      p_error: 'recipient has no push token',
    });
    if (skipError) return json({ error: 'skip completion failed' }, 500);
    return json({ status: 'skip', reason: 'no push token' });
  }

  let response: Response;
  try {
    response = await expoRequest('https://exp.host/--/api/v2/push/send', {
      to: claim.push_token,
      title: 'Hearth',
      body: bodyFor(claim.signal_type),
      data: {
        url: 'hearth://',
        recipientUserId: claim.recipient_user_id,
        coupleId: claim.couple_id,
        signalId: claim.signal_id,
      },
      sound: null,
      channelId: 'default',
    });
  } catch (requestError) {
    await supabase.rpc('release_signal_notification', {
      p_signal_id: signal.id,
      p_attempt: claim.attempt,
      p_error: `push network failure: ${String(requestError)}`,
    });
    return json({ error: 'push service unavailable' }, 503);
  }

  let responseBody: { data?: ExpoTicket | ExpoTicket[] } = {};
  try {
    responseBody = await response.json();
  } catch {
    await supabase.rpc('release_signal_notification', {
      p_signal_id: signal.id,
      p_attempt: claim.attempt,
      p_error: `invalid push response: HTTP ${response.status}`,
    });
    return json({ error: 'invalid push response' }, 503);
  }

  const ticket = Array.isArray(responseBody.data) ? responseBody.data[0] : responseBody.data;
  if (!response.ok || ticket?.status === 'error') {
    const errorCode = ticket?.details?.error ?? `HTTP_${response.status}`;
    const transient =
      response.status === 429 || response.status >= 500 || errorCode === 'MessageRateExceeded';
    if (transient) {
      await supabase.rpc('release_signal_notification', {
        p_signal_id: signal.id,
        p_attempt: claim.attempt,
        p_error: errorCode,
      });
      return json({ error: 'push temporarily rejected', code: errorCode }, 503);
    }

    if (errorCode === 'DeviceNotRegistered') {
      const { error: invalidateError } = await supabase.rpc('invalidate_push_token', {
        p_user_id: claim.recipient_user_id,
        p_token: claim.push_token,
        p_epoch: claim.push_epoch,
      });
      if (invalidateError) {
        await supabase.rpc('release_signal_notification', {
          p_signal_id: signal.id,
          p_attempt: claim.attempt,
          p_error: `token invalidation failed: ${invalidateError.message}`,
        });
        return json({ error: 'token invalidation failed' }, 500);
      }
    }
    const { error: completeError } = await supabase.rpc('complete_signal_delivery', {
      p_signal_id: signal.id,
      p_attempt: claim.attempt,
      p_status: 'permanent_failure',
      p_error: errorCode,
    });
    if (completeError) return json({ error: 'delivery completion failed' }, 500);
    return json({ status: 'failed', code: errorCode });
  }

  if (!ticket?.id) {
    await supabase.rpc('release_signal_notification', {
      p_signal_id: signal.id,
      p_attempt: claim.attempt,
      p_error: 'Expo accepted without a ticket id',
    });
    return json({ error: 'missing push ticket' }, 503);
  }

  const { error: ticketError } = await supabase.rpc('record_signal_ticket', {
    p_signal_id: signal.id,
    p_attempt: claim.attempt,
    p_ticket_id: ticket.id,
    p_push_token: claim.push_token,
    p_push_epoch: claim.push_epoch,
  });
  if (ticketError) {
    console.error('TICKET PERSIST failed:', ticketError.message);
    return json({ error: 'ticket persistence failed' }, 500);
  }

  return json({ status: 'accepted', ticketId: ticket.id });
});
