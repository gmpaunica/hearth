import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migration = readFileSync(join(
  root,
  'supabase/migrations/20260819120000_daily_media_greenhouse.sql',
), 'utf8');
const cleanup = readFileSync(join(
  root,
  'supabase/functions/cleanup-daily-media/index.ts',
), 'utf8');
const notify = readFileSync(join(
  root,
  'supabase/functions/notify-daily-media/index.ts',
), 'utf8');

const functionBody = (schema, name) => migration.match(new RegExp(
  `create(?: or replace)? function ${schema}\\.${name}\\([^]*?\\n\\$\\$;`,
  'i',
))?.[0] ?? '';

test('the exact approved prompt packs are seeded and assignments exclude the prior 29 home days', () => {
  assert.equal((migration.match(/\('photo',\s*\d+,/g) ?? []).length, 30);
  assert.equal((migration.match(/\('voice',\s*\d+,/g) ?? []).length, 30);
  assert.match(migration, /Photograph something nearby that reminds you of us\./);
  assert.match(migration, /Give future-us one tiny piece of advice\./);
  const assignment = functionBody('private', 'ensure_daily_prompt_assignment');
  assert.match(assignment, /pg_advisory_xact_lock/);
  assert.match(assignment, /p_home_date\s*-\s*29/);
  assert.match(assignment, /photo_prompt_id\s*=\s*p\.id/);
  assert.match(assignment, /voice_prompt_id\s*=\s*p\.id/);
  assert.match(migration, /unique \(couple_id, home_date\)/);
});

test('daily slots are immutable and finalization validates the uploaded object and exact media bounds', () => {
  assert.match(migration, /daily_media_shared_slot_unique[\s\S]{0,160}couple_id, author_id, home_date, medium/);
  const finalize = functionBody('public', 'finalize_daily_submission');
  assert.match(finalize, /storage\.objects/);
  assert.match(finalize, /Today''s submission slot is already finalized/);
  assert.match(finalize, /p_duration_ms not between 1 and 30000/);
  assert.match(finalize, /p_audio_channels <> 1/);
  assert.match(finalize, /p_audio_bit_rate <> 64000/);
  assert.match(finalize, /p_byte_size > 768000/);
  assert.match(finalize, /p_mime_type <> 'image\/jpeg'/);
  assert.match(finalize, /p_byte_size > 3145728/);
  assert.match(finalize, /p_width > 1600 or p_height > 2000/);
  assert.match(finalize, /p_width \* 5 <> p_height \* 4/);
  assert.match(finalize, /insert into public\.daily_media/);
});

test('today state returns the same shared assignment and only the caller private receipt', () => {
  const today = functionBody('public', 'get_today_daily_media');
  assert.match(today, /ensure_daily_prompt_assignment/);
  assert.match(today, /Today''s shared prompt — you both have the same one\./);
  assert.match(today, /r\.recipient_user_id = uid/);
  assert.doesNotMatch(today, /countdown|streak|score|reminder/i);
  const receipt = functionBody('public', 'mark_daily_media_received');
  assert.match(receipt, /dm\.author_id <> uid/);
  assert.match(receipt, /photo_viewed/);
  assert.match(receipt, /voice_playback_started/);
  assert.match(receipt, /on conflict \(media_id, recipient_user_id, receipt_kind\)/);
});

test('planting is current-day-only, pairing is derived, and unplanting is final', () => {
  const plant = functionBody('public', 'plant_photo_day');
  assert.match(plant, /p_home_date <> home\.home_date/);
  assert.match(plant, /medium = 'photo'/);
  assert.match(plant, /permanently unplanted/);
  const greenhouse = functionBody('public', 'get_greenhouse_page');
  assert.match(greenhouse, /jsonb_agg[\s\S]{0,900}author_id/);
  assert.match(greenhouse, /dm\.home_date = page\.home_date/);
  const unplant = functionBody('public', 'unplant_photo_day');
  assert.match(unplant, /set unplanted_at = now\(\)/);
  assert.match(unplant, /set deleted_at = coalesce\(dm\.deleted_at, now\(\)\)/);
  assert.match(unplant, /'unplanted'/);
});

test('Diary pages contain sketches and voice only, with author deletion tombstones', () => {
  const diary = functionBody('public', 'get_diary_page');
  assert.match(diary, /'sketches'/);
  assert.match(diary, /'voices'/);
  assert.match(diary, /dm\.medium = 'voice'/);
  assert.doesNotMatch(diary, /dm\.medium = 'photo'/);
  const remove = functionBody('public', 'delete_daily_artifact');
  assert.match(remove, /private\.deleted_drawing_slots/);
  assert.match(remove, /delete from public\.drawings/);
  assert.match(remove, /update public\.daily_media set deleted_at = now\(\)/);
  assert.match(migration, /drawing_slot_is_open[\s\S]{0,1200}drawings_insert/);
});

test('private storage uses scoped paths, five-minute client URLs, and Storage-API cleanup jobs', () => {
  assert.match(migration, /values \('daily-media', 'daily-media', false, 3145728/);
  assert.match(migration, /daily_media_objects_insert/);
  assert.match(migration, /storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/);
  assert.match(migration, /daily_media_objects_select/);
  assert.match(migration, /daily_media_objects_delete/);
  assert.match(migration, /storage\.objects o[\s\S]{0,220}not exists \(select 1 from public\.daily_media/);
  assert.match(cleanup, /\.storage[\s\S]{0,80}\.from\(job\.bucket_id\)[\s\S]{0,80}\.remove\(\[job\.object_path\]\)/);
  assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i);
  assert.match(cleanup, /release_daily_media_cleanup_job/);
  assert.match(cleanup, /complete_daily_media_cleanup_job/);
});

test('expired photos are hidden before retrying physical deletion and cleanup leases are fenced', () => {
  const enqueue = functionBody('private', 'enqueue_due_daily_media_cleanup');
  assert.match(enqueue, /set expired_at = now\(\)/);
  assert.match(enqueue, /visibility_expires_at <= now\(\)/);
  assert.match(enqueue, /greenhouse_memories/);
  const claim = functionBody('public', 'claim_daily_media_cleanup_jobs');
  assert.match(claim, /for update skip locked/);
  assert.match(claim, /attempts = attempts \+ 1/);
  const complete = functionBody('public', 'complete_daily_media_cleanup_job');
  assert.match(complete, /attempts = p_attempt/);
  const release = functionBody('public', 'release_daily_media_cleanup_job');
  assert.match(release, /attempts = p_attempt/);
  assert.match(release, /permanent_failure/);
});

test('unpairing removes the departing artifacts while survivor memories become private solo history', () => {
  const leave = functionBody('public', 'leave_couple');
  assert.match(leave, /author_id = uid/);
  assert.match(leave, /'departed'/);
  assert.match(leave, /set solo_owner_id = survivor/);
  assert.match(leave, /delete from public\.drawings where couple_id = home\.id and from_user = uid/);
  assert.match(leave, /update public\.greenhouse_memories gm set solo_owner_id = survivor/);
  assert.match(migration, /solo_owner_id is null or solo_owner_id = auth\.uid\(\)/);
});

test('media pushes remain content-free and deep-link only to the dedicated surface', () => {
  assert.match(notify, /Something is waiting in Hearth\./);
  assert.match(notify, /A Daily Photo is waiting in Hearth\./);
  assert.match(notify, /A Daily Record is waiting in Hearth\./);
  assert.match(notify, /privacyPreference\?\.notification_privacy === 'gentle'/);
  assert.match(notify, /surface:\s*claim\.surface/);
  assert.match(notify, /recipientUserId/);
  assert.match(notify, /coupleId/);
  assert.doesNotMatch(notify, /photo_prompt|voice_prompt|storage_path|duration_ms/);
  assert.match(migration, /hearth-daily-media-jobs/);
  assert.match(migration, /cron\.schedule/);
});
