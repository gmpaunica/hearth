import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260812120000_calm_moments.sql',
  import.meta.url,
);

async function sql() {
  return (await readFile(migrationUrl, 'utf8')).toLowerCase();
}

function body(source, functionName) {
  return source.match(
    new RegExp(`create or replace function public\\.${functionName}\\b[\\s\\S]+?\\n\\$\\$;`),
  )?.[0] ?? '';
}

test('ordinary presence is idempotent and has no moment side effects', async () => {
  const source = await sql();
  const helper = body(source, 'move_interaction_presence_internal');
  const move = body(source, 'move_to_interaction');
  const leave = body(source, 'leave_interaction');

  assert.match(helper, /p\.signal_id = p_signal_id[\s\S]{0,120}p\.is_current[\s\S]{0,80}return/);
  assert.match(helper, /where not public\.signal_presence\.is_current/);
  assert.doesNotMatch(move, /latest_activity_at|returned_at|fireplace_sessions|responses/);
  assert.doesNotMatch(leave, /latest_activity_at|resolved_at|fireplace_sessions|responses/);
  assert.match(leave, /user_id = uid and is_current/);
});

test('scheduled return is explicit, one-way, and moves only its caller', async () => {
  const source = await sql();
  const returned = body(source, 'return_to_fireplace');
  const reschedule = body(source, 'reschedule_fireplace_return');

  assert.match(returned, /scheduled_by_user_id is distinct from uid/);
  assert.match(returned, /if session_row\.returned_at is not null then[\s\S]{0,80}return false/);
  assert.match(returned, /move_interaction_presence_internal\(uid, target\.couple_id, target\.id\)/);
  assert.doesNotMatch(returned, /update public\.signal_presence/);
  assert.match(reschedule, /if session_row\.returned_at is not null/);
  assert.match(source, /old\.returned_at is not null and new\.returned_at is distinct from old\.returned_at/);
});

test('response movement comes only from the validated server allowlist', async () => {
  const source = await sql();
  const response = body(source, 'respond_to_interaction');

  assert.match(source, /interaction_response_moves_to_location/);
  for (const pair of [
    "p_pathway = 'stay_close' then p_action = 'sit_beside'",
    "p_pathway = 'talk_through' then p_action = 'talk_now'",
    "p_pathway = 'hear_first' then p_action = 'ready_to_listen'",
    "p_pathway = 'acknowledge_hurt' then p_action = 'acknowledge'",
    "p_pathway = 'apologize' then p_action = 'suggest_talking'",
  ]) assert.ok(source.includes(pair));
  assert.match(response, /should_move := public\.interaction_response_moves_to_location/);
  assert.doesNotMatch(response, /if p_move_to_interaction then/);
});

test('sentences are author-owned, editable only while open, and capped at 240', async () => {
  const source = await sql();
  const sentence = body(source, 'set_fireplace_sentence');

  assert.match(sentence, /char_length\(clean_sentence\) > 240/);
  assert.match(sentence, /s\.resolved_at is null/);
  assert.match(sentence, /session_row\.phase not in \('waiting', 'responded', 'continue'\)/);
  assert.match(sentence, /participant_row\.participant_role = 'partner' and participant_row\.response_action is null/);
  assert.match(sentence, /where signal_id = target\.id and user_id = uid/);
  assert.match(sentence, /sentence is not distinct from clean_sentence[\s\S]{0,80}return/);
});

test('private continuation and readiness do not reorder public moments', async () => {
  const source = await sql();
  const continuation = body(source, 'complete_fireplace_action');
  const readiness = body(source, 'set_fireplace_readiness');

  assert.doesNotMatch(continuation, /latest_activity_at/);
  assert.match(readiness, /if session_row\.phase = 'completed' then[\s\S]{0,80}return true/);
  assert.match(readiness, /where signal_id = target\.id and phase = 'continue'/);
  assert.match(readiness, /if all_reconnected then[\s\S]+latest_activity_at = completed_moment/);
  const beforeCompletion = readiness.slice(0, readiness.indexOf('if all_reconnected then'));
  assert.doesNotMatch(beforeCompletion, /latest_activity_at/);
  assert.match(source, /old\.phase in \('completed', 'closed'\)/);
});

test('snapshot provides typed legacy state and filters all internal values from human response', async () => {
  const source = await sql();
  const snapshot = body(source, 'get_interaction_snapshot');

  assert.match(snapshot, /'legacy_state'/);
  assert.match(snapshot, /as author_returned_at/);
  assert.match(snapshot, /as author_left_at/);
  assert.match(snapshot, /as responder_left_at/);
  assert.match(snapshot, /left\(r\.choice, 9\) <> '__hearth_'/);
  assert.match(snapshot, /'legacy_responses'/, 'raw rows remain available to rollback clients');
});
