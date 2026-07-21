// End-to-end live verification of Hearth's Supabase backend (Phases 4 & 5).
//
//   node scripts/live-test.mjs
//
// Exercises the real project: anonymous auth, invite-code pairing, RLS
// isolation between couples, the "home is full" guard, and realtime delivery
// of signals + responses. Requires outbound access to *.supabase.co. Config
// comes from EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY, falling
// back to the committed publishable dev values.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gtdigidqsczptqpbplar.supabase.co';
const KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';

const mk = () => createClient(URL, KEY, { auth: { persistSession: false } });
let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  ✗ ${m}`);
};
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/** Resolve once a realtime channel is SUBSCRIBED (or reject on timeout). */
function subscribed(channel) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('subscribe timeout')), 8000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

/** Wait for the first realtime payload matching `pred`, else null after `ms`. */
function waitFor(getBox, ms = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const v = getBox();
      if (v) return resolve(v);
      if (Date.now() - started > ms) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function signIn(client, name) {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`${name} sign-in: ${error.message}`);
  return data.user.id;
}

async function main() {
  const A = mk();
  const B = mk();
  const C = mk();
  const D = mk();

  console.log('Auth');
  const [aId, bId, cId] = await Promise.all([
    signIn(A, 'A'),
    signIn(B, 'B'),
    signIn(C, 'C'),
  ]);
  await signIn(D, 'D');
  ok(`anonymous sessions: A=${aId.slice(0, 8)} B=${bId.slice(0, 8)}`);

  console.log('Pairing');
  const created = await A.rpc('create_couple');
  if (created.error) throw new Error(`create_couple: ${created.error.message}`);
  const code = created.data.invite_code;
  const coupleId = created.data.id;
  assert(!!code && code.length === 6, `A created home, invite code ${code}`);

  const joined = await B.rpc('join_couple', { code });
  if (joined.error) throw new Error(`join_couple: ${joined.error.message}`);
  assert(joined.data.member_b === bId, 'B joined; member_b is B');

  // Full-home guard: a third person can't join a full couple.
  const overflow = await D.rpc('join_couple', { code });
  assert(!!overflow.error, `full-home guard rejects a third joiner (${overflow.error?.message ?? 'no error!'})`);

  // Bad code rejected.
  const bogus = await D.rpc('join_couple', { code: 'ZZZZZZ' });
  assert(!!bogus.error, `unknown code rejected (${bogus.error?.message ?? 'no error!'})`);

  // C makes their own separate home for the RLS cross-couple test.
  const cCouple = await C.rpc('create_couple');
  if (cCouple.error) throw new Error(`C create_couple: ${cCouple.error.message}`);

  console.log('Realtime');
  // B listens for signals; A listens for responses.
  let gotSignal = null;
  let gotResponse = null;
  const bChan = B.channel('t-signals').on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'signals', filter: `couple_id=eq.${coupleId}` },
    (p) => (gotSignal = p.new),
  );
  const aChan = A.channel('t-responses').on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'responses' },
    (p) => (gotResponse = p.new),
  );
  await Promise.all([subscribed(bChan), subscribed(aChan)]);
  ok('both realtime channels subscribed');

  // A leaves a fireplace signal.
  const sig = await A.from('signals')
    .insert({ couple_id: coupleId, from_user: aId, type: 'fireplace' })
    .select()
    .single();
  if (sig.error) throw new Error(`signal insert: ${sig.error.message}`);
  ok('A inserted a fireplace signal');

  const rxSignal = await waitFor(() => gotSignal);
  assert(rxSignal?.type === 'fireplace', "B received A's signal via realtime");

  // RLS: C must not be able to read A+B's signal at all.
  const cRead = await C.from('signals').select('*').eq('couple_id', coupleId);
  assert((cRead.data ?? []).length === 0, 'RLS: outsider C cannot read the couple’s signals');

  // B answers "Sit beside them".
  const resp = await B.from('responses')
    .insert({ signal_id: sig.data.id, from_user: bId, choice: 'Sit beside them' })
    .select()
    .single();
  if (resp.error) throw new Error(`response insert: ${resp.error.message}`);
  ok('B inserted a response');

  const rxResp = await waitFor(() => gotResponse);
  assert(rxResp?.choice === 'Sit beside them', "A received B's response via realtime");

  // Reconciliation resolve.
  const resolve = await A.from('signals')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', sig.data.id)
    .select()
    .single();
  assert(!resolve.error && !!resolve.data.resolved_at, 'signal resolved (reconciliation)');

  await Promise.all([B.removeChannel(bChan), A.removeChannel(aChan)]);

  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(2);
});
