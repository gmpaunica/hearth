import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

test('native auth sessions use verified chunked SecureStore migration', async () => {
  const [storage, client] = await Promise.all([
    read('src/lib/secureAuthStorage.ts'),
    read('src/lib/supabase.ts'),
  ]);
  assert.match(storage, /const CHUNK_SIZE = 1800/);
  assert.match(storage, /SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(storage, /await readSecureValue\(key\) !== value/);
  assert.match(storage, /await AsyncStorage\.removeItem\(key\)/);
  assert.ok(storage.indexOf('readSecureValue(key) !== legacy') < storage.indexOf('AsyncStorage.removeItem(key)'));
  assert.match(client, /secureAuthStorage/);
});

test('account recovery preserves an anonymous identity through verified email OTP', async () => {
  const [auth, pairing] = await Promise.all([
    read('src/state/authStore.ts'),
    read('src/components/Pairing.tsx'),
  ]);
  assert.match(auth, /updateUser\(\{ email: normalized \}\)/);
  assert.match(auth, /type: 'email_change'/);
  assert.match(auth, /shouldCreateUser: false/);
  assert.match(auth, /type: 'email'/);
  assert.match(pairing, /Recover an existing home/);
  assert.match(pairing, /No partner content is sent by email/);
});

test('paired homes lock on launch and after thirty seconds away', async () => {
  const [gate, store, prefs] = await Promise.all([
    read('src/components/AppPrivacyGate.tsx'),
    read('src/state/privacyStore.ts'),
    read('src/lib/privacyPrefs.ts'),
  ]);
  assert.match(gate, /LOCK_AFTER_MS = 30_000/);
  assert.match(gate, /elapsed >= LOCK_AFTER_MS/);
  assert.match(store, /paired && preferences\.appLockMode !== 'off'/);
  assert.match(store, /disableDeviceFallback: false/);
  assert.match(store, /MAX_PIN_ATTEMPTS = 5/);
  assert.match(gate, /Forgot PIN\? Recover access/);
  assert.match(gate, /completeAccountRecovery/);
  assert.match(gate, /setLockMode\('off'\)/);
  assert.match(gate, /deviceAuthenticationAvailable/);
  assert.match(await read('src/components/PrivacyControls.tsx'), /localPinHasEscape/);
  assert.match(await read('src/components/PrivacyControls.tsx'), /hitSlop=\{\{ top: 8, right: 8, bottom: 8, left: 8 \}\}/);
  assert.doesNotMatch(gate, /placeholder="••••••"/);
  assert.match(prefs, /CryptoDigestAlgorithm\.SHA256/);
  assert.doesNotMatch(prefs, /pinPlaintext|storedPin/);
});

test('paired snapshots and sensitive surfaces prevent capture', async () => {
  const [gate, shield, drawing, moments] = await Promise.all([
    read('src/components/AppPrivacyGate.tsx'),
    read('src/components/PrivateSurfaceShield.tsx'),
    read('src/components/DailyDrawing.tsx'),
    read('src/components/MomentsController.tsx'),
  ]);
  assert.match(gate, /preventScreenCaptureAsync\(CAPTURE_KEY\)/);
  assert.match(shield, /usePreventScreenCapture/);
  assert.match(drawing, /PrivateSurfaceShield surface="drawing"/);
  assert.match(moments, /PrivateSurfaceShield surface="moments"/);
  for (const route of ['daily-photo', 'daily-record', 'diary']) {
    assert.match(await read(`src/app/${route}.tsx`), /PrivateSurfaceShield/);
  }
});

test('notification defaults are generic and detail preference stays feature-only', async () => {
  const [notifications, prefs] = await Promise.all([
    read('src/lib/notifications.ts'),
    read('src/lib/privacyPrefs.ts'),
  ]);
  assert.match(prefs, /notificationPrivacy: 'generic'/);
  assert.match(notifications, /Something is waiting in Hearth/);
  assert.doesNotMatch(notifications, /note|photo_prompt|voice_prompt|storage_path/i);
});
