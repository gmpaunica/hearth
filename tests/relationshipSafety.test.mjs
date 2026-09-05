import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

test('pairing blocks are private and enforced in both directions before membership changes', async () => {
  const migration = await read('supabase/migrations/20260905120000_relationship_safety.sql');
  assert.match(migration, /create table if not exists private\.pairing_blocks/);
  assert.match(migration, /revoke all on table private\.pairing_blocks from public, anon, authenticated/);
  assert.match(migration, /b\.blocker_user_id = uid and b\.blocked_user_id = target\.member_a/);
  assert.match(migration, /b\.blocker_user_id = target\.member_a and b\.blocked_user_id = uid/);
  assert.ok(migration.indexOf('private.pairing_blocks b') < migration.indexOf('update public.couples set member_b'));
  assert.match(migration, /block_and_leave_couple/);
  assert.match(migration, /perform public\.leave_couple\(\)/);
});

test('privacy preferences default generic and push detail is selected only from server state', async () => {
  const [migration, signal, media] = await Promise.all([
    read('supabase/migrations/20260905120000_relationship_safety.sql'),
    read('supabase/functions/notify-signal/index.ts'),
    read('supabase/functions/notify-daily-media/index.ts'),
  ]);
  assert.match(migration, /notification_privacy text not null default 'generic'/);
  for (const edge of [signal, media]) {
    assert.match(edge, /from\('privacy_preferences'\)/);
    assert.match(edge, /=== 'gentle' \? 'gentle' : 'generic'/);
    assert.match(edge, /Something is waiting in Hearth\./);
    assert.doesNotMatch(edge.match(/function bodyFor[\s\S]*?\n\}/)?.[0] ?? '', /return[^\n]*(display_name|invite_code|storage_path|note)/i);
  }
});

test('account export contains requester-authored and authorized shared records only', async () => {
  const [migration, edge] = await Promise.all([
    read('supabase/migrations/20260905120000_relationship_safety.sql'),
    read('supabase/functions/export-account/index.ts'),
  ]);
  const exportBody = migration.match(/create or replace function public\.request_account_export\([\s\S]*?\n\$\$;/)?.[0] ?? '';
  assert.match(exportBody, /where s\.from_user = uid/);
  assert.match(exportBody, /where r\.from_user = uid/);
  assert.match(exportBody, /where d\.from_user = uid/);
  assert.match(exportBody, /where m\.author_id = uid/);
  assert.match(exportBody, /where mp\.user_id = uid/);
  assert.match(exportBody, /where ms\.couple_id = home_id/);
  assert.doesNotMatch(exportBody, /push_token|invite_code/);
  assert.match(edge, /path\.split\('\/'\)\[1\] !== userData\.user\.id/);
  assert.match(edge, /createSignedUrl\(item\.path, 600\)/);
  assert.match(edge, /delete record\._media_objects/);
  assert.match(edge, /Cache-Control': 'no-store'/);
});

test('account deletion requires explicit confirmation, canonical cleanup, and server-only hard deletion', async () => {
  const [migration, edge] = await Promise.all([
    read('supabase/migrations/20260905120000_relationship_safety.sql'),
    read('supabase/functions/delete-account/index.ts'),
  ]);
  const prepareBody = migration.match(/create or replace function public\.prepare_account_deletion\([\s\S]*?\n\$\$;/)?.[0] ?? '';
  assert.match(prepareBody, /perform public\.prepare_sign_out\(\)/);
  assert.equal((prepareBody.match(/perform public\.leave_couple\(\)/g) ?? []).length, 0);
  assert.match(edge, /payload\.confirmation !== 'DELETE MY ACCOUNT'/);
  assert.match(edge, /userClient\.auth\.getUser\(token\)/);
  assert.match(edge, /admin\.auth\.admin\.deleteUser\(userData\.user\.id, false\)/);
  assert.match(edge, /status: 204/);
  assert.doesNotMatch(edge, /JSON\.stringify\(serviceRoleKey\)|json\(\{[^}]*serviceRoleKey/);
});
