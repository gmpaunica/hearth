import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CleanupJob = {
  job_id: string;
  bucket_id: string;
  object_path: string;
  attempt: number;
};

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

  let payload: { action?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad payload' }, 400);
  }
  if (payload.action !== 'cleanup') return json({ error: 'bad payload' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server configuration' }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('claim_daily_media_cleanup_jobs', { p_limit: 25 });
  if (error) {
    console.error('cleanup claim failed', error.message);
    return json({ error: 'cleanup claim failed' }, 500);
  }

  const jobs = (data ?? []) as CleanupJob[];
  let completed = 0;
  let released = 0;
  for (const job of jobs) {
    const { error: removeError } = await supabase.storage
      .from(job.bucket_id)
      .remove([job.object_path]);
    if (removeError) {
      released += 1;
      const { error: releaseError } = await supabase.rpc('release_daily_media_cleanup_job', {
        p_job_id: job.job_id,
        p_attempt: job.attempt,
        p_error: removeError.message,
      });
      if (releaseError) console.error('cleanup release failed', releaseError.message);
      continue;
    }
    const { error: completeError } = await supabase.rpc('complete_daily_media_cleanup_job', {
      p_job_id: job.job_id,
      p_attempt: job.attempt,
    });
    if (completeError) {
      console.error('cleanup completion failed', completeError.message);
    } else {
      completed += 1;
    }
  }

  return json({ claimed: jobs.length, completed, released });
});
