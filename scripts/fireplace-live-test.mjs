// Live authenticated verification for the stackable fireplace migration.
// Run with: node scripts/fireplace-live-test.mjs
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? 'https://gtdigidqsczptqpbplar.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? 'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';

const client = () => createClient(URL, KEY, { auth: { persistSession: false } });
const A = client();
const B = client();
const outsider = client();
const clients = [A, B, outsider];

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

async function start(target, pathway, options = {}) {
  return rpc(target, 'start_interaction', {
    p_type: 'fireplace',
    p_pathway: pathway,
    p_timezone: 'Europe/Brussels',
    p_sentence: options.sentence ?? null,
    p_return_at: options.returnAt ?? null,
    p_connect_to_signal_id: options.connectTo ?? null,
  });
}

async function respond(target, signalId, action, options = {}) {
  return rpc(target, 'respond_to_interaction', {
    p_signal_id: signalId,
    p_action: action,
    p_sentence: options.sentence ?? null,
    p_return_at: options.returnAt ?? null,
    p_move_to_interaction: options.move ?? false,
  });
}

async function cleanup() {
  for (const target of clients) {
    try {
      await target.rpc('prepare_sign_out');
      await target.auth.signOut({ scope: 'local' });
    } catch {
      // A failed assertion must not hide the original failure.
    }
  }
}

