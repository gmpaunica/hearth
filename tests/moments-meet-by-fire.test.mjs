import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nodeRequire = createRequire(import.meta.url);
const read = (path) => readFileSync(join(root, path), 'utf8');

function compile(path, resolve = nodeRequire) {
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', 'require', compiled)(module.exports, module, resolve);
  return module.exports;
}

const copy = compile('src/copy/index.ts');
const catalog = compile('src/moments/consequenceCatalog.ts');
const model = compile('src/state/momentV2Model.ts', (id) => {
  if (id === '@/copy') return copy;
  if (id === '@/moments/consequenceCatalog') return catalog;
  return nodeRequire(id);
});

function snapshot(kind, destination = 'fireplace', authorId = 'member-a') {
  return {
    identity: { user_id: 'member-a', partner_id: 'member-b', user_name: 'You', partner_name: 'Partner' },
    active: {
      signal_id: 'moment-1', couple_id: 'couple-1', author_id: authorId, destination,
      intent: destination === 'fireplace' ? 'stay_close' : null, phase: 'waiting',
      shared_started_at: null, shared_ended_at: null,
      created_at: '2026-09-07T18:00:00Z', updated_at: '2026-09-07T18:00:00Z',
    },
    personal_action: { kind },
    participants: [], presence: [], today_outcomes: [], completion_events: [],
    current_action_events: [], today_action_events: [], readiness_events: [], earlier_moments: [],
  };
}

test('every active server state becomes one calm next-step presentation', () => {
  assert.equal(model.momentJourneyPresentation(null).kind, 'send');
  assert.equal(model.momentJourneyPresentation(snapshot('wait')).kind, 'waiting');
  assert.equal(model.momentJourneyPresentation(snapshot('respond_fireplace', 'fireplace', 'member-b')).kind, 'respond');
  assert.equal(model.momentJourneyPresentation(snapshot('respond_garden', 'garden', 'member-b')).kind, 'acknowledge');
  assert.equal(model.momentJourneyPresentation(snapshot('join_fireplace')).kind, 'meet');
  assert.equal(model.momentJourneyPresentation(snapshot('confirm_fireplace')).kind, 'meet');
  assert.equal(model.momentJourneyPresentation(snapshot('resolve_garden', 'garden')).kind, 'return');
  const allCopy = [
    null,
    snapshot('wait'),
    snapshot('respond_fireplace', 'fireplace', 'member-b'),
    snapshot('respond_garden', 'garden', 'member-b'),
    snapshot('join_fireplace'),
    snapshot('confirm_fireplace'),
    snapshot('resolve_garden', 'garden'),
  ].map(model.momentJourneyPresentation).map((item) => `${item.title} ${item.detail}`).join('\n');
  assert.doesNotMatch(allCopy, /blame|fault|score|streak|hurry|urgent|overdue/i);
});

test('Moments maps provider failures and exposes truthful reconnect state', () => {
  const store = read('src/state/momentV2Store.ts');
  const sync = read('src/state/useHearthSync.ts');
  assert.match(store, /mapDomainError\(error, operation\)/);
  assert.match(store, /'moment_sync'/);
  assert.match(store, /'moment_action'/);
  assert.doesNotMatch(store, /function messageOf|String\(\(error as.*message/);
  assert.match(store, /syncStatus: 'reconnecting'/);
  assert.match(sync, /status === 'CHANNEL_ERROR'.*status === 'TIMED_OUT'.*status === 'CLOSED'/s);
  assert.match(sync, /setSyncStatus\('current'\)/);
});

test('cold start and interrupted updates preserve saved state with an explicit retry', () => {
  const controller = read('src/components/MomentsController.tsx');
  assert.match(controller, /Bringing your shared Moment home/);
  assert.match(controller, /without replaying old reactions/);
  assert.match(controller, /Updates are paused/);
  assert.match(controller, /Your last saved Moment is still here/);
  assert.match(controller, /Check current state/);
  assert.match(controller, /!snapshot \? null/);
});

test('note removal and Moment cancellation are distinct confirmed loss actions', () => {
  const controller = read('src/components/MomentsController.tsx');
  assert.match(controller, /Remove this note\?/);
  assert.match(controller, /This sentence cannot be restored/);
  assert.match(controller, /Take this Moment back\?/);
  assert.match(controller, /Close without resolving/);
  assert.match(controller, /function DangerButton/);
  assert.match(controller, /dangerButton:.*editorial\.danger/s);
});

test('the deterministic review route covers send, wait, response, space, meet, and offline', () => {
  const qa = read('src/app/moments-qa.tsx');
  assert.match(qa, /if \(!__DEV__\) return <Redirect/);
  for (const state of ['send', 'waiting', 'respond', 'space', 'meet', 'offline']) {
    assert.match(qa, new RegExp(`'${state}'`));
  }
  assert.match(qa, /errorCode: 'offline'/);
  assert.doesNotMatch(qa, /supabase|\.rpc\(/);
});

test('sensitive-surface capture protection stays native without breaking browser review', () => {
  const shield = read('src/components/PrivateSurfaceShield.tsx');
  assert.match(shield, /Platform\.OS === 'web'/);
  assert.match(shield, /usePreventScreenCapture\(`hearth-private-\$\{surface\}`\)/);
});
