// Authenticated two-account verification for the timeless Moments state machine.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gtdigidqsczptqpbplar.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';
const makeClient = () => createClient(URL, KEY, { auth: { persistSession: false } });
const A = makeClient();
const B = makeClient();
const outsider = makeClient();
const clients = [A, B, outsider];
const future = new Date(Date.now() + 86_400_000).toISOString();

async function rpc(client, name, args = {}) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}

async function expectError(client, name, args, pattern) {
  const result = await client.rpc(name, args);
  assert.ok(result.error, `${name} should fail`);
  if (pattern) assert.match(result.error.message, pattern);
}

const start = (client, type, intent = null, note = null) => rpc(client, 'start_moment', {
  p_type: type,
  p_intent: intent,
  p_note: note,
  p_scheduled_for: future,
});

const respond = (client, signalId, action, note = null) => rpc(client, 'respond_to_moment', {
  p_signal_id: signalId,
  p_action: action,
  p_note: note,
  p_scheduled_for: future,
});

const respondRest = (client, signalId, action, payload) => rpc(client, 'respond_to_rest_moment', {
  p_signal_id: signalId,
  p_action: action,
  p_payload: payload,
});

const snapshot = (client) => rpc(client, 'get_moment_snapshot_v2');

async function signIn(client) {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}

async function cleanup() {
  for (const client of clients) {
    try {
      await client.rpc('prepare_sign_out');
      await client.auth.signOut({ scope: 'local' });
    } catch {
      // Keep the original assertion error.
    }
  }
}

function completionFor(state, signalId) {
  return state.completion_events.find((event) => event.signal_id === signalId);
}

async function assertOpen(client, signalId, actionKind) {
  const state = await snapshot(client);
  assert.equal(state.active?.signal_id, signalId);
  assert.equal(state.active?.scheduled_for ?? null, null);
  assert.equal(state.active?.scheduled_by_user_id ?? null, null);
  assert.equal(state.active?.shared_due_at ?? null, null);
  assert.equal(state.personal_action.kind, actionKind);
  return state;
}

async function assertPositiveResolution(owner, partner, signalId, destination, ownerId) {
  await expectError(partner, 'resolve_moment', { p_signal_id: signalId }, /creator/);
  const completionId = await rpc(owner, 'resolve_moment', { p_signal_id: signalId });
  assert.ok(completionId, `${destination} should emit a completion`);
  assert.equal(await rpc(owner, 'resolve_moment', { p_signal_id: signalId }), completionId);
  for (const client of [owner, partner]) {
    const state = await snapshot(client);
    assert.equal(state.active, null);
    const event = completionFor(state, signalId);
    assert.equal(event?.id, completionId);
    assert.equal(event?.destination, destination);
    assert.equal(event?.author_id, ownerId);
    assert.equal(event?.payoff_kind, 'heart');
  }
  return completionId;
}

async function completeFireplace(owner, partner, signalId, ownerId, reverseFirst = false) {
  await assertOpen(owner, signalId, 'confirm_fireplace');
  await assertOpen(partner, signalId, 'confirm_fireplace');
  assert.equal(await rpc(owner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true }), null);
  let ownerView = await snapshot(owner);
  let partnerView = await snapshot(partner);
  assert.equal(ownerView.participants.find((row) => row.user_id === ownerId)?.readiness, true);
  assert.equal(partnerView.participants.find((row) => row.user_id === ownerId)?.readiness, true);
  let completionId;
  if (reverseFirst) {
    assert.equal(await rpc(owner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: false }), null);
    ownerView = await snapshot(owner);
    assert.equal(ownerView.participants.find((row) => row.user_id === ownerId)?.readiness, false);
    assert.equal(await rpc(partner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true }), null);
    completionId = await rpc(owner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true });
  } else {
    completionId = await rpc(partner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true });
  }
  assert.ok(completionId);
  assert.equal(await rpc(owner, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true }), null);
  const finalState = await snapshot(owner);
  assert.equal(finalState.active, null);
  const event = completionFor(finalState, signalId);
  assert.equal(event?.author_id, ownerId);
  assert.equal(event?.destination, 'fireplace');
  assert.equal(event?.payoff_kind, 'heart');
}

