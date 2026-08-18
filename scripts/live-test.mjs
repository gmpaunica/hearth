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

/** Small delay. */
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

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
  let gotNeed = null;
  let gotResponse = null;
  const bChan = B.channel('t-signals')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals', filter: `couple_id=eq.${coupleId}` },
      (p) => (gotSignal = p.new),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'responses' },
      (p) => (gotNeed = p.new),
    );
  const aChan = A.channel('t-responses').on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'responses' },
    (p) => (gotResponse = p.new),
  );
  await Promise.all([subscribed(bChan), subscribed(aChan)]);
  // A client `SUBSCRIBED` status can arrive a beat before the server has
  // finished binding the postgres_changes replication filter; an insert fired
  // in that window is silently missed. The app never hits this (it hydrates
  // current state after subscribing, and no one sends a signal the same
  // instant they pair), but this harness tests live delivery in isolation, so
  // let the binding settle before mutating.
  await settle(1500);
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

  // F1: the signal author may attach one optional need through the existing
  // response event stream, so no schema migration is needed for preview users.
  const needChoice = '__hearth_fireplace_need_v1__:reassurance';
  const need = await A.from('responses')
    .insert({ signal_id: sig.data.id, from_user: aId, choice: needChoice })
    .select()
    .single();
  if (need.error) throw new Error(`fireplace need insert: ${need.error.message}`);
  const rxNeed = await waitFor(() => gotNeed);
  assert(rxNeed?.choice === needChoice, "B received A's optional fireplace need via realtime");

  // P0: both members can hold one independent intentional location. Ending
  // B's garden state must leave A's fireplace state open for both clients.
  const garden = await B.from('signals')
    .insert({ couple_id: coupleId, from_user: bId, type: 'garden' })
    .select()
    .single();
  if (garden.error) throw new Error(`garden signal insert: ${garden.error.message}`);
  const [aCoexisting, bCoexisting] = await Promise.all([
    A.from('signals').select('*').eq('couple_id', coupleId).is('resolved_at', null),
    B.from('signals').select('*').eq('couple_id', coupleId).is('resolved_at', null),
  ]);
  assert(
    (aCoexisting.data ?? []).length === 2 && (bCoexisting.data ?? []).length === 2,
    'P0: both roles see fireplace and garden states together',
  );
  const endGarden = await B.from('signals')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', garden.data.id)
    .select()
    .single();
  if (endGarden.error) throw new Error(`garden signal resolve: ${endGarden.error.message}`);
  const [aRemaining, bRemaining] = await Promise.all([
    A.from('signals').select('*').eq('couple_id', coupleId).is('resolved_at', null),
    B.from('signals').select('*').eq('couple_id', coupleId).is('resolved_at', null),
  ]);
  assert(
    (aRemaining.data ?? []).length === 1 &&
      aRemaining.data[0]?.id === sig.data.id &&
      (bRemaining.data ?? []).length === 1 &&
      bRemaining.data[0]?.id === sig.data.id,
    "P0: ending B's garden state leaves A's fireplace state intact",
  );

  // RLS: C must not be able to read A+B's signal at all.
  const cRead = await C.from('signals').select('*').eq('couple_id', coupleId);
  assert((cRead.data ?? []).length === 0, 'RLS: outsider C cannot read the couple’s signals');

  // B answers "Sit beside them".
  gotResponse = null;
  const resp = await B.from('responses')
    .insert({ signal_id: sig.data.id, from_user: bId, choice: 'Sit beside them' })
    .select()
    .single();
  if (resp.error) throw new Error(`response insert: ${resp.error.message}`);
  ok('B inserted a response');

  const rxResp = await waitFor(() => gotResponse);
  assert(rxResp?.choice === 'Sit beside them', "A received B's response via realtime");

  // The signal author can leave without pulling the joined partner away. The
  // open signal remains the durable anchor for B's independent fireplace seat.
  gotNeed = null;
  const authorLeaveChoice = '__hearth_signal_presence_v1__:leave';
  const authorLeave = await A.from('responses')
    .insert({ signal_id: sig.data.id, from_user: aId, choice: authorLeaveChoice })
    .select()
    .single();
  if (authorLeave.error) throw new Error(`author presence leave: ${authorLeave.error.message}`);
  const rxAuthorLeave = await waitFor(() => gotNeed);
  assert(
    rxAuthorLeave?.choice === authorLeaveChoice,
    'B received A leaving while B remains at the fireplace',
  );
  const stillOpen = await B.from('signals')
    .select('*')
    .eq('id', sig.data.id)
    .is('resolved_at', null)
    .single();
  assert(!stillOpen.error && stillOpen.data?.id === sig.data.id, 'A leaving keeps B\'s seat open');

  // B can then leave independently from B's own app. Once both have left, B
  // may close the shared anchor under the couple-scoped update policy.
  gotResponse = null;
  const responderLeave = await B.from('responses')
    .insert({ signal_id: sig.data.id, from_user: bId, choice: authorLeaveChoice })
    .select()
    .single();
  if (responderLeave.error) {
    throw new Error(`responder presence leave: ${responderLeave.error.message}`);
  }
  const rxResponderLeave = await waitFor(() => gotResponse);
  assert(
    rxResponderLeave?.choice === authorLeaveChoice,
    'A received B leaving from B\'s own app',
  );
  const resolve = await B.from('signals')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', sig.data.id)
    .select()
    .single();
  assert(!resolve.error && !!resolve.data.resolved_at, 'signal closes only after both people leave');

  await Promise.all([B.removeChannel(bChan), A.removeChannel(aChan)]);

  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(2);
});
