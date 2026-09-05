import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MediaObject = { id: string; path: string; medium: 'voice' | 'photo' };

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = bearerToken(request);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token) return json({ error: 'authentication required' }, 401);
  if (!supabaseUrl || !publicKey || !serviceRoleKey) return json({ error: 'server configuration' }, 500);

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'authentication required' }, 401);

  const { data, error } = await userClient.rpc('request_account_export');
  if (error || !data || typeof data !== 'object') {
    console.error('account export RPC failed', error?.message ?? 'empty result');
    return json({ error: 'export unavailable' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const record = { ...(data as Record<string, unknown>) };
  const media = Array.isArray(record._media_objects) ? record._media_objects as MediaObject[] : [];
  delete record._media_objects;

  const mediaFiles = await Promise.all(media.map(async (item) => {
    // The canonical path is couple/user/medium/date/id.ext. Never sign a path
    // whose author segment is not the authenticated requester.
    if (typeof item.path !== 'string' || item.path.split('/')[1] !== userData.user.id) return null;
    const { data: signed, error: signedError } = await admin.storage
      .from('daily-media')
      .createSignedUrl(item.path, 600);
    if (signedError) {
      console.error('account export media signing failed', item.id, signedError.message);
      return { id: item.id, medium: item.medium, available: false };
    }
    return {
      id: item.id,
      medium: item.medium,
      available: true,
      download_url: signed.signedUrl,
      expires_in_seconds: 600,
    };
  }));

  record.media_files = mediaFiles.filter(Boolean);
  const date = new Date().toISOString().slice(0, 10);
  return json(record, 200, {
    'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="hearth-export-${date}.json"`,
  });
});
