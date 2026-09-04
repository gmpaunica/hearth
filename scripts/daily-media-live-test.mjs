// Authenticated two-home verification for Daily Record, Daily Photo, Diary,
// receipts, greenhouse persistence, realtime, RLS isolation, and unpairing.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gtdigidqsczptqpbplar.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46';
const makeClient = () => createClient(URL, KEY, { auth: { persistSession: false } });
const A = makeClient();
const B = makeClient();
const C = makeClient();
const D = makeClient();
const clients = [A, B, C, D];

async function rpc(client, name, args = {}) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}

async function expectError(promise, pattern) {
  const result = await promise;
  assert.ok(result.error, 'operation should fail');
  if (pattern) assert.match(result.error.message, pattern);
}

async function signIn(client) {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}

async function pair(owner, partner) {
  const created = await rpc(owner, 'create_couple');
  await rpc(partner, 'join_couple', { code: created.invite_code });
  return created.id;
}

async function upload(client, coupleId, userId, snapshot, medium, suffix = '') {
  const id = randomUUID();
  const extension = medium === 'photo' ? 'jpg' : 'm4a';
  const mime = medium === 'photo' ? 'image/jpeg' : 'audio/mp4';
  const path = `${coupleId}/${userId}/${medium}/${snapshot.home_date}/${id}${suffix}.${extension}`;
  const bytes = new Uint8Array(medium === 'photo'
    ? [0xff, 0xd8, 0xff, 0xe0, ...new Array(1020).fill(0), 0xff, 0xd9]
    : new Array(2048).fill(7));
  const stored = await client.storage.from('daily-media').upload(path, bytes.buffer, {
    contentType: mime,
    upsert: false,
  });
  if (stored.error) throw new Error(`upload: ${stored.error.message}`);
  const finalized = await client.rpc('finalize_daily_submission', {
    p_assignment_id: snapshot.assignment_id,
    p_media_id: id,
    p_medium: medium,
    p_storage_path: path,
    p_mime_type: mime,
    p_byte_size: bytes.byteLength,
    p_duration_ms: medium === 'voice' ? 1200 : null,
    p_audio_channels: medium === 'voice' ? 1 : null,
    p_audio_bit_rate: medium === 'voice' ? 64000 : null,
    p_width: medium === 'photo' ? 800 : null,
    p_height: medium === 'photo' ? 1000 : null,
  });
  return { id, path, finalized, bytes };
}

async function cleanup() {
  for (const client of clients) {
    try { await client.rpc('prepare_sign_out'); } catch { /* best effort */ }
    try { await client.auth.signOut({ scope: 'local' }); } catch { /* best effort */ }
  }
}

