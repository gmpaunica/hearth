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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
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

function active(destination, overrides = {}) {
  return {
    signal_id: 'moment-1', couple_id: 'couple-1', author_id: 'a', destination,
    intent: destination === 'fireplace' ? 'stay_close' : null,
    phase: 'waiting', shared_started_at: null, shared_ended_at: null,
    created_at: '2026-08-14T10:00:00Z', updated_at: '2026-08-14T10:00:00Z',
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    identity: { user_id: 'a', partner_id: 'b', user_name: 'Alex', partner_name: 'Sam' },
    active: null, personal_action: { kind: 'none' }, participants: [], presence: [],
    today_outcomes: [], completion_events: [], current_action_events: [], today_action_events: [],
    earlier_moments: [], ...overrides,
  };
}

test('ritual fire is daily-sketch driven and never a Moment score', () => {
  const ritual = read('src/state/dailyRitualStore.ts');
  const atmosphere = read('src/scene/Atmosphere.tsx');
  const modelSource = read('src/state/momentV2Model.ts');
  assert.match(ritual, /get_daily_ritual_snapshot/);
  assert.match(atmosphere, /snapshot\?\.fire_state \?\? 'steady'/);
  assert.match(atmosphere, /firePresentation\(/);
  assert.match(read('src/state/firePresentation.ts'), /const RITUAL_FIRE_LEVEL/);
  assert.doesNotMatch(atmosphere, /momentFireState/);
  assert.doesNotMatch(modelSource, /momentFireState|banked embers/);
  assert.doesNotMatch(`${ritual}\n${modelSource}`, /score|streak|relationship health/i);
});

test('destination response catalogs match the corrected state machine', () => {
  assert.deepEqual(model.responseActionsFor(active('garden')).map((item) => item.id), ['give_quiet', 'leave_rose']);
  assert.deepEqual(model.responseActionsFor(active('sofa')).map((item) => item.id), ['sit_with_them', 'bring_tea', 'send_hug']);
  assert.deepEqual(model.responseActionsFor(active('table')).map((item) => item.id), ['talk_now', 'not_now']);
  assert.deepEqual(model.responseActionsFor(active('rest')).map((item) => item.id), ['rest_doodle', 'rest_visitor', 'rest_hug']);
  assert.deepEqual(model.responseActionsFor(active('romantic')).map((item) => item.id), ['come_close', 'send_affection', 'kindly_decline']);
  assert.deepEqual(model.responseActionsFor(active('fireplace')).map((item) => item.id), ['come_sit', 'not_now']);
});

test('creation is two steps and active action is pinned directly below the header', () => {
  const controller = read('src/components/MomentsController.tsx');
  assert.match(controller, />1 of 2</);
  assert.match(controller, />2 of 2</);
  assert.match(controller, /<MomentNoteComposer value=\{note\}/);
  assert.match(controller, /<PinnedActionCard snapshot=\{snapshot\}/);
  assert.ok(controller.indexOf('<PinnedActionCard') < controller.indexOf('<ScrollView'));
  assert.doesNotMatch(controller, /Review moment|review page|explanatory paragraph/i);
  assert.match(controller, /minHeight: 48/);
});

test('current Moments client has no schedule, countdown, expiry, or Romantic timer behavior', () => {
  const sources = [
    read('src/components/MomentsController.tsx'),
    read('src/state/momentV2Store.ts'),
    read('src/state/momentV2Model.ts'),
    read('src/moments/consequenceCatalog.ts'),
  ].join('\n');
  assert.doesNotMatch(sources, /scheduledFor|shared_due_at|remainingSharedMinutes|setInterval|finalize_due_romantic|20-minute|20 minute|countdown/i);
  assert.match(read('src/state/momentV2Store.ts'), /p_scheduled_for: null/);
});

test('the sheet has exactly dock and expanded positions with both drag directions', () => {
  const controller = read('src/components/MomentsController.tsx');
  const physics = compile('src/state/momentSheetPhysics.ts');
  assert.match(controller, /const sheetY = useSharedValue\(dockedY\)/);
  assert.match(controller, /const expandedY = Math\.max\(insets\.top \+ 116, 132\)/);
  assert.match(controller, /const dockedY = height - insets\.bottom - dockHeight/);
  assert.match(controller, /const dockHeight = 48/);
  assert.match(controller, /const dockedWidth = Math\.min\(214, Math\.max\(144, width - 176\)\)/);
  assert.match(controller, /dragStartY\.value = sheetY\.value/);
  assert.match(controller, /resolveMomentSheetExpanded/);
  assert.match(controller, /simultaneousWithExternalGesture\(nativeScroll\)/);
  assert.match(controller, /scrollY\.value <= 0/);
  assert.equal(physics.clampMomentSheetY(50, 132, 760), 132);
  assert.equal(physics.clampMomentSheetY(900, 132, 760), 760);
  assert.equal(physics.resolveMomentSheetExpanded(600, -700, 132, 760), true);
  assert.equal(physics.resolveMomentSheetExpanded(200, 700, 132, 760), false);
  assert.equal(physics.resolveMomentSheetExpanded(300, 0, 132, 760), true);
  assert.equal(physics.resolveMomentSheetExpanded(650, 0, 132, 760), false);
  assert.match(controller, /style=\{styles\.handle\}/);
  assert.match(controller, /accessibilityActions=\{expanded/);
  assert.equal((controller.match(/<Animated\.View\s/g) ?? []).length >= 1, true);
  assert.doesNotMatch(controller, /Back home/);
});

test('Settings is opaque and exclusive, and playback waits until it closes', () => {
  const settings = read('src/components/Settings.tsx');
  const home = read('src/app/index.tsx');
  const store = read('src/state/momentV2Store.ts');
  assert.match(settings, /backgroundColor: editorial\.paperStrong/);
  assert.match(settings, /setSettingsOpen\(true\)/);
  assert.match(settings, /resumeMomentPlayback\(\)/);
  for (const component of ['MomentsController', 'FireplaceReconnectBubble', 'HearthStatusCard', 'SpatialReactionOverlay', 'PixelHeartPayoff', 'DailyDrawing', 'CharacterButton', 'RitualsButton', 'HomeGrewCard']) {
    assert.match(home, new RegExp(`!settingsOpen && <${component}`));
  }
  assert.match(store, /!surface\.expanded && !surface\.hearthOpen && !surface\.settingsOpen && surface\.appVisible/);
  assert.match(store, /surface\.settingsOpen \|\| surface\.hearthOpen \|\| surface\.expanded \|\| !surface\.appVisible/);
});

test('positive completion payoffs route fullscreen except for Romantic', () => {
  const store = read('src/state/momentV2Store.ts');
  const heart = read('src/scene/ReconcileHeart.tsx');
  const fullscreen = read('src/components/PixelHeartPayoff.tsx');
  const details = read('src/scene/MomentSceneDetails.tsx');
  assert.match(heart, /momentPayoff\?\.destination === 'romantic'/);
  assert.match(heart, /<mesh[\s\S]*<mesh/);
  assert.match(fullscreen, /payoff\.destination !== 'romantic'/);
  assert.match(fullscreen, /reduceMotion \? 1 : withTiming/);
  assert.doesNotMatch(details, /MomentDestinationPayoff/);
  assert.match(store, /requestMomentCameraFocus\(event\.destination, scene\.reduceMotion\)/);
  assert.match(store, /restoreMomentCameraFocus\(\)/);
  assert.match(store, /await persistSeen\(ctx\);[\s\S]*completionQueue\.push/);
  assert.match(store, /completionBaselinePending/);
});

test('six code-native mosaics replace raster Moment photographs', () => {
  const vignette = read('src/components/MomentVignette.tsx');
  for (const destination of ['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic']) {
    assert.match(vignette, new RegExp(`${destination}: \\{`));
  }
  assert.match(vignette, /VoxelMosaic/);
  assert.doesNotMatch(vignette, /expo-image|\.webp|require\(/);
  assert.doesNotMatch(read('src/moments/consequenceCatalog.ts'), /MOMENT_BANNER_IMAGES|expo-image|\.webp/);
});

test('SDK 57 and runtime 1.0.3 remain OTA compatible', () => {
  const app = JSON.parse(read('app.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(app.expo.version, '1.0.3');
  assert.deepEqual(app.expo.runtimeVersion, { policy: 'appVersion' });
  assert.equal(pkg.version, '1.0.3');
  assert.equal(pkg.dependencies.expo, '57.0.12');
  assert.equal(pkg.dependencies['react-native'], '0.86.2');
});
