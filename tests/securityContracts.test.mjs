import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function read(relativePath) {
  try {
    return await readFile(new URL(relativePath, root), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

test('the client sign-out path uses one server transaction and clears device notification state', async () => {
  const authStore = await read('src/state/authStore.ts');
  const notifications = await read('src/lib/notifications.ts');

  assert.match(authStore, /runSignOutFlow/);
  assert.match(authStore, /prepare_sign_out/);
  assert.match(authStore, /clearLocalNotifications/);
  assert.match(notifications, /dismissAllNotificationsAsync/);
  assert.match(notifications, /clearLastNotificationResponseAsync/);
  assert.match(authStore, /signOut\(\{\s*scope:\s*['"]local['"]\s*\}\)/);
});

test('push registration is cancellation-safe and settings report a truthful enabled state', async () => {
  const notifications = await read('src/lib/notifications.ts');
  const settings = await read('src/components/Settings.tsx');
  const sync = await read('src/state/useHearthSync.ts');

  assert.match(notifications, /registerPushToken\([^)]*\):\s*Promise<boolean>/);
  assert.match(notifications, /getExpoPushTokenAsync\(\{\s*projectId\s*\}\)/);
  assert.match(notifications, /begin_push_registration/);
  assert.match(notifications, /store_push_token/);
  assert.match(notifications, /clear_push_token/);
  assert.match(notifications, /p_user_id:\s*_?userId/);
  assert.match(settings, /useRef/);
  assert.match(settings, /notifyBusy/);
  assert.match(settings, /disabled\s*=\s*\{[^}]*notifyBusy[^}]*\}/s);
  assert.match(settings, /if\s*\(on\s*&&\s*!registered\)/);
  assert.doesNotMatch(sync, /setNotificationsEnabledPref/);
});

test('database hardening blocks anonymous RPCs and direct couple mutation', async () => {
  const migration = await read('supabase/hardening.sql');
  const schema = await read('supabase/schema.sql');
  const combined = `${schema}\n${migration}`.toLowerCase();

  for (const signature of [
    'create_couple()',
    'join_couple(text)',
    'leave_couple()',
    'prepare_sign_out()',
    'begin_push_registration(uuid)',
    'store_push_token(uuid,text,bigint)',
    'clear_push_token(uuid)',
  ]) {
    const escapedSignature = signature
      .replace(/[()]/g, '\\$&')
      .replaceAll(',', '\\s*,\\s*');
    assert.match(
      combined,
      new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${escapedSignature}\\s+from\\s+public`, 'i'),
    );
  }
  assert.match(combined, /grant\s+execute\s+on\s+function\s+public\.create_couple\(\)\s+to\s+authenticated/i);
  assert.match(combined, /drop\s+policy\s+if\s+exists\s+couples_update\s+on\s+public\.couples/i);
  assert.match(combined, /revoke\s+all(?:\s+privileges)?\s+on\s+(?:table\s+)?public\.couples\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(combined, /(?:auth\.uid\(\)|uid)\s+is\s+null/i);
  assert.match(migration, /drop\s+function\s+if\s+exists\s+public\.create_couple\(\)/i);
  assert.match(migration, /drop\s+function\s+if\s+exists\s+public\.join_couple\(text\)/i);
  assert.doesNotMatch(combined, /security\s+definer[\s\S]{0,120}set\s+search_path\s*=\s*public\s+as/i);
});

test('API table grants are least-privilege and stale permissive policies are replaced', async () => {
  const migration = (await read('supabase/hardening.sql')).toLowerCase();
  const drawings = (await read('supabase/drawings.sql')).toLowerCase();
  const combined = `${migration}\n${drawings}`;

  for (const table of ['profiles', 'couples', 'signals', 'responses', 'drawings']) {
    assert.match(
      combined,
      new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+(?:table\\s+)?public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'),
    );
  }
  assert.match(migration, /drop\s+policy\s+if\s+exists\s+signals_delete\s+on\s+public\.signals/);
  assert.match(migration, /responses_insert[\s\S]{0,420}from\s+public\.signals/);
  assert.match(migration, /grant\s+insert\s*\(\s*couple_id\s*,\s*from_user\s*,\s*type\s*\)[\s\S]{0,80}public\.signals\s+to\s+authenticated/);
  assert.match(migration, /grant\s+insert\s*\(\s*signal_id\s*,\s*from_user\s*,\s*choice\s*\)[\s\S]{0,80}public\.responses\s+to\s+authenticated/);
  assert.doesNotMatch(migration, /grant\s+(?:select\s*,\s*)?insert\s+on\s+(?:table\s+)?public\.(?:signals|responses)/);
  assert.match(combined, /grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+(?:table\s+)?public\.drawings\s+to\s+authenticated/);
});

test('fresh schema upgrades existing tables and locks SECURITY DEFINER lookup paths', async () => {
  const schema = (await read('supabase/schema.sql')).toLowerCase();
  const migration = (await read('supabase/hardening.sql')).toLowerCase();
  const combined = `${schema}\n${migration}`;

  assert.match(schema, /alter\s+table\s+public\.profiles[\s\S]{0,160}add\s+column\s+if\s+not\s+exists\s+push_registration_epoch/);
  assert.match(schema, /alter\s+table\s+public\.signals[\s\S]{0,120}add\s+column\s+if\s+not\s+exists\s+recipient_user_id/);
  assert.doesNotMatch(combined, /security\s+definer[\s\S]{0,140}set\s+search_path\s*=\s*public\s+as/);
  assert.match(combined, /revoke\s+create\s+on\s+schema\s+public\s+from\s+public\s*,\s*anon\s*,\s*authenticated/);
});

test('one-time legacy cleanup preserves current pairs and retires ambiguous routing data', async () => {
  const migration = (await read('supabase/hardening.sql')).toLowerCase();

  assert.match(migration, /hearth_internal_migrations/);
  assert.match(migration, /delete\s+from\s+public\.responses[\s\S]{0,320}r\.from_user\s*<>\s*c\.member_a/);
  assert.match(migration, /delete\s+from\s+public\.signals[\s\S]{0,260}not\s+exists[\s\S]{0,220}c\.member_b\s+is\s+not\s+null/);
  assert.match(migration, /delete\s+from\s+public\.drawings[\s\S]{0,260}not\s+exists[\s\S]{0,220}c\.member_b\s+is\s+not\s+null/);
  assert.match(migration, /update\s+public\.signals[\s\S]{0,180}set\s+recipient_user_id\s*=\s*case/);
  assert.match(migration, /update\s+public\.couples[\s\S]{0,220}member_b\s+is\s+null/);
  assert.match(migration, /update\s+public\.profiles[\s\S]{0,180}push_token\s*=\s*null/);
  assert.match(migration, /alter\s+table\s+public\.signals[\s\S]{0,120}recipient_user_id\s+set\s+not\s+null/);
  assert.match(migration, /create\s+unique\s+index[\s\S]{0,160}push_token[\s\S]{0,80}where\s+push_token\s+is\s+not\s+null/);
});

test('device token assignment is unique and atomically retires prior owners', async () => {
  const migration = (await read('supabase/hardening.sql')).toLowerCase();
  const schema = (await read('supabase/schema.sql')).toLowerCase();
  const combined = `${schema}\n${migration}`;

  assert.match(combined, /pg_advisory_xact_lock\s*\(\s*hashtextextended\(p_token/);
  assert.match(combined, /update\s+public\.profiles[\s\S]{0,220}push_token\s*=\s+null[\s\S]{0,220}push_token\s*=\s*p_token[\s\S]{0,120}id\s*(?:<>|!=)\s*uid/);
  assert.match(combined, /push_registration_epoch\s*=\s*push_registration_epoch\s*\+\s*1/);
});

test('outbox transitions are generation-fenced and snapshot the delivered token', async () => {
  const sql = (await read('supabase/notifications.sql')).toLowerCase();
  const edge = (await read('supabase/functions/notify-signal/index.ts')).toLowerCase();

  assert.match(sql, /delivery_push_token\s+text/);
  assert.match(sql, /delivery_push_epoch\s+bigint/);
  assert.match(sql, /record_signal_ticket\s*\([\s\S]{0,260}p_attempt\s+integer/);
  assert.match(sql, /where\s+signal_id\s*=\s*p_signal_id[\s\S]{0,100}status\s*=\s*'processing'[\s\S]{0,100}attempts\s*=\s*p_attempt/);
  assert.match(sql, /create\s+(?:or\s+replace\s+)?function\s+public\.complete_signal_delivery/);
  assert.match(sql, /create\s+(?:or\s+replace\s+)?function\s+public\.complete_signal_receipt/);
  assert.match(sql, /receipt_attempts\s*=\s*p_receipt_attempt/);
  assert.match(sql, /if\s+not\s+found\s+then[\s\S]{0,100}raise\s+exception/);
  assert.match(sql, /status\s*=\s*'permanent_failure'[\s\S]{0,500}attempts\s*>=\s*6[\s\S]{0,180}claimed_at\s*</);

  for (const rpc of ['record_signal_ticket', 'complete_signal_delivery', 'release_signal_notification']) {
    assert.match(
      edge,
      new RegExp(`rpc\\(['\"]${rpc}['\"][\\s\\S]{0,240}p_attempt:\\s*claim\\.attempt`),
    );
  }
  for (const rpc of ['complete_signal_receipt', 'release_signal_receipt']) {
    assert.match(
      edge,
      new RegExp(`rpc\\(['\"]${rpc}['\"][\\s\\S]{0,240}p_receipt_attempt:\\s*claim\\.receipt_attempt`),
    );
  }
  assert.match(edge, /record_signal_ticket[\s\S]{0,300}p_push_token:\s*claim\.push_token[\s\S]{0,120}p_push_epoch:\s*claim\.push_epoch/);
  assert.match(edge, /invalidate_push_token[\s\S]{0,240}p_epoch:\s*claim\.push_epoch/);
  assert.doesNotMatch(edge, /complete_signal_notification/);
});

test('unpair invite generation retains collision serialization', async () => {
  const unpair = (await read('supabase/unpair.sql')).toLowerCase();
  assert.match(unpair, /pg_advisory_xact_lock\s*\(\s*hashtextextended\('hearth-invite-code'/);
  assert.match(unpair, /alphabet\s+constant\s+text\s*:=\s*'abcdefghjklmnpqrstuvwxyz23456789'/);
  assert.match(unpair, /get_byte\s*\(\s*random_bytes\s*,\s*byte_index\s*\)\s*%\s*length\s*\(\s*alphabet\s*\)/);
});

test('profile grants keep push tokens private and writable only through epoch-checked RPCs', async () => {
  const migration = await read('supabase/hardening.sql');
  const schema = await read('supabase/schema.sql');
  const combined = `${schema}\n${migration}`.toLowerCase();

  assert.match(combined, /push_registration_epoch/);
  assert.match(combined, /revoke\s+all(?:\s+privileges)?\s+on\s+(?:table\s+)?public\.profiles\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(
    combined,
    /grant\s+select\s*\(\s*id\s*,\s*display_name\s*,\s*avatar_key\s*,\s*created_at\s*\)\s+on\s+(?:table\s+)?public\.profiles\s+to\s+authenticated/i,
  );
  assert.doesNotMatch(combined, /grant\s+update\s*\([^)]*push_token[^)]*\)\s+on\s+(?:table\s+)?public\.profiles\s+to\s+authenticated/i);
});

test('leaving a home purges relationship history and rotates surviving invite codes', async () => {
  const migration = await read('supabase/hardening.sql');
  const unpair = await read('supabase/unpair.sql');
  const combined = `${unpair}\n${migration}`.toLowerCase();

  assert.match(combined, /delete\s+from\s+public\.signals/);
  assert.match(combined, /delete\s+from\s+public\.drawings/);
  assert.match(combined, /invite_code\s*=\s*public\.new_invite_code\(\)/);
  assert.match(combined, /invite_code\s*=\s*public\.new_invite_code\(\)[\s\S]{0,100}created_at\s*=\s*now\(\)/);
});

test('signal recipients are captured at insertion and resolution is one-way', async () => {
  const migration = await read('supabase/hardening.sql');
  const schema = await read('supabase/schema.sql');
  const notifications = await read('supabase/notifications.sql');
  const combined = `${schema}\n${migration}\n${notifications}`.toLowerCase();

  assert.match(combined, /recipient_user_id/);
  assert.match(combined, /before\s+insert\s+on\s+public\.signals/);
  assert.match(combined, /old\.resolved_at\s+is\s+not\s+null/);
  assert.match(combined, /new\.resolved_at\s*:=\s*now\(\)/);
  assert.match(combined, /notification_outbox[\s\S]{0,240}status\s*=\s*['"]cancelled['"]/);
});

test('notification webhook uses a private Vault secret instead of the publishable key', async () => {
  const triggerSql = await read('supabase/notifications.sql');
  const edgeFunction = await read('supabase/functions/notify-signal/index.ts');

  assert.doesNotMatch(triggerSql, /authorization['"]?\s*,\s*['"]bearer\s+sb_publishable_/i);
  assert.match(triggerSql, /vault\.decrypted_secrets/i);
  assert.match(triggerSql, /x-hearth-webhook-secret/i);
  assert.match(triggerSql, /drop\s+function\s+if\s+exists\s+public\.on_signal_notify\(\)/i);
  assert.match(edgeFunction, /HEARTH_WEBHOOK_SECRET/);
  assert.match(edgeFunction, /x-hearth-webhook-secret/i);
  assert.match(edgeFunction, /unauthorized[\s\S]{0,80}401/);
});

test('notification delivery uses a durable claimed outbox and fixed recipient', async () => {
  const triggerSql = await read('supabase/notifications.sql');
  const schema = await read('supabase/schema.sql');
  const migration = await read('supabase/hardening.sql');
  const edgeFunction = await read('supabase/functions/notify-signal/index.ts');
  const combined = `${schema}\n${migration}\n${triggerSql}`.toLowerCase();

  assert.match(combined, /create\s+table\s+if\s+not\s+exists\s+public\.notification_outbox/);
  assert.match(combined, /claim_signal_notification/);
  assert.match(combined, /complete_signal_delivery/);
  assert.match(combined, /complete_signal_receipt/);
  assert.match(combined, /cron\.schedule/);
  assert.match(triggerSql, /exception\s+when\s+others/);
  assert.match(edgeFunction, /\.rpc\(['"]claim_signal_notification['"]/);
  assert.match(edgeFunction, /recipient_user_id/);
  assert.match(edgeFunction, /\.rpc\(['"]complete_signal_delivery['"]/);
  assert.match(edgeFunction, /\.rpc\(['"]complete_signal_receipt['"]/);
  assert.match(edgeFunction, /invalidateError/);
  assert.match(edgeFunction, /MessageRateExceeded/);
  assert.match(edgeFunction, /skipError/);
  assert.doesNotMatch(edgeFunction, /member_a\s*===\s*canonicalSignal\.from_user/);
});

test('notification tap payloads are bound to the active recipient and home', async () => {
  const notifications = await read('src/lib/notifications.ts');
  const sync = await read('src/state/useHearthSync.ts');
  const edgeFunction = await read('supabase/functions/notify-signal/index.ts');

  for (const field of ['recipientUserId', 'coupleId', 'signalId']) {
    assert.match(edgeFunction, new RegExp(field));
    assert.match(notifications, new RegExp(field));
  }
  assert.match(sync, /recipientUserId[\s\S]{0,160}userId/);
  assert.match(sync, /coupleId[\s\S]{0,160}couple/);
});

test('signal notification copy is generic and content-free by default', async () => {
  const edge = await read('supabase/functions/notify-signal/index.ts');
  assert.match(edge, /Something is waiting in Hearth\./);
  assert.doesNotMatch(edge, /fireplace is glowing|thinking of you|left a signal|waiting in the garden/i);
  const payload = edge.match(/body:\s*bodyFor[\s\S]{0,260}?sound:/)?.[0] ?? '';
  assert.doesNotMatch(payload, /note|display_name|invite_code|storage_path/);
});

test('committed server sign-out cleanup immediately clears the old client relationship', async () => {
  const flow = await read('src/state/signOutFlow.ts');
  const authStore = await read('src/state/authStore.ts');

  assert.match(flow, /await\s+prepareServerSignOut\(\);\s*await\s+onServerPrepared\(\);/);
  assert.match(authStore, /onServerPrepared[\s\S]{0,320}couple:\s*null[\s\S]{0,120}partnerId:\s*null/);
  assert.match(authStore, /serverPrepared\s*\?\s*['"]error['"]/);
});
