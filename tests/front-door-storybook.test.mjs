import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function loadDomainErrors() {
  const compiled = ts.transpileModule(read('src/lib/domainError.ts'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', compiled)(module.exports, module);
  return module.exports;
}

test('front-door screens use the shared storybook primitives and semantic theme', () => {
  const onboarding = read('src/components/Onboarding.tsx');
  const pairing = read('src/components/Pairing.tsx');
  const primitives = read('src/components/ui/HearthPrimitives.tsx');
  const theme = read('src/theme/hearth.ts');

  for (const source of [onboarding, pairing]) {
    assert.match(source, /HearthScreen/);
    assert.match(source, /StoryProgress/);
    assert.doesNotMatch(source, /fontFamily:\s*['"]serif['"]/);
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}/i);
  }
  assert.match(theme, /export const HearthTheme/);
  assert.match(theme, /display: 'HearthFredoka'/);
  assert.match(theme, /body: 'HearthNunito'/);
  assert.match(primitives, /SafeAreaView/);
  assert.match(primitives, /KeyboardAvoidingView/);
  assert.match(primitives, /minHeight: HearthTheme\.touch\.minimum/);
  assert.match(theme, /minimum: 48/);
  assert.match(primitives, /AccessibilityInfo\.setAccessibilityFocus/);
  assert.match(primitives, /if \(Platform\.OS === 'web'\) return/);
  assert.match(primitives, /HEARTH_PIXELS/);
  assert.doesNotMatch(primitives, /borderTopLeftRadius: 17/);
});

test('pairing is one-purpose, shareable, validated, and calm under failure', () => {
  const pairing = read('src/components/Pairing.tsx');
  assert.match(pairing, /Clipboard\.setStringAsync/);
  assert.match(pairing, /Share\.share/);
  assert.match(pairing, /code\.length === 6/);
  assert.match(pairing, /replace\(\/\[\^A-Z0-9\]\//);
  assert.match(pairing, /Waiting for your partner/);
  assert.match(pairing, /Your shared home has not been changed/);
  assert.match(pairing, /!!effectiveError && <HearthNotice tone="error"/);
  assert.doesNotMatch(pairing, /JWT|Postgres|Supabase|status\s*\d/i);
});

test('domain failures keep infrastructure details out of user copy', () => {
  const { mapDomainError } = loadDomainErrors();
  const jwt = mapDomainError({ status: 401, message: 'JWT expired: internal-token' }, 'start');
  const database = mapDomainError({ code: '42501', message: 'permission denied for table couples' }, 'join_home');
  const network = mapDomainError(new Error('Failed to fetch https://internal.example'), 'create_home');

  assert.equal(jwt.code, 'session_expired');
  assert.equal(database.code, 'permission_denied');
  assert.equal(network.code, 'offline');
  for (const error of [jwt, database, network]) {
    assert.doesNotMatch(error.message, /JWT|internal|table|fetch|42501/i);
    assert.equal(error.operation.length > 0, true);
  }
});

test('visual QA states are strictly development-only and cannot invoke pairing RPCs', () => {
  const preview = read('src/components/frontDoorPreview.ts');
  const onboarding = read('src/components/Onboarding.tsx');
  const pairing = read('src/components/Pairing.tsx');

  assert.match(preview, /if \(!__DEV__ \|\| Platform\.OS !== 'web'\) return null/);
  assert.match(preview, /'waiting-error'/);
  assert.match(onboarding, /!preview && void setDisplayName/);
  assert.match(pairing, /previewAction/);
  assert.match(pairing, /ready && !preview && void joinHome/);
});

test('the root catches fatal render failures and shows an intentional loading state', () => {
  const layout = read('src/app/_layout.tsx');
  const boundary = read('src/components/AppErrorBoundary.tsx');
  assert.match(layout, /<AppErrorBoundary>/);
  assert.match(layout, /<AppLoadingScreen \/>/);
  assert.match(layout, /useSyncExternalStore\(subscribeHydration, \(\) => true, \(\) => false\)/);
  assert.match(layout, /Platform\.OS === 'web' && !hydrated/);
  assert.match(boundary, /<HearthScreen>/);
  assert.match(boundary, /fontFamily: HearthTheme\.type\.bodyStrong/);
  assert.match(boundary, /Hearth needs a fresh start/);
  assert.match(boundary, /Try opening again/);
  assert.match(boundary, /if \(__DEV__\)/);
});
