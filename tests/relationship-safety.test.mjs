import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

test('account center explains relationship ownership before destructive actions', async () => {
  const center = await read('src/components/AccountCenter.tsx');

  assert.match(center, /Your artifacts are removed\. Partner-owned material remains theirs\./);
  assert.match(center, /The shared home resets, and its invite credentials rotate\./);
  assert.match(center, /Block former partner & leave/);
  assert.match(center, /Cannot pair with this account in either direction\./);
  assert.match(center, /Removing this block makes pairing possible again/);
  assert.match(center, /Confirm unblock/);
  assert.match(center, /Partner-only and private partner material is excluded\./);
  assert.match(center, /Delete your account permanently\?/);
  assert.match(center, /deleteText\.trim\(\)\.toUpperCase\(\) !== 'DELETE'/);
  assert.match(center, /This cannot be undone\./);
});

test('ownership services stay user-scoped and use SDK 57 file sharing APIs', async () => {
  const ownership = await read('src/lib/accountOwnership.ts');

  assert.match(ownership, /rpc\('get_privacy_center_snapshot'\)/);
  assert.match(ownership, /rpc\('set_privacy_preferences'/);
  assert.match(ownership, /rpc\('unblock_former_partner'/);
  assert.match(ownership, /functions\.invoke\('export-account'/);
  assert.match(ownership, /functions\.invoke\('delete-account'/);
  assert.match(ownership, /new File\(Paths\.cache, filename\)/);
  assert.match(ownership, /Sharing\.isAvailableAsync\(\)/);
  assert.match(ownership, /Sharing\.shareAsync\(file\.uri/);
  assert.match(ownership, /finally \{/);
  assert.match(ownership, /if \(file\.exists\) file\.delete\(\)/);
  assert.doesNotMatch(ownership, /service_role|SUPABASE_SERVICE_ROLE_KEY|admin\.deleteUser/);
});

test('auth state supports blocking, deletion, and recoverable sign-out semantics', async () => {
  const auth = await read('src/state/authStore.ts');

  assert.match(auth, /blockAndUnpair: async \(\) =>/);
  assert.match(auth, /rpc\('block_and_leave_couple'\)/);
  assert.match(auth, /deleteAccount: async \(\) =>/);
  assert.match(auth, /deleteCurrentAccount\(\)/);
  assert.match(auth, /usePrivacyStore\.getState\(\)\.reset\(\)/);
  assert.match(auth, /recoveryState === 'recoverable'/);
  assert.ok(auth.indexOf("recoveryState === 'recoverable'") < auth.indexOf("rpc('prepare_sign_out')"));

  const privacyStore = await read('src/state/privacyStore.ts');
  assert.match(privacyStore, /clearPrivacyPreferences\(\)/);
});

test('notification privacy is persisted locally then synchronized to the account', async () => {
  const [controls, center] = await Promise.all([
    read('src/components/PrivacyControls.tsx'),
    read('src/components/AccountCenter.tsx'),
  ]);

  assert.match(controls, /onNotificationPrivacyChange\?: \(privacy: NotificationPrivacy\) => Promise<void>/);
  assert.match(controls, /await setNotificationPrivacy\(notificationPrivacy\)/);
  assert.match(controls, /await onNotificationPrivacyChange\(notificationPrivacy\)/);
  assert.match(center, /saveNotificationPrivacy\(privacy\)/);
  assert.match(center, /setLocalNotificationPrivacy\(next\.preferences\.notification_privacy\)/);
  assert.match(center, /mapDomainError\(error, 'privacy_center'\)\.message/);
});

test('settings protects keyboard, safe areas, and integrated touch targets', async () => {
  const settings = await read('src/components/Settings.tsx');

  assert.match(settings, /SafeAreaView style=\{styles\.overlay\}/);
  assert.match(settings, /KeyboardAvoidingView/);
  assert.match(settings, /keyboardShouldPersistTaps="handled"/);
  assert.match(settings, /volumeChoice: \{[\s\S]*?minHeight: 48/);
  assert.match(settings, /playNow: \{[\s\S]*?minHeight: 48/);
  assert.match(settings, /signOutAction: \{ minHeight: 48/);
  assert.doesNotMatch(settings, />Your privacy</);
});