async function main() {
  const [aId, bId, cId, dId] = await Promise.all(clients.map(signIn));
  const [coupleAB, coupleCD] = await Promise.all([pair(A, B), pair(C, D)]);

  const [todayA, todayB, todayC, todayD] = await Promise.all(clients.map((client) => rpc(client, 'get_today_daily_media')));
  assert.equal(todayA.assignment_id, todayB.assignment_id);
  assert.equal(todayA.photo_prompt, todayB.photo_prompt);
  assert.equal(todayA.voice_prompt, todayB.voice_prompt);
  assert.notEqual(todayA.assignment_id, todayC.assignment_id);
  assert.equal(todayC.assignment_id, todayD.assignment_id);
  console.log('✓ server-owned shared prompts agree only inside each home');

  let realtimeMediaId = null;
  const channel = A.channel(`daily-live-${randomUUID()}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'daily_media', filter: `couple_id=eq.${coupleAB}` },
    (payload) => { realtimeMediaId = payload.new.id; },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('realtime subscribe timeout')), 10_000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
    });
  });

  const voiceA = await upload(A, coupleAB, aId, todayA, 'voice');
  assert.equal(voiceA.finalized.error, null);
  const photoA = await upload(A, coupleAB, aId, todayA, 'photo');
  assert.equal(photoA.finalized.error, null);
  const photoB = await upload(B, coupleAB, bId, todayB, 'photo');
  assert.equal(photoB.finalized.error, null);
  for (let index = 0; index < 100 && realtimeMediaId !== photoB.id; index += 1) await delay(100);
  assert.equal(realtimeMediaId, photoB.id);
  await A.removeChannel(channel);
  console.log('✓ submissions reveal immediately through realtime');

  const duplicate = await upload(A, coupleAB, aId, todayA, 'voice');
  assert.match(duplicate.finalized.error?.message ?? '', /slot is already finalized/i);
  const removedOrphan = await A.storage.from('daily-media').remove([duplicate.path]);
  assert.equal(removedOrphan.error, null);
  console.log('✓ immutable slot rejects a second answer and its orphan is recoverable');

  await rpc(B, 'mark_daily_media_received', { p_media_id: voiceA.id, p_kind: 'voice_playback_started' });
  const [afterReceiptA, afterReceiptB] = await Promise.all([
    rpc(A, 'get_today_daily_media'), rpc(B, 'get_today_daily_media'),
  ]);
  assert.equal(afterReceiptA.submissions.find((item) => item.id === voiceA.id).receipt, null);
  assert.ok(afterReceiptB.submissions.find((item) => item.id === voiceA.id).receipt);
  console.log('✓ playback receipt is private to its recipient');

  const signedByPartner = await B.storage.from('daily-media').createSignedUrl(photoA.path, 300);
  assert.equal(signedByPartner.error, null);
  const signedByOtherHome = await C.storage.from('daily-media').createSignedUrl(photoA.path, 300);
  assert.ok(signedByOtherHome.error);
  console.log('✓ private storage is couple-isolated');

  await rpc(A, 'plant_photo_day', { p_home_date: todayA.home_date });
  const greenhouseAB = await rpc(B, 'get_greenhouse_page', { p_before_date: null, p_limit: 12 });
  assert.equal(greenhouseAB[0].photos.length, 2);
  assert.deepEqual(new Set(greenhouseAB[0].photos.map((photo) => photo.author_id)), new Set([aId, bId]));
  const diary = await rpc(B, 'get_diary_page', { p_before_date: null, p_limit: 20 });
  assert.ok(diary.some((day) => day.voices.some((voice) => voice.id === voiceA.id)));
  assert.equal(JSON.stringify(diary).includes(photoA.id), false);
  console.log('✓ a planted single auto-pairs and photos stay out of Our Diary');

  await expectError(B.rpc('delete_daily_artifact', { p_kind: 'voice', p_id: voiceA.id }), /Artifact not found|permission/i);
  await rpc(A, 'delete_daily_artifact', { p_kind: 'voice', p_id: voiceA.id });
  const afterDelete = await rpc(A, 'get_diary_page', { p_before_date: null, p_limit: 20 });
  assert.equal(afterDelete.some((day) => day.voices.some((voice) => voice.id === voiceA.id)), false);
  await rpc(B, 'unplant_photo_day', { p_home_date: todayA.home_date });
  assert.deepEqual(await rpc(A, 'get_greenhouse_page', { p_before_date: null, p_limit: 12 }), []);
  await expectError(A.rpc('plant_photo_day', { p_home_date: todayA.home_date }), /no photo|permanently unplanted/i);
  console.log('✓ author deletion and either-partner final unplanting are enforced');

  const photoC = await upload(C, coupleCD, cId, todayC, 'photo');
  const photoD = await upload(D, coupleCD, dId, todayD, 'photo');
  assert.equal(photoC.finalized.error, null);
  assert.equal(photoD.finalized.error, null);
  await rpc(C, 'plant_photo_day', { p_home_date: todayC.home_date });
  await rpc(D, 'leave_couple');
  const survivor = await rpc(C, 'get_greenhouse_page', { p_before_date: null, p_limit: 12 });
  assert.equal(survivor.length, 1);
  assert.deepEqual(survivor[0].photos.map((photo) => photo.author_id), [cId]);
  console.log('✓ unpairing hides the departure artifact and keeps the survivor memory');

  assert.ok(coupleAB && coupleCD);
}

try {
  await main();
  console.log('Daily media live matrix passed.');
} finally {
  await cleanup();
}
