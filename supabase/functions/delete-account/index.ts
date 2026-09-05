import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let payload: { confirmation?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'confirmation required' }, 400);
  }
  if (payload.confirmation !== 'DELETE MY ACCOUNT') {
    return json({ error: 'confirmation required' }, 400);
  }

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

  const { data: paths, error: prepareError } = await userClient.rpc('prepare_account_deletion');
  if (prepareError) {
    console.error('account deletion preparation failed', prepareError.message);
    return json({ error: 'deletion unavailable' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ownedPaths = Array.isArray(paths)
    ? paths.filter((path): path is string => typeof path === 'string' && path.split('/')[1] === userData.user.id)
    : [];
  if (ownedPaths.length > 0) {
    const { error: removeError } = await admin.storage.from('daily-media').remove(ownedPaths);
    // leave_couple already queued these same objects for retry. A transient
    // storage failure must not prevent identity/session revocation.
    if (removeError) console.error('account deletion media removal deferred', removeError.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id, false);
  if (deleteError) {
    console.error('account admin deletion failed', deleteError.message);
    return json({ error: 'deletion unavailable' }, 503);
  }
  return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
});