async function main() {
  const [aId, bId] = await Promise.all([signIn(A), signIn(B), signIn(outsider)]);
  const home = await rpc(A, 'create_couple');
  await rpc(B, 'join_couple', { code: home.invite_code });
  await rpc(outsider, 'create_couple');

  const stay = await start(A, 'stay_close', { sentence: 'Please sit with me.' });
  const heard = await start(A, 'hear_first', { sentence: 'I need this heard.' });
  const apology = await start(A, 'apologize', { sentence: 'I am sorry for shutting down.' });
  const talk = await start(B, 'talk_through', { connectTo: stay });
  const hurt = await start(B, 'acknowledge_hurt');
  const moreTime = await start(B, 'more_time', {
    returnAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  let snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.filter((signal) => signal.resolved_at == null).length, 6);
  assert.equal(snapshot.signals.filter((signal) => signal.from_user === aId).length, 3);
  assert.equal(snapshot.signals.filter((signal) => signal.from_user === bId).length, 3);
  const stayRow = snapshot.signals.find((signal) => signal.id === stay);
  const talkRow = snapshot.signals.find((signal) => signal.id === talk);
  assert.equal(stayRow.group_id, talkRow.group_id);
  assert.equal(
    snapshot.groups.find((group) => group.id === stayRow.group_id).signal_count,
    2,
  );
  assert.notEqual(snapshot.signals.find((signal) => signal.id === heard).group_id, stayRow.group_id);

  await respond(B, stay, 'sit_beside', { sentence: 'I am here.' });
  await respond(B, heard, 'ready_to_listen', { sentence: 'What I heard is that you felt alone.' });
  await respond(B, apology, 'read');
  await respond(A, talk, 'talk_now');
  await respond(A, hurt, 'acknowledge');
  // The compatibility movement flag is deliberately true here. The server
  // allowlist says this action does not move, so A must remain at hurt.
  await respond(A, moreTime, 'acknowledge', { move: true });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.filter((signal) => signal.resolved_at == null).length, 6);
  assert.equal(snapshot.presence.find((row) => row.user_id === aId && row.is_current).signal_id, hurt);
  assert.equal(snapshot.presence.find((row) => row.user_id === bId && row.is_current).signal_id, heard);

  // Ordinary presence is quiet and idempotent. Moving to an older interaction
  // changes only A, never moment activity, and a repeated move performs no write.
  const talkActivity = snapshot.signals.find((signal) => signal.id === talk).latest_activity_at;
  await rpc(A, 'move_to_interaction', { p_signal_id: talk });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.presence.find((row) => row.user_id === aId && row.is_current).signal_id, talk);
  assert.equal(snapshot.presence.find((row) => row.user_id === bId && row.is_current).signal_id, heard);
  assert.equal(snapshot.signals.find((signal) => signal.id === talk).latest_activity_at, talkActivity);
  const firstMoveAt = snapshot.presence.find(
    (row) => row.user_id === aId && row.signal_id === talk,
  ).updated_at;
  await rpc(A, 'move_to_interaction', { p_signal_id: talk });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(
    snapshot.presence.find((row) => row.user_id === aId && row.signal_id === talk).updated_at,
    firstMoveAt,
  );
  await rpc(A, 'leave_interaction', { p_signal_id: talk });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.presence.some((row) => row.user_id === aId && row.is_current), false);
  assert.equal(snapshot.presence.find((row) => row.user_id === bId && row.is_current).signal_id, heard);
  const firstLeaveAt = snapshot.presence.find(
    (row) => row.user_id === aId && row.signal_id === talk,
  ).updated_at;
  await rpc(A, 'leave_interaction', { p_signal_id: talk });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(
    snapshot.presence.find((row) => row.user_id === aId && row.signal_id === talk).updated_at,
    firstLeaveAt,
  );
  assert.equal(snapshot.signals.find((signal) => signal.id === talk).latest_activity_at, talkActivity);

  await rpc(A, 'set_fireplace_sentence', {
    p_signal_id: apology,
    p_sentence: 'I want to repair this with you.',
  });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  const sentenceActivity = snapshot.signals.find((signal) => signal.id === apology).latest_activity_at;
  const sentenceUpdatedAt = snapshot.participants.find(
    (row) => row.signal_id === apology && row.user_id === aId,
  ).updated_at;
  await rpc(A, 'set_fireplace_sentence', {
    p_signal_id: apology,
    p_sentence: 'I want to repair this with you.',
  });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.find((signal) => signal.id === apology).latest_activity_at, sentenceActivity);
  assert.equal(
    snapshot.participants.find((row) => row.signal_id === apology && row.user_id === aId).updated_at,
    sentenceUpdatedAt,
  );
  const longSentence = await A.rpc('set_fireplace_sentence', {
    p_signal_id: apology,
    p_sentence: 'x'.repeat(241),
  });
  assert.match(longSentence.error?.message ?? '', /240/);
  await rpc(A, 'set_fireplace_sentence', { p_signal_id: apology, p_sentence: null });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(
    snapshot.participants.find((row) => row.signal_id === apology && row.user_id === aId).sentence,
    null,
  );

  // A scheduled actor cannot skip the explicit return step.
  const earlyContinue = await B.rpc('complete_fireplace_action', { p_signal_id: moreTime });
  assert.match(earlyContinue.error?.message ?? '', /return to this moment/i);
  assert.equal(await rpc(B, 'return_to_fireplace', { p_signal_id: moreTime }), true);
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  const returnedAt = snapshot.sessions.find((session) => session.signal_id === moreTime).returned_at;
  assert.equal(await rpc(B, 'return_to_fireplace', { p_signal_id: moreTime }), false);
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.sessions.find((session) => session.signal_id === moreTime).returned_at, returnedAt);
  assert.equal(snapshot.presence.find((row) => row.user_id === bId && row.is_current).signal_id, moreTime);
  assert.equal(snapshot.presence.some((row) => row.user_id === aId && row.is_current), false);
  await Promise.all([
    rpc(A, 'complete_fireplace_action', { p_signal_id: moreTime }),
    rpc(B, 'complete_fireplace_action', { p_signal_id: moreTime }),
  ]);
  await Promise.all([
    rpc(A, 'set_fireplace_readiness', { p_signal_id: moreTime, p_readiness: 'reconnected' }),
    rpc(B, 'set_fireplace_readiness', { p_signal_id: moreTime, p_readiness: 'reconnected' }),
  ]);

  await Promise.all([
    rpc(A, 'complete_fireplace_action', { p_signal_id: stay }),
    rpc(B, 'complete_fireplace_action', { p_signal_id: stay }),
  ]);
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  const stayActivityBeforeReadiness = snapshot.signals.find(
    (signal) => signal.id === stay,
  ).latest_activity_at;
  assert.equal(
    await rpc(A, 'set_fireplace_readiness', { p_signal_id: stay, p_readiness: 'reconnected' }),
    false,
  );
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(
    snapshot.signals.find((signal) => signal.id === stay).latest_activity_at,
    stayActivityBeforeReadiness,
  );
  const privateSnapshot = await rpc(B, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(
    privateSnapshot.participants.find((row) => row.signal_id === stay && row.user_id === aId).readiness,
    null,
  );
  assert.equal(
    await rpc(B, 'set_fireplace_readiness', { p_signal_id: stay, p_readiness: 'reconnected' }),
    true,
  );
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  const completedAt = snapshot.sessions.find((session) => session.signal_id === stay).completed_at;
  assert.equal(
    await rpc(B, 'set_fireplace_readiness', { p_signal_id: stay, p_readiness: 'reconnected' }),
    true,
  );
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.sessions.find((session) => session.signal_id === stay).completed_at, completedAt);

  snapshot = await rpc(B, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.find((signal) => signal.id === talk).resolved_at, null);
  await rpc(B, 'answer_related_settlement', {
    p_signal_id: talk,
    p_completed_signal_id: stay,
    p_settled: false,
  });
  snapshot = await rpc(B, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.find((signal) => signal.id === talk).resolved_at, null);

  const stayAgain = await start(A, 'stay_close');
  await respond(B, stayAgain, 'send_reassurance', { sentence: 'We can take this slowly.' });
  await Promise.all([
    rpc(A, 'complete_fireplace_action', { p_signal_id: stayAgain }),
    rpc(B, 'complete_fireplace_action', { p_signal_id: stayAgain }),
  ]);
  await Promise.all([
    rpc(A, 'set_fireplace_readiness', { p_signal_id: stayAgain, p_readiness: 'reconnected' }),
    rpc(B, 'set_fireplace_readiness', { p_signal_id: stayAgain, p_readiness: 'reconnected' }),
  ]);
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  const stayOutcomes = snapshot.sessions.filter(
    (session) => session.pathway === 'stay_close' && session.phase === 'completed',
  );
  assert.equal(stayOutcomes.length, 2);
  for (const session of stayOutcomes) {
    const expiry = Date.parse(session.expires_at);
    assert.ok(expiry > Date.now() && expiry <= Date.now() + 25 * 60 * 60 * 1000);
  }

  const wrongAuthor = await B.rpc('close_authored_interaction', { p_signal_id: heard });
  assert.ok(wrongAuthor.error);
  await rpc(A, 'close_authored_interaction', { p_signal_id: heard });
  snapshot = await rpc(A, 'get_interaction_snapshot', { p_couple_id: home.id });
  assert.equal(snapshot.signals.find((signal) => signal.id === hurt).resolved_at, null);

  const outsiderSnapshot = await outsider.rpc('get_interaction_snapshot', { p_couple_id: home.id });
  assert.ok(outsiderSnapshot.error);
  const outsiderRead = await outsider.from('signals').select('id').eq('couple_id', home.id);
  assert.equal(outsiderRead.data?.length ?? 0, 0);

  console.log(JSON.stringify({
    ok: true,
    sixOpen: true,
    independentPresence: true,
    idempotentPresence: true,
    serverDerivedMovement: true,
    editableSentences: true,
    privateReadiness: true,
    connectedIndependent: true,
    explicitIdempotentReturn: true,
    oneWayCompletion: true,
    repeatedOutcomeCount: stayOutcomes.length,
    crossCoupleRls: true,
  }));
}

try {
  await main();
} finally {
  await cleanup();
}
