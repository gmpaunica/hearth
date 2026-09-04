// Long-running offline-fallback proof. No client due RPC is invoked: pg_cron
// alone must finish joined Romantic closeness after its fixed 20-minute due.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? 'https://gtdigidqsczptqpbplar.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? 'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';
const makeClient = () => createClient(URL, KEY, { auth: { persistSession: false } });
const A = makeClient();
const B = makeClient();

async function rpc(target, name, args = {}) {
  const result = await target.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}

async function signIn(target) {
  const { data, error } = await target.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  await Promise.all([signIn(A), signIn(B)]);
  const home = await rpc(A, 'create_couple');
  await rpc(B, 'join_couple', { code: home.invite_code });
  const signalId = await rpc(A, 'start_moment', {
    p_type: 'romantic', p_intent: null, p_note: null, p_scheduled_for: null,
  });
  await rpc(B, 'respond_to_moment', {
    p_signal_id: signalId,
    p_action: 'come_close',
    p_note: null,
    p_scheduled_for: null,
  });
  const initial = await rpc(A, 'get_moment_snapshot_v2');
  const startedAt = Date.parse(initial.active.shared_started_at);
  const dueAt = Date.parse(initial.active.shared_due_at);
  assert.equal(dueAt - startedAt, 20 * 60 * 1000);

  const deadline = dueAt + 90_000;
  let terminal = null;
  while (Date.now() <= deadline) {
    const current = await rpc(A, 'get_moment_snapshot_v2');
    terminal = current.completion_events.find((event) => event.signal_id === signalId) ?? null;
    if (!current.active && terminal) break;
    await wait(5_000);
  }
  assert.ok(terminal, 'pg_cron should emit the offline expiry completion event');
  assert.equal(terminal.terminal_reason, 'romantic_elapsed');
  assert.equal(terminal.payoff_kind, 'destination');
  assert.ok(Date.parse(terminal.occurred_at) >= dueAt);
  console.log(JSON.stringify({
    ok: true,
    signalId,
    dueAt: new Date(dueAt).toISOString(),
    completedAt: terminal.occurred_at,
    completedBy: 'pg_cron',
  }));
} finally {
  for (const target of [A, B]) {
    try {
      await target.rpc('prepare_sign_out');
      await target.auth.signOut({ scope: 'local' });
    } catch {
      // Keep the primary assertion.
    }
  }
}