async function main() {
  const [aId, bId] = await Promise.all([signIn(A), signIn(B), signIn(outsider)]);
  const home = await rpc(A, 'create_couple');
  await rpc(B, 'join_couple', { code: home.invite_code });
  await rpc(outsider, 'create_couple');

  // One immutable home timezone gives both phones the same day and aggregate.
  assert.equal(await rpc(A, 'initialize_home_timezone', { p_timezone: 'Europe/Brussels' }), 'Europe/Brussels');
  assert.equal(await rpc(A, 'initialize_home_timezone', { p_timezone: 'Europe/Brussels' }), 'Europe/Brussels');
  await expectError(A, 'initialize_home_timezone', { p_timezone: 'Mars/Olympus' }, /Unknown IANA/);
  await expectError(A, 'initialize_home_timezone', { p_timezone: 'UTC' }, /already initialized/);
  await expectError(B, 'initialize_home_timezone', { p_timezone: 'Europe/Brussels' }, /Only member A/);
  let ritualA = await rpc(A, 'get_daily_ritual_snapshot');
  let ritualB = await rpc(B, 'get_daily_ritual_snapshot');
  assert.equal(ritualA.home_timezone, 'Europe/Brussels');
  assert.equal(ritualB.home_date, ritualA.home_date);
  assert.equal(ritualA.available_units, 2);
  assert.equal(ritualA.completed_units, 0);
  assert.equal(ritualA.fire_state, ritualA.after_evening_check ? 'low' : 'steady');
  const firstDrawing = await A.from('drawings').insert({
    couple_id: home.id, from_user: aId, day: ritualA.home_date, grid: '0',
  });
  if (firstDrawing.error) throw firstDrawing.error;
  ritualA = await rpc(A, 'get_daily_ritual_snapshot');
  assert.equal(ritualA.completed_units, 1);
  assert.equal(ritualA.fire_state, 'warming');
  const secondDrawing = await B.from('drawings').insert({
    couple_id: home.id, from_user: bId, day: ritualA.home_date, grid: '1',
  });
  if (secondDrawing.error) throw secondDrawing.error;
  ritualB = await rpc(B, 'get_daily_ritual_snapshot');
  assert.equal(ritualB.completed_units, 2);
  assert.equal(ritualB.fire_state, 'glowing');

  // Fireplace: all destination-specific acceptances and a reversible readiness pair.
  for (const [index, [intent, action]] of [
    ['stay_close', 'come_sit'],
    ['talk_through', 'talk_by_fire'],
    ['hear_first', 'listen_by_fire'],
    ['apologize', 'hear_them_out'],
  ].entries()) {
    const signalId = await start(A, 'fireplace', intent, index === 0 ? 'One calm sentence.' : null);
    await assertOpen(A, signalId, 'wait');
    await assertOpen(B, signalId, 'respond_fireplace');
    const actionId = await respond(B, signalId, action);
    assert.equal(await respond(B, signalId, action), actionId);
    await completeFireplace(A, B, signalId, aId, index === 0);
  }

  // Fireplace Not now is timeless, note-bearing, and later joinable.
  let signalId = await start(A, 'fireplace', 'stay_close');
  const deferredId = await respond(B, signalId, 'not_now', 'I need a little quiet.');
  assert.equal(await respond(B, signalId, 'need_more_time', 'I need a little quiet.'), deferredId);
  await assertOpen(A, signalId, 'wait');
  await assertOpen(B, signalId, 'join_fireplace');
  await expectError(B, 'set_moment_readiness', { p_signal_id: signalId, p_ready: true }, /Both people must join/);
  const joinFireId = await rpc(B, 'join_moment', { p_signal_id: signalId });
  assert.equal(await rpc(B, 'join_moment', { p_signal_id: signalId }), joinFireId);
  await completeFireplace(A, B, signalId, aId);

  // Cancellation is creator-only, idempotent, and has no heart event.
  signalId = await start(A, 'garden');
  await expectError(B, 'cancel_moment', { p_signal_id: signalId }, /creator/);
  assert.equal(await rpc(A, 'cancel_moment', { p_signal_id: signalId }), null);
  assert.equal(await rpc(A, 'cancel_moment', { p_signal_id: signalId }), null);
  assert.equal(completionFor(await snapshot(A), signalId), undefined);

  // Garden (B owns): every response remains open until the creator returns.
  for (const [index, action] of ['give_quiet', 'leave_rose'].entries()) {
    signalId = await start(B, 'garden');
    await assertOpen(A, signalId, 'respond_garden');
    await respond(A, signalId, action);
    await assertOpen(B, signalId, 'resolve_garden');
    await assertOpen(A, signalId, 'wait');
    if (index === 0) {
      await delay(1_500);
      await assertOpen(B, signalId, 'resolve_garden');
    }
    await assertPositiveResolution(B, A, signalId, 'garden', bId);
  }

  // Sofa (A owns): all forms of care stay open until the creator feels cared for.
  for (const action of ['sit_with_them', 'bring_tea', 'send_hug']) {
    signalId = await start(A, 'sofa');
    await assertOpen(B, signalId, 'respond_sofa');
    await respond(B, signalId, action);
    await assertOpen(A, signalId, 'resolve_sofa');
    await assertOpen(B, signalId, 'wait');
    await assertPositiveResolution(A, B, signalId, 'sofa', aId);
  }

  // Table (B owns): Talk now joins; Not now remains open and joins later.
  signalId = await start(B, 'table');
  await respond(A, signalId, 'talk_now');
  await assertOpen(B, signalId, 'resolve_table');
  await assertOpen(A, signalId, 'wait');
  await assertPositiveResolution(B, A, signalId, 'table', bId);

  signalId = await start(B, 'table');
  const tableDeferredId = await respond(A, signalId, 'not_now', 'Later, gently.');
  assert.equal(await respond(A, signalId, 'talk_later', 'Later, gently.'), tableDeferredId);
  await assertOpen(B, signalId, 'wait');
  await assertOpen(A, signalId, 'join_table');
  await expectError(B, 'resolve_moment', { p_signal_id: signalId }, /Both people must join/);
  const joinTableId = await rpc(A, 'join_moment', { p_signal_id: signalId });
  assert.equal(await rpc(A, 'join_moment', { p_signal_id: signalId }), joinTableId);
  await assertOpen(B, signalId, 'resolve_table');
  await assertPositiveResolution(B, A, signalId, 'table', bId);

  // Rest (A owns): exact versioned payloads remain author-resolved.
  const restCases = [
    ['make_doodle', { version: 1, width: 12, height: 12, palette_id: 'hearth-rest-v1', cells: `0${'.'.repeat(143)}` }, 'rest_doodle'],
    ['send_visitor', { version: 1, visitor: 'frog' }, 'rest_visitor'],
    ['send_hug', { version: 1 }, 'rest_hug'],
  ];
  for (const [action, payload, canonical] of restCases) {
    signalId = await start(A, 'rest');
    await assertOpen(B, signalId, 'respond_rest');
    const eventId = await respondRest(B, signalId, action, payload);
    assert.equal(await respondRest(B, signalId, action, payload), eventId);
    const withPayload = await snapshot(A);
    const actionEvent = withPayload.current_action_events.find((event) => event.id === eventId);
    assert.equal(actionEvent?.canonical_action, canonical);
    assert.deepEqual(actionEvent?.payload, payload);
    await assertOpen(A, signalId, 'resolve_rest');
    await assertOpen(B, signalId, 'wait');
    await assertPositiveResolution(A, B, signalId, 'rest', aId);
  }

  signalId = await start(A, 'rest');
  await expectError(B, 'respond_to_rest_moment', {
    p_signal_id: signalId,
    p_action: 'make_doodle',
    p_payload: { version: 1, width: 12, height: 12, palette_id: 'hearth-rest-v1', cells: '.'.repeat(143) },
  }, /Invalid Rest response payload/);
  await expectError(B, 'respond_to_rest_moment', {
    p_signal_id: signalId,
    p_action: 'send_visitor',
    p_payload: { version: 1, visitor: 'goose' },
  }, /Invalid Rest response payload/);
  await expectError(B, 'respond_to_rest_moment', {
    p_signal_id: signalId,
    p_action: 'send_hug',
    p_payload: { version: 1, extra: true },
  }, /Invalid Rest response payload/);
  await rpc(A, 'cancel_moment', { p_signal_id: signalId });

  // Romantic (B owns): acceptance is timeless; decline closes without a heart.
  for (const action of ['come_close', 'send_affection']) {
    signalId = await start(B, 'romantic');
    await assertOpen(A, signalId, 'respond_romantic');
    await respond(A, signalId, action);
    await assertOpen(B, signalId, 'resolve_romantic');
    assert.equal(await rpc(B, 'finalize_due_romantic_moment', { p_signal_id: signalId }), null);
    await delay(1_500);
    await assertOpen(B, signalId, 'resolve_romantic');
    await assertPositiveResolution(B, A, signalId, 'romantic', bId);
  }

  signalId = await start(B, 'romantic');
  await respond(A, signalId, 'kindly_decline');
  const declined = await snapshot(B);
  assert.equal(declined.active, null);
  assert.equal(completionFor(declined, signalId), undefined);

  // Outsiders cannot invoke state changes or see either event stream.
  await expectError(outsider, 'resolve_moment', { p_signal_id: signalId }, /not found/i);
  const outsiderActions = await outsider.from('moment_action_events').select('*').eq('couple_id', home.id);
  if (outsiderActions.error) throw outsiderActions.error;
  assert.equal(outsiderActions.data.length, 0);
  const outsiderCompletions = await outsider.from('moment_completion_events').select('*').eq('couple_id', home.id);
  if (outsiderCompletions.error) throw outsiderCompletions.error;
  assert.equal(outsiderCompletions.data.length, 0);
  const outsiderReadiness = await outsider.from('moment_readiness_events').select('*').eq('couple_id', home.id);
  if (outsiderReadiness.error) throw outsiderReadiness.error;
  assert.equal(outsiderReadiness.data.length, 0);

  // Durable action events cover every response, cannot be mutated, and never store a schedule.
  const state = await snapshot(A);
  const observedActions = new Set(state.today_action_events.map((event) => event.canonical_action));
  for (const action of [
    'come_sit', 'talk_by_fire', 'listen_by_fire', 'hear_them_out', 'not_now', 'join_fireplace',
    'give_quiet', 'leave_rose', 'sit_with_them', 'bring_tea', 'send_hug', 'talk_now', 'join_table',
    'rest_doodle', 'rest_visitor', 'rest_hug', 'come_close', 'send_affection', 'kindly_decline',
  ]) assert.equal(observedActions.has(action), true, `${action} action event`);

  const actionRows = await A.from('moment_action_events').select('*').eq('couple_id', home.id);
  if (actionRows.error) throw actionRows.error;
  assert.ok(actionRows.data.length >= observedActions.size);
  const tamper = await A.from('moment_action_events')
    .update({ canonical_action: 'tampered' })
    .eq('id', actionRows.data[0].id);
  assert.ok(tamper.error);

  const readinessRows = await A.from('moment_readiness_events').select('*').eq('couple_id', home.id);
  if (readinessRows.error) throw readinessRows.error;
  assert.ok(readinessRows.data.length >= 2);
  const readinessTamper = await A.from('moment_readiness_events')
    .update({ readiness: false })
    .eq('id', readinessRows.data[0].id);
  assert.ok(readinessTamper.error);

  const sessionRows = await A.from('moment_sessions')
    .select('scheduled_for, scheduled_by_user_id, shared_due_at')
    .eq('couple_id', home.id);
  if (sessionRows.error) throw sessionRows.error;
  assert.ok(sessionRows.data.length > 0);
  assert.ok(sessionRows.data.every((row) =>
    row.scheduled_for === null && row.scheduled_by_user_id === null && row.shared_due_at === null));

  console.log(`Moments flow live matrix passed across ${sessionRows.data.length} alternating-author sessions.`);
}

main().then(cleanup, async (error) => {
  console.error(error);
  await cleanup();
  process.exitCode = 1;
});
