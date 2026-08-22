import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = join(root, 'src/scene/roomNavigation.ts');
const read = (path) => readFileSync(join(root, path), 'utf8');

function loadTsModule(path) {
  const source = read(path);
  const compiled = ts.transpileModule(source, {
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

function loadNavigation() {
  assert.ok(existsSync(modulePath), 'roomNavigation.ts must define the Phase 1 camera behavior');
  return loadTsModule('src/scene/roomNavigation.ts');
}

test('camera pan remains free while reaching every close-framed room', () => {
  const { clampCameraOffset } = loadNavigation();
  const inside = clampCameraOffset(1, 1);
  assert.ok(Math.abs(inside.x - 1) < 1e-9);
  assert.ok(Math.abs(inside.z - 1) < 1e-9);

  const protectedLeft = clampCameraOffset(20, -20);
  assert.ok(Math.abs((protectedLeft.x - protectedLeft.z) / Math.SQRT2 - 9) < 1e-9);
  const gardenPan = clampCameraOffset(-7.5, 2.5, 4.5);
  assert.ok((gardenPan.x - gardenPan.z) / Math.SQRT2 <= -7 + 1e-9);
  const bedroomPan = clampCameraOffset(20, -20, 4.5);
  assert.ok(Math.abs((bedroomPan.x - bedroomPan.z) / Math.SQRT2 - 11.5) < 1e-9);
});

test('camera release uses subtle inertia without magnetic room snapping', () => {
  const panSource = read('src/scene/usePan.ts');
  const homeSource = read('src/scene/HomeScene.tsx');
  assert.match(panSource, /FLING_SCALE = 7\.5/);
  assert.match(panSource, /camState\.velocityX/);
  assert.match(panSource, /0\.9, 4\.5/);
  assert.match(panSource, /camState\.zoomMul/);
  assert.match(homeSource, /Math\.exp\(-5\.2 \* delta\)/);
  assert.doesNotMatch(panSource, /magneticSnapTarget/);
  assert.doesNotMatch(homeSource, /snapX|snapZ/);
});

test('camera uses one close stable frame and keeps all rooms reachable', () => {
  const homeSource = read('src/scene/HomeScene.tsx');
  const roomSource = read('src/scene/rooms/Garden.tsx');
  const cameraSource = read('src/scene/cameraState.ts');
  assert.match(cameraSource, /centerX: 0/);
  assert.match(cameraSource, /centerZ: 0/);
  assert.match(cameraSource, /viewW: 12\.5/);
  assert.match(cameraSource, /viewH: 11\.5/);
  assert.match(homeSource, /camState\.centerX = HOME_CAMERA_FRAME\.centerX/);
  assert.match(homeSource, /camState\.centerZ = HOME_CAMERA_FRAME\.centerZ/);
  assert.match(homeSource, /camState\.viewW = HOME_CAMERA_FRAME\.viewW/);
  assert.match(homeSource, /camState\.viewH = HOME_CAMERA_FRAME\.viewH/);
  assert.match(homeSource, /initialRoom = 'living'/);
  assert.match(homeSource, /camState\.offX = initialFocus\.x/);
  assert.match(homeSource, /camState\.offZ = initialFocus\.z/);
  assert.match(homeSource, /camState\.zoomMul = 1/);
  assert.match(homeSource, /cam\.left = -halfW/);
  assert.match(homeSource, /cam\.right = halfW/);
  assert.match(homeSource, /cam\.top = halfH/);
  assert.match(homeSource, /cam\.bottom = -halfH/);
  assert.match(homeSource, /cam\.zoom = camState\.zoomMul/);
  assert.match(homeSource, /state\.size\.width \/ fittedW/);
  assert.doesNotMatch(homeSource, /state\.size\.width \/ camState\.viewW/);
  assert.doesNotMatch(homeSource, /gardenFrameInfluence|gardenFocused|GARDEN_VIEW/);
  assert.doesNotMatch(homeSource, /MathUtils\.damp\(cam\.zoom/);
  assert.match(roomSource, /const x0 = -32, x1 = 12, z0 = -24, z1 = 20/);
  assert.match(roomSource, /v\.box\(x0, 0, z1, x1 - x0 \+ 1, 2, 2/);
  assert.match(roomSource, /v\.box\(x0, 2, z1, x1 - x0 \+ 1, 1, 2/);
  assert.match(roomSource, /v\.box\(x1, 0, exposedEastZ, 2, 3, z1 - exposedEastZ \+ 1/);
  assert.match(roomSource, /v\.box\(x1, 3, exposedEastZ, 2, 1, z1 - exposedEastZ \+ 1/);
  assert.doesNotMatch(roomSource, /v\.box\(x1, 0, z0, 1, 3, z1 - z0 \+ 1/);
  assert.match(roomSource, /x0=\{courtyard \? -1\.5 : -8\.25\}/);
  assert.match(roomSource, /x1=\{3\.5\}/);
  assert.match(roomSource, /z0=\{courtyard \? -2\.75 : -6\.25\}/);
  assert.match(roomSource, /z1=\{courtyard \? 2\.75 : 5\.25\}/);

  const { clampCameraOffset, nearestRoom, ROOM_STOPS } = loadNavigation();
  const platformWidth = -4.25 - -15.75;
  const platformDepth = 7.75 - -3.75;
  assert.equal(platformWidth, 11.5);
  assert.equal(platformDepth, 11.5);
  assert.ok(platformWidth >= platformDepth, 'garden footprint must remain broad');

  const projectedLeft = (-15.75 - 7.75) / Math.SQRT2;
  const projectedRight = (-4.25 - -3.75) / Math.SQRT2;
  assert.ok(projectedLeft < projectedRight, 'garden projection must have positive width');
  assert.equal(nearestRoom(ROOM_STOPS.garden.x, ROOM_STOPS.garden.z).stop.id, 'garden');
  assert.equal(nearestRoom(ROOM_STOPS.bedroom.x, ROOM_STOPS.bedroom.z).stop.id, 'bedroom');
  for (const room of [ROOM_STOPS.garden, ROOM_STOPS.bedroom]) {
    const reachable = clampCameraOffset(room.x, room.z);
    assert.ok(
      Math.hypot(reachable.x - room.x, reachable.z - room.z) < 1.2,
      `${room.id} must be centerable from the close default frame`,
    );
  }
});

test('expanded garden preserves open lawn for future relationship growth', () => {
  const source = read('src/scene/rooms/Garden.tsx');
  const renderer = read('src/scene/HomeObjectRenderer.tsx');
  assert.match(source, /const stones:/);
  assert.doesNotMatch(source, /function buildHeartTopiary/);
  assert.doesNotMatch(source, /function buildPicnicNook/);
  assert.doesNotMatch(source, /const heartRows/);
  assert.doesNotMatch(source, /<GardenLantern position=\{\[-/);
  assert.match(renderer, /case 'GardenLantern'/);
  assert.match(renderer, /case 'RoseBush'/);
});

test('garden spaces the pink tree, moved bench and animated koi pond into separate zones', () => {
  const source = read('src/scene/rooms/Garden.tsx');
  const renderer = read('src/scene/HomeObjectRenderer.tsx');
  const layout = read('src/home/layouts.ts');
  const lockedSource = read('src/scene/LockedRoom.tsx');
  assert.match(source, /function KoiPond/);
  assert.match(source, /function buildKoiPond/);
  assert.match(source, /function buildCherryTree/);
  assert.match(renderer, /case 'BlossomTree'/);
  assert.match(renderer, /case 'KoiPond'/);
  assert.match(source, /build=\{buildKoiPond\} scale=\{0\.21\}/);
  assert.match(source, /function buildIvoryKoi/);
  assert.match(source, /function buildRoseKoi/);
  assert.equal((source.match(/<group ref=\{(?:sunset|blush|golden|ivory|rose)\}>/g) ?? []).length, 5);
  assert.match(renderer, /case 'Bench'/);
  assert.match(layout, /'koi-pond-medium', \[-9\.2, 0, 4\.55\]/);
  assert.match(layout, /'blossom-tree', \[-14\.5, 0, -2\.7\]/);
  assert.match(layout, /'garden-bench', \[-12\.8, 0, 3\.6\]/);
  assert.doesNotMatch(source, /function BlossomDrift/);
  assert.match(source, /const exposedEastZ = 8/);
  assert.match(source, /v\.box\(x1, 0, exposedEastZ/);
  assert.doesNotMatch(source, /v\.box\(x1, 0, z0, 1, 3, z1 - z0 \+ 1/);
  assert.match(lockedSource, /spanX - 1/);
  assert.match(lockedSource, /const x0 = -32, x1 = 12, z0 = -24, z1 = 20/);
});

test('home header includes an obvious days-together feature', () => {
  const source = read('src/app/index.tsx');
  assert.match(source, /useHomeProgress\(\)\.days/);
  assert.match(source, /Day \{togetherDay\} of being together/);
  assert.match(source, /styles\.togetherLabel/);
  assert.doesNotMatch(source, /♥ Day/);
  assert.doesNotMatch(source, /togetherBadge/);
});

test('couple membership gives both phones one permanent red and green avatar identity', () => {
  const { avatarIdentityFor } = loadTsModule('src/state/avatarIdentity.ts');
  assert.deepEqual(avatarIdentityFor('member-a', 'member-a'), {
    myAvatar: 'a',
    partnerAvatar: 'b',
  });
  assert.deepEqual(avatarIdentityFor('member-b', 'member-a'), {
    myAvatar: 'b',
    partnerAvatar: 'a',
  });

  const home = read('src/scene/HomeScene.tsx');
  assert.match(home, /useAvatarStore/);
  assert.match(home, /appearanceToAvatarColors\(avatarA\)/);
  assert.match(home, /appearanceToAvatarColors\(avatarB\)/);
  assert.doesNotMatch(home, /selfColors|partnerColors|iAmA/);

  const sync = read('src/state/useHearthSync.ts');
  const moments = read('src/state/momentV2Store.ts');
  const avatar = read('src/scene/Avatar.tsx');
  assert.match(sync, /avatarIdentityFor\(userId, memberA\)/);
  assert.match(moments, /latestPresenceForUser\(snapshot\?\.presence \?\? \[\], ctx\.userId\)/);
  assert.match(moments, /latestPresenceForUser\(snapshot\?\.presence \?\? \[\], ctx\.partnerId\)/);
  assert.match(moments, /scene\.setSpot\(ctx\.myAvatar, mine\?\.destination \?\? 'idle'\)/);
  assert.match(moments, /scene\.setSpot\(ctx\.partnerAvatar, partner\?\.destination \?\? 'idle'\)/);
  assert.match(avatar, /active\?\.author_id === userId \? active\.destination : null/);
  assert.doesNotMatch(moments, /mySignal|partnerSignal/);
});

test('Moments uses feeling-led editorial controls and tactile states', () => {
  const controller = read('src/components/MomentsController.tsx');
  const home = read('src/app/index.tsx');
  const note = read('src/components/MomentNoteComposer.tsx');
  const surfaceStore = read('src/state/momentsSurfaceStore.ts');
  assert.match(controller, /How do you feel right now\?/);
  assert.match(controller, /About us/);
  assert.match(controller, /What I need/);
  assert.match(controller, /aboutUs\.map/);
  assert.match(controller, /whatINeed\.map/);
  assert.doesNotMatch(home, /HouseholdStatusRibbon/);
  assert.match(home, /<HearthStatusCard/);
  assert.match(home, /<FireplaceReconnectBubble/);
  assert.doesNotMatch(home, /RitualFireOrb/);
  assert.match(controller, /Choose what you need/);
  assert.match(controller, /Cancel this moment/);
  assert.match(controller, /BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.match(controller, /accessibilityActions=\{expanded/);
  assert.match(controller, /Gesture\.Pan\(\)/);
  assert.match(controller, /KeyboardAvoidingView/);
  assert.match(surfaceStore, /expanded: false/);
  assert.doesNotMatch(surfaceStore, /useMomentV2Store|snapshot|subscribe/);
  assert.match(note, /maxLength=\{240\}/);
  assert.match(note, /value\.length >= 200/);
  assert.equal(loadTsModule('src/copy/index.ts').MOMENT_V2.notePlaceholder, 'Write one sentence…');
  assert.doesNotMatch(controller, /SignalSheet|SignalCards|openCount|needsActionCount/);
  assert.doesNotMatch(controller, /Connect this signal|Part of the same conversation/);
  assert.doesNotMatch(`${note}\n${controller}`, /borderRadius: 999/);
});

test('F1 exposes all six complete fireplace pathways and shared readiness choices', () => {
  const copy = loadTsModule('src/copy/index.ts');
  assert.deepEqual(
    copy.FIREPLACE_PATHWAYS.map((pathway) => pathway.id),
    ['stay_close', 'talk_through', 'hear_first', 'acknowledge_hurt', 'apologize', 'more_time'],
  );
  assert.deepEqual(
    copy.FIREPLACE_PATHWAYS.map((pathway) => pathway.outcome),
    [
      'You chose closeness today.',
      'You made space to talk.',
      'You made room to listen.',
      'The hurt was acknowledged together.',
      'An apology was offered and received.',
      'You gave each other time.',
    ],
  );
  assert.deepEqual(
    copy.FIREPLACE_READINESS.map((choice) => choice.id),
    ['ready', 'not_ready'],
  );
  assert.match(read('src/moments/consequenceCatalog.ts'), /'not_now'/);
  assert.equal(copy.FIREPLACE_NEEDS.length, 7, 'legacy needs remain hydratable');
  assert.equal(copy.fireplaceNeedLabel('reassurance'), 'I need reassurance.');
  assert.deepEqual(
    copy.MOMENT_FEELINGS.map((choice) => choice.type),
    ['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic'],
  );
  for (const feeling of copy.MOMENT_FEELINGS) {
    assert.ok(feeling.feeling && feeling.location && feeling.purpose && feeling.invitation);
  }
  for (const signal of Object.values(copy.SIGNALS)) {
    assert.ok(signal.responses.every((response) => response.action && response.label && response.meaning));
  }

  const controller = read('src/components/MomentsController.tsx');
  assert.match(controller, /FIREPLACE_PATHWAYS\.filter[\s\S]*\.map/);
  assert.match(controller, /MOMENT_FEELINGS\.filter/);
  assert.match(controller, /aboutUs\.map/);
  assert.match(controller, /whatINeed\.map/);
  const heart = read('src/components/FireplaceReconnectBubble.tsx');
  assert.match(heart, /Tap to reconnect/);
  assert.match(heart, /Tap if you need more time/);
  assert.match(heart, /setReadiness\(active\.signal_id, !mineOn\)/);
  assert.match(controller, /We talked — resolve/);
  assert.match(controller, /MomentNoteComposer/);
  assert.doesNotMatch(controller, /Connect this signal|Choose an open moment|Continue when ready/);

  const store = read('src/state/momentV2Store.ts');
  assert.match(store, /snapshot: MomentSnapshotV2 \| null/);
  assert.match(store, /get_moment_snapshot_v2/);
  assert.match(store, /newestRefresh/);
  assert.match(store, /newestAppliedRefresh/);
  assert.match(store, /newestAppliedRefresh = newestRefresh/);
  for (const rpc of [
    'start_moment',
    'move_to_moment',
    'leave_moment',
    'return_to_moment',
    'respond_to_moment',
    'set_moment_readiness',
    'resolve_moment',
    'cancel_moment',
    'remove_moment_note',
  ]) assert.match(store, new RegExp(`'${rpc}'`));
  assert.doesNotMatch(store, /\.from\('signals'\)\.(insert|update|delete)/);

  const sync = read('src/state/useHearthSync.ts');
  for (const table of ['signals', 'signal_presence', 'moment_sessions', 'moment_completion_events']) {
    assert.match(sync, new RegExp(`table: '${table}'`));
  }
  assert.match(sync, /setTimeout\(\(\) => void hydrateNow\(false\), 350\)/);

  const notifications = read('src/lib/notifications.ts');
  assert.match(notifications, /scheduleNotificationAsync/);
  assert.match(notifications, /cancelScheduledNotificationAsync/);
  assert.doesNotMatch(notifications, /reconcileMomentReturnNotification/);
});

test('calm Moments selectors and live completion fencing are explicit', () => {
  const store = read('src/state/signalStore.ts');
  const cards = read('src/components/SignalCards.tsx');
  const sheet = read('src/components/SignalSheet.tsx');
  for (const selector of [
    'selectOpenMomentCount',
    'selectNeedsActionCount',
    'selectStableFocusedThread',
    'selectCurrentUserPresence',
    'selectLiveCompletionTransition',
  ]) assert.match(store, new RegExp(`export const ${selector}`));
  assert.doesNotMatch(store, /p_move_to_interaction/);
  assert.doesNotMatch(store, /result\.data === true[\s\S]{0,100}triggerGlow/);
  assert.match(store, /scene\.reduceMotion \? 1250 : 2500/);
  assert.match(store, /scene\.setSpot\(ctx\.myAvatar, 'fireplace'\)/);
  assert.match(store, /scene\.setSpot\(ctx\.partnerAvatar, 'fireplace'\)/);
  assert.match(store, /set\(\{ liveCompletion: null \}\)/);
  assert.match(cards, /useSignalStore\(useShallow\(selectSortedThreads\)\)/);
  assert.doesNotMatch(sheet, /selectSortedThreads|useShallow/);
  assert.doesNotMatch(cards, /useSignalStore\(selectSortedThreads\)/);

  const { liveCompletionTransitions } = loadTsModule('src/state/completionTransition.ts');
  const thread = (phase, completedAt = null) => ({
    id: 'moment-1',
    session: { phase, completed_at: completedAt },
  });
  const completedAt = '2026-08-12T10:00:00.000Z';
  assert.deepEqual(
    liveCompletionTransitions([thread('continue')], [thread('completed', completedAt)], new Set(), false),
    [{ signalId: 'moment-1', completedAt: Date.parse(completedAt) }],
  );
  assert.deepEqual(
    liveCompletionTransitions([], [thread('completed', completedAt)], new Set(), true),
    [],
    'cold hydration must not replay completion',
  );
  assert.deepEqual(
    liveCompletionTransitions([thread('continue')], [thread('completed', completedAt)], new Set(['moment-1']), false),
    [],
    'duplicate/out-of-order refreshes are fenced by signal id',
  );

  const heart = read('src/scene/ReconcileHeart.tsx');
  const fullscreenHeart = read('src/components/PixelHeartPayoff.tsx');
  const atmosphere = read('src/scene/Atmosphere.tsx');
  assert.match(heart, /momentPayoff\?\.destination === 'romantic'/);
  assert.match(heart, /atmo\.reduceMotion \? 0\.5 : 0\.8/);
  assert.match(fullscreenHeart, /payoff\.destination !== 'romantic'/);
  assert.match(fullscreenHeart, /reduceMotion \? 1 : withTiming/);
  assert.match(atmosphere, /reduce \? 1\.25 : GLOW_DURATION/);
});

test('typed legacy state never exposes internal markers as response copy', () => {
  const model = loadTsModule('src/state/interactionModel.ts');
  const snapshot = {
    signals: [{
      id: 'legacy', couple_id: 'couple', from_user: 'partner', recipient_user_id: 'me',
      type: 'fireplace', created_at: '2026-08-12T08:00:00.000Z',
      latest_activity_at: '2026-08-12T08:00:00.000Z', resolved_at: null,
    }],
    groups: [], presence: [], sessions: [], participants: [],
    legacy_state: [{
      signal_id: 'legacy', need: 'reassurance', response: '__hearth_future_v2__:private',
      response_at: '2026-08-12T08:05:00.000Z', author_returned_at: null,
      author_left_at: null, responder_left_at: null,
    }],
    legacy_responses: [],
  };
  const [thread] = model.buildInteractionThreads(snapshot);
  assert.equal(thread.legacy.need, 'reassurance');
  assert.equal(model.responseFor(thread), null);
  assert.equal(model.isInternalResponseChoice('__hearth_anything__:value'), true);
});

test('interaction stack keeps three authored and two received moments independently actionable', () => {
  const model = loadTsModule('src/state/interactionModel.ts');
  const now = Date.parse('2026-08-11T12:00:00.000Z');
  const iso = (offset) => new Date(now + offset).toISOString();
  const signals = [
    ['mine-1', 'me', 'group-1', -5000],
    ['mine-2', 'me', 'group-2', -4000],
    ['mine-3', 'me', 'group-3', -3000],
    ['theirs-1', 'partner', 'group-4', -2000],
    ['theirs-2', 'partner', 'group-5', -1000],
  ].map(([id, from, group, offset]) => ({
    id,
    couple_id: 'couple',
    from_user: from,
    recipient_user_id: from === 'me' ? 'partner' : 'me',
    type: 'fireplace',
    group_id: group,
    created_at: iso(offset),
    latest_activity_at: iso(offset),
    resolved_at: null,
  }));
  const sessions = signals.map((signal, index) => ({
    signal_id: signal.id,
    pathway: ['stay_close', 'talk_through', 'hear_first', 'acknowledge_hurt', 'apologize'][index],
    phase: 'waiting',
    initiator_timezone: 'Europe/Brussels',
    scheduled_for: signal.id === 'mine-3' ? iso(60 * 60 * 1000) : null,
    scheduled_by_user_id: null,
    returned_at: null,
    outcome_key: null,
    completed_at: null,
    expires_at: null,
    created_at: signal.created_at,
    updated_at: signal.created_at,
  }));
  const participants = signals.flatMap((signal) => [
    {
      signal_id: signal.id,
      user_id: signal.from_user,
      participant_role: 'author',
      sentence: null,
      sentence_redacted_at: null,
      response_action: null,
      responded_at: null,
      action_completed_at: null,
      readiness: null,
      readiness_at: null,
      related_prompt_signal_id: null,
      related_settlement_decision: null,
    },
    {
      signal_id: signal.id,
      user_id: signal.from_user === 'me' ? 'partner' : 'me',
      participant_role: 'partner',
      sentence: null,
      sentence_redacted_at: null,
      response_action: null,
      responded_at: null,
      action_completed_at: null,
      readiness: null,
      readiness_at: null,
      related_prompt_signal_id: null,
      related_settlement_decision: null,
    },
  ]);
  const threads = model.buildInteractionThreads({
    signals,
    groups: [],
    presence: [],
    sessions,
    participants,
    legacy_responses: [],
  });

  assert.equal(threads.filter((thread) => thread.fromUser === 'me').length, 3);
  assert.equal(threads.filter((thread) => thread.fromUser === 'partner').length, 2);
  assert.ok(threads.every(model.isOpenThread));
  assert.deepEqual(
    model.sortInteractionThreads(threads, 'me', now).map((thread) => thread.id),
    ['theirs-2', 'theirs-1', 'mine-3', 'mine-2', 'mine-1'],
  );
});

test('structured presence chooses only the newest intentional location and leaving returns idle', () => {
  const model = loadTsModule('src/state/interactionModel.ts');
  const signal = (id, from, type, createdAt) => ({
    id,
    couple_id: 'couple',
    from_user: from,
    recipient_user_id: from === 'me' ? 'partner' : 'me',
    type,
    group_id: id,
    created_at: createdAt,
    latest_activity_at: createdAt,
    resolved_at: null,
  });
  const snapshot = {
    signals: [
      signal('older', 'me', 'garden', '2026-08-11T09:00:00.000Z'),
      signal('newer', 'partner', 'fireplace', '2026-08-11T10:00:00.000Z'),
    ],
    groups: [],
    presence: [
      { signal_id: 'older', user_id: 'me', is_current: false, moved_at: '2026-08-11T09:00:00.000Z', left_at: '2026-08-11T10:30:00.000Z', created_at: '2026-08-11T09:00:00.000Z', updated_at: '2026-08-11T10:30:00.000Z' },
      { signal_id: 'newer', user_id: 'me', is_current: true, moved_at: '2026-08-11T10:30:00.000Z', left_at: null, created_at: '2026-08-11T10:30:00.000Z', updated_at: '2026-08-11T10:30:00.000Z' },
      { signal_id: 'older', user_id: 'partner', is_current: true, moved_at: '2026-08-11T10:15:00.000Z', left_at: null, created_at: '2026-08-11T10:15:00.000Z', updated_at: '2026-08-11T10:15:00.000Z' },
    ],
    sessions: [],
    participants: [],
    legacy_responses: [],
  };
  let threads = model.buildInteractionThreads(snapshot);
  assert.equal(model.currentThreadForUser(threads, 'me').thread.id, 'newer');
  assert.equal(model.currentThreadForUser(threads, 'partner').thread.id, 'older');
  assert.equal(threads.filter(model.isOpenThread).length, 2, 'moving did not resolve either moment');

  snapshot.presence[1] = {
    ...snapshot.presence[1],
    is_current: false,
    left_at: '2026-08-11T11:00:00.000Z',
    updated_at: '2026-08-11T11:00:00.000Z',
  };
  threads = model.buildInteractionThreads(snapshot);
  assert.equal(model.currentThreadForUser(threads, 'me'), null);
  assert.equal(model.currentThreadForUser(threads, 'partner').thread.id, 'older');
  assert.equal(threads.filter(model.isOpenThread).length, 2);
});

test('connected groups, repeated outcomes, expiry, and legacy hydration stay explicit', () => {
  const model = loadTsModule('src/state/interactionModel.ts');
  const now = Date.parse('2026-08-11T12:00:00.000Z');
  const completedSignal = (id, completedAt, expiresAt) => ({
    id,
    couple_id: 'couple',
    from_user: 'me',
    recipient_user_id: 'partner',
    type: 'fireplace',
    group_id: 'connected-group',
    created_at: completedAt,
    latest_activity_at: completedAt,
    resolved_at: completedAt,
  });
  const session = (id, completedAt, expiresAt) => ({
    signal_id: id,
    pathway: 'stay_close',
    phase: 'completed',
    initiator_timezone: 'Europe/Brussels',
    scheduled_for: null,
    scheduled_by_user_id: null,
    returned_at: null,
    outcome_key: 'stay_close',
    completed_at: completedAt,
    expires_at: expiresAt,
    created_at: completedAt,
    updated_at: completedAt,
  });
  const expires = '2026-08-12T22:00:00.000Z';
  const snapshot = {
    signals: [
      completedSignal('done-1', '2026-08-11T10:00:00.000Z', expires),
      completedSignal('done-2', '2026-08-11T11:00:00.000Z', expires),
      { id: 'legacy', couple_id: 'couple', from_user: 'partner', recipient_user_id: 'me', type: 'fireplace', created_at: '2026-08-10T08:00:00.000Z', latest_activity_at: '2026-08-10T08:00:00.000Z', resolved_at: null },
    ],
    groups: [{ id: 'connected-group', couple_id: 'couple', created_by: 'me', created_at: '2026-08-11T10:00:00.000Z', signal_count: 2 }],
    presence: [],
    sessions: [session('done-1', '2026-08-11T10:00:00.000Z', expires), session('done-2', '2026-08-11T11:00:00.000Z', expires)],
    participants: [],
    legacy_responses: [
      { id: 'need', signal_id: 'legacy', from_user: 'partner', choice: '__hearth_fireplace_need_v1__:reassurance', created_at: '2026-08-10T08:00:01.000Z' },
      { id: 'join', signal_id: 'legacy', from_user: 'me', choice: 'Sit beside them', created_at: '2026-08-10T08:01:00.000Z' },
    ],
  };
  const threads = model.buildInteractionThreads(snapshot);
  assert.equal(threads.find((thread) => thread.id === 'done-1').groupSize, 2);
  assert.equal(threads.find((thread) => thread.id === 'legacy').legacy.need, 'reassurance');
  assert.equal(model.currentThreadForUser(threads, 'me').thread.id, 'legacy');
  assert.deepEqual(model.outcomePathways(threads, now), ['stay_close']);
  assert.equal(model.outcomeThreads(threads, 'stay_close', now).length, 2);
  assert.equal(model.outcomeThreads(threads, 'stay_close', Date.parse(expires)).length, 0);

  const outcomes = read('src/scene/objects/FireplaceOutcomes.tsx');
  assert.match(outcomes, /const SOCKETS/);
  const sockets = outcomes.slice(outcomes.indexOf('const SOCKETS'), outcomes.indexOf('export function'));
  assert.equal((sockets.match(/^  [a-z_]+: \[/gm) ?? []).length, 6);
  assert.match(read('src/components/SignalCards.tsx'), /accessibilityRole="button"/);
  assert.match(read('src/scene/Avatar.tsx'), /if \(atmo\.reduceMotion\)/);
  assert.match(read('src/scene/Atmosphere.tsx'), /if \(reduce\) \{[\s\S]{0,240}voxelTint\.copy/);
});

test('daily drawing read receipts persist per drawing and the day label shares Hearth typography', () => {
  const { drawingFingerprint, drawingWasSeen } = loadTsModule(
    'src/state/drawingReceipt.ts',
  );
  const drawing = { id: 'drawing-1', updated_at: '2026-08-04T10:00:00.000Z' };
  const fingerprint = drawingFingerprint(drawing);
  assert.equal(fingerprint, 'drawing-1:2026-08-04T10:00:00.000Z');
  assert.equal(drawingWasSeen(null, drawing), false);
  assert.equal(drawingWasSeen(fingerprint, drawing), true);
  assert.equal(
    drawingWasSeen(fingerprint, { ...drawing, updated_at: '2026-08-04T11:00:00.000Z' }),
    false,
  );
  assert.equal(drawingWasSeen(null, null), true);

  const prefs = read('src/lib/prefs.ts');
  const store = read('src/state/drawingStore.ts');
  const component = read('src/components/DailyDrawing.tsx');
  const home = read('src/app/index.tsx');
  assert.match(prefs, /DRAWING_SEEN_KEY.*coupleId.*userId.*day/s);
  assert.match(store, /getSeenDrawing\(coupleId, userId, todayStr\(\)\)/);
  assert.match(store, /setSeenDrawing\(coupleId, userId, todayStr\(\), partnerDrawingFingerprint\)/);
  assert.match(
    component,
    /surface === 'today' && tab === 'theirs' && partnerGrid && !partnerSeen/,
  );
  assert.match(component, /useDrawingStore\.subscribe/);
  assert.match(home, /style=\{\[styles\.headerText, styles\.title\]\}/);
  assert.match(home, /style=\{\[styles\.headerText, styles\.togetherLabel\]\}/);
});

test('DR1 stores smooth portrait sketches with a legacy fallback', () => {
  const codec = loadTsModule('src/state/drawingCodec.ts');
  const stroke = loadTsModule('src/state/drawingStroke.ts');
  const store = read('src/state/drawingStore.ts');
  const canvas = read('src/components/DrawingCanvas.tsx');
  const daily = read('src/components/DailyDrawing.tsx');
  const sketchbook = read('src/components/Sketchbook.tsx');
  const rituals = read('src/components/RitualsButton.tsx');
  const easel = read('src/scene/objects/Easel.tsx');
  const home = read('src/app/index.tsx');

  assert.equal(codec.PORTRAIT_WIDTH, 128);
  assert.equal(codec.PORTRAIT_HEIGHT, 160);
  const legacy32 = `0${'.'.repeat(32 * 32 - 1)}`;
  const legacy64 = `1${'.'.repeat(64 * 64 - 1)}`;
  assert.deepEqual(codec.decodeDrawingGrid(legacy32), {
    width: 32,
    height: 32,
    pixels: legacy32,
  });
  assert.deepEqual(codec.decodeDrawingGrid(legacy64), {
    width: 64,
    height: 64,
    pixels: legacy64,
  });
  const portraitCells = codec.EMPTY_PORTRAIT_GRID.split('');
  portraitCells[0] = '2';
  portraitCells[80 * 128 + 64] = '3';
  portraitCells[159 * 128 + 127] = '4';
  const portrait = portraitCells.join('');
  assert.deepEqual(codec.decodeDrawingGrid(portrait), {
    width: 128,
    height: 160,
    pixels: portrait,
  });
  const encoded = codec.encodeDrawingGrid(portrait);
  assert.equal(encoded.slice(0, 64 * 64).length, 64 * 64);
  assert.equal(codec.decodeDrawingGrid(encoded).pixels, portrait);
  assert.equal(codec.decodeDrawingTitle(encoded), '');
  const named = codec.encodeDrawingGrid(portrait, '  Rainy   Sunday / us  ');
  assert.equal(codec.decodeDrawingGrid(named).pixels, portrait);
  assert.equal(codec.decodeDrawingTitle(named), 'Rainy Sunday / us');
  assert.equal(named.slice(0, 64 * 64), encoded.slice(0, 64 * 64));
  assert.equal(codec.drawingFallback(encoded).width, 64);
  assert.ok(codec.drawingFallback(encoded).pixels.includes('3'));

  const blank = '.'.repeat(128 * 160);
  const brushCounts = [0.5, 1.25, 2.5, 4.5].map((radius) => {
    const result = stroke.paintRasterStroke(
      blank,
      128,
      160,
      null,
      [{ x: 64, y: 80 }],
      '1',
      radius,
    );
    return [...result.pixels].filter((cell) => cell === '1').length;
  });
  assert.ok(brushCounts.every((count, index) => index === 0 || count > brushCounts[index - 1]));
  const line = stroke.paintRasterStroke(
    blank,
    128,
    160,
    null,
    [{ x: 2, y: 20 }, { x: 120, y: 20 }],
    '5',
    0.5,
  ).pixels;
  for (let x = 2; x <= 120; x++) assert.equal(line[20 * 128 + x], '5');
  const clipped = stroke.paintRasterStroke(
    blank,
    128,
    160,
    null,
    [{ x: 0, y: 0 }],
    '6',
    4.5,
  ).pixels;
  assert.equal(clipped.length, blank.length);
  const erased = stroke.paintRasterStroke(
    clipped,
    128,
    160,
    null,
    [{ x: 0, y: 0 }],
    '.',
    4.5,
  ).pixels;
  assert.equal(erased[0], '.');

  assert.match(store, /encodeDrawingGrid\(get\(\)\.myGrid, title\)/);
  assert.match(store, /partnerTitle: decodeDrawingTitle\(row\.grid\)/);
  assert.match(canvas, /requestAnimationFrame\(flushFrame\)/);
  assert.match(canvas, /Extra fine.*Fine.*Medium.*Bold/s);
  assert.match(canvas, /color < 0 \? '\.' : String\(color\), brush\.radius/);
  assert.match(canvas, /onTouchStart=\{beginDrawing\}/);
  assert.match(canvas, /onStartShouldSetResponderCapture=\{\(\) => true\}/);
  assert.match(canvas, /onMoveShouldSetResponderCapture=\{\(\) => true\}/);
  assert.match(canvas, /onResponderTerminationRequest=\{\(\) => false\}/);
  assert.match(canvas, /onDrawingActiveChange\?\.\(true\)/);
  assert.match(canvas, /onDrawingActiveChange\?\.\(false\)/);
  assert.match(daily, /scrollEnabled=\{!drawingActive\}/);
  assert.match(daily, /onDrawingActiveChange=\{setDrawingActive\}/);
  assert.match(daily, /accessibilityLabel="Drawing title"/);
  assert.match(daily, /maxLength=\{DRAWING_TITLE_MAX_LENGTH\}/);
  assert.match(daily, /Today’s sketch/);
  assert.match(daily, /Send it/);
  assert.match(daily, /Sent — they can see it now\./);
  assert.doesNotMatch(daily, /added to your sketchbook|Send to sketchbook/);
  assert.match(store, /\.select\('day,from_user'\).*\.order\('day', \{ ascending: true \}\)/s);
  assert.match(store, /loadSketchbookDay.*sketchbookPages\[day\]/s);
  assert.match(store, /\.from\('profiles'\).*\.select\('id,display_name'\)/s);
  assert.match(sketchbook, /TURN_DURATION = 320/);
  assert.match(sketchbook, /REDUCED_TURN_DURATION = 140/);
  assert.match(sketchbook, /deltaX > 45.*navigate\('earlier'\)/s);
  assert.match(sketchbook, /deltaX < -45.*navigate\('later'\)/s);
  assert.match(sketchbook, /inputLockedRef\.current = true/);
  assert.match(sketchbook, /loadSketchbookDay\(earlier, true\)/);
  assert.match(sketchbook, /loadSketchbookDay\(later, true\)/);
  assert.match(sketchbook, /voxel-open-book\.png/);
  assert.match(sketchbook, /title=\{spread\.memberATitle\}/);
  assert.match(sketchbook, /title=\{spread\.memberBTitle\}/);
  assert.doesNotMatch(sketchbook, /A quiet page|quietMark|quietText|styles\.rule/);
  assert.ok(existsSync(join(root, 'assets/images/sketchbook/voxel-open-book.png')));
  assert.match(rituals, /requestSketchbook\(\)/);
  assert.match(rituals, /left: 18/);
  assert.match(rituals, /buttonAtBottom: \{ bottom: 102 \}/);
  assert.match(rituals, /buttonAboveSignal: \{ bottom: 184 \}/);
  assert.match(home, /<RitualsButton \/>/);
  assert.match(easel, /const S = 0\.125/);
  assert.match(easel, /const FW = 16/);
  assert.match(easel, /usePictureGeometry\(partnerGrid\)/);
  assert.doesNotMatch(easel, /mineSaved|myGrid/);
});

test('global backdrop cannot depth-clip the garden or another room', () => {
  const source = read('src/scene/rooms/LivingRoom.tsx');
  assert.match(source, /position=\{\[-12, 0\.4, -21\]\}/);
  assert.match(source, /renderOrder=\{-1000\}/);
  assert.match(source, /depthTest: false/);
  assert.match(source, /depthWrite: false/);
  assert.match(source, /depthWrite=\{false\}/);
  assert.match(source, /pos\[i \* 3\] = -18 \+ u \* rx/);
  assert.match(source, /pos\[i \* 3 \+ 2\] = -18 - u \* rx/);
  assert.doesNotMatch(source, /position=\{\[0, 0\.4, -9\]\}/);

  // The old x+z=-9 plane intersected the garden (whose minimum x+z is below
  // -9). The replacement x+z=-33 plane is behind the complete house.
  const minimumGardenSum = -13.25 + -2;
  assert.ok(minimumGardenSum < -9, 'regression setup must cross the old plane');
  assert.ok(minimumGardenSum > -33, 'new backdrop must stay behind the garden');
});

test('locked-room copy uses the real day-21 and day-30 milestones', () => {
  const { lockedRoomCopy } = loadNavigation();

  assert.deepEqual(lockedRoomCopy('bedroom', 20.2), {
    title: 'Bedroom',
    detail: 'Unlocks in 1 day',
  });
  assert.deepEqual(lockedRoomCopy('garden', 12), {
    title: 'Garden',
    detail: 'Unlocks in 18 days',
  });
  assert.equal(lockedRoomCopy('living', 0), null);
});

test('rest-nook seats keep full avatar heads from intersecting', () => {
  const { SPOTS } = loadTsModule('src/scene/spots.ts');
  const a = SPOTS.rest.a;
  const b = SPOTS.rest.b;
  const separation = Math.hypot(a.x - b.x, a.z - b.z);

  assert.ok(separation >= 0.84, `rest seats need 0.84 clearance, got ${separation}`);
  assert.match(read('src/scene/objects/RestNook.tsx'), /v\.box\(0, 0, 0, 8, 1, 4/);
});

test('room features are isolated behind one shared composition module', () => {
  const entry = read('src/scene/Room.tsx').trim();
  const composition = read('src/scene/rooms/RoomComposition.tsx');
  const garden = read('src/scene/rooms/Garden.tsx');
  const bedroom = read('src/scene/rooms/Bedroom.tsx');
  const living = read('src/scene/rooms/LivingRoom.tsx');

  assert.equal(entry, "export { Room } from './rooms/RoomComposition';");
  assert.match(composition, /import \{ Garden \} from '\.\/Garden'/);
  assert.match(composition, /import \{ Bedroom \} from '\.\/Bedroom'/);
  assert.match(composition, /import \{ LivingRoom, VoidBackdrop \} from '\.\/LivingRoom'/);
  assert.match(garden, /export function Garden\(\{ tier \}/);
  assert.match(bedroom, /export function Bedroom\(\)/);
  assert.match(living, /export function LivingRoom\(\)/);
  assert.doesNotMatch(garden, /from '\.\/Bedroom'|from '\.\/LivingRoom'/);
  assert.doesNotMatch(bedroom, /from '\.\/Garden'|from '\.\/LivingRoom'/);
});

test('dollhouse uses shared-wall rooms with the garden at the west doorway', () => {
  const homeSource = read('src/scene/HomeScene.tsx');
  const roomSource = read('src/scene/rooms/RoomComposition.tsx');
  const gardenSource = read('src/scene/rooms/Garden.tsx');
  const livingSource = read('src/scene/rooms/LivingRoom.tsx');
  const bedroomSource = read('src/scene/rooms/Bedroom.tsx');
  const shellSource = read('src/scene/shell.ts');
  assert.doesNotMatch(roomSource, /RoomConnector|<Bridge/);
  assert.doesNotMatch(roomSource, /buildBedroomVestibule|buildBedroomArch/);
  const { ROOM_STOPS } = loadNavigation();
  assert.deepEqual(ROOM_STOPS.garden, { id: 'garden', x: -10, z: 2 });
  assert.deepEqual(ROOM_STOPS.bedroom, { id: 'bedroom', x: 4.5, z: -6.5 });

  const scale = 0.25;
  const livingWallInnerZ = -17 * scale;
  const bedroomFrontZ = ROOM_STOPS.bedroom.z + 9 * scale;
  assert.equal(
    bedroomFrontZ,
    livingWallInnerZ,
    'bedroom floor must meet the living wall with no bridge or void gap',
  );

  const bedroomSocketStart = 11;
  const bedroomSocketWidth = 6;
  const sofaMaxX = -0.4 + 11 * scale;
  const archLeftPostMinX = (bedroomSocketStart - 1) * scale;
  const clearance = archLeftPostMinX - sofaMaxX;
  assert.ok(clearance > 0, `sofa needs positive arch-post clearance, got ${clearance}`);
  assert.ok(Math.abs(clearance - 0.15) < 1e-9);

  const sofa = { minX: -0.4, maxX: 2.35, minZ: -3.95, maxZ: -2.7 };
  const neighbours = {
    fireplace: { minX: -3.45, maxX: -0.95, minZ: -4.08, maxZ: -2.6 },
    bookshelf: { minX: -4.18, maxX: -3.78, minZ: -2.35, maxZ: -1.15 },
    table: { minX: -0.35, maxX: 0.85, minZ: -0.65, maxZ: 2.65 },
    'rest nook': { minX: -3.15, maxX: -1.87, minZ: 3.2, maxZ: 3.84 },
  };
  for (const [name, box] of Object.entries(neighbours)) {
    const axisClearance = Math.max(
      box.minX - sofa.maxX,
      sofa.minX - box.maxX,
      box.minZ - sofa.maxZ,
      sofa.minZ - box.maxZ,
    );
    assert.ok(axisClearance > 0, `sofa must clear ${name}, got ${axisClearance}`);
  }

  const livingRightEdge = 21 * scale;
  const archOpeningMaxX = (bedroomSocketStart + bedroomSocketWidth) * scale;
  assert.ok(
    livingRightEdge - archOpeningMaxX >= 1,
    'bedroom arch must be inset from the living-room corner',
  );

  assert.match(shellSource, /bedroom: \{ wall: 'back', start: 11, width: 6 \}/);
  assert.match(shellSource, /garden: \{ wall: 'left', start: 9, width: 5 \}/);
  assert.doesNotMatch(roomSource, /buildGardenPath/);
  assert.match(gardenSource, /function buildGardenGateway\(v: Vox\)/);
  assert.match(gardenSource, /export function GardenThreshold\(\)/);
  assert.match(read('src/scene/HomeObjectRenderer.tsx'), /case 'GardenThreshold'/);
  // Historical trees may still contain the old passage. Both forms must keep
  // the garden-owned replacement present and floor-free.
  if (roomSource.includes('function GardenPassage()')) {
    assert.match(roomSource, /position=\{\[-4\.5, 0, 2\.25\]\}/);
  } else {
    assert.doesNotMatch(roomSource, /GardenPassage|buildGardenArch/);
  }
  assert.match(gardenSource, /const threshold = x >= 10 && z >= 0 && z <= 3/);
  assert.match(gardenSource, /showRightEdge=\{false\}/);
  assert.match(bedroomSource, /buildCornerShell\(v, -10, 9, -10, 8\)/);
  assert.match(bedroomSource, /v\.remove\(-11, 0, 8, 1, 15, 1\)/);
  assert.match(
    bedroomSource,
    /PlatformFx x0=\{-2\.75\} x1=\{2\.5\} z0=\{-2\.75\} z1=\{2\.25\}/,
  );
  assert.match(roomSource, /buildBedroomThreshold/);
  assert.match(livingSource, /const bedroomSocket = ROOM_SOCKETS\.bedroom/);
  assert.match(bedroomSource, /showFrontEdge=\{false\}/);
  assert.doesNotMatch(homeSource, /Kitchen/);
  const homeLayoutSource = read('src/home/layouts.ts');
  const homeCatalogSource = read('src/home/catalog.ts');
  const objectRendererSource = read('src/scene/HomeObjectRenderer.tsx');
  assert.match(objectRendererSource, /position=\{object\.renderPosition\} rotation=\{\[0, object\.rotationY, 0\]\}/);
  assert.match(objectRendererSource, /case 'Easel'/);
  assert.match(homeLayoutSource, /'drawing-easel', \[-4\.28, 0, 1\.08\], 1/);
  assert.match(homeCatalogSource, /renderOffset: \[0, 1\.2, 0\]/);
  assert.match(objectRendererSource, /case 'Bookshelf'/);
  assert.match(homeLayoutSource, /'cottage-bookshelf', \[-4\.18, 0, -2\.35\]/);
  const drawingWidth = 16 * 0.125;
  const drawingMinZ = 1.08 - drawingWidth;
  const bookshelfMaxZ = -2.35 + 7 * 0.2;
  const gardenDoorMinZ = 9 * 0.25;
  assert.ok(drawingMinZ > bookshelfMaxZ, 'daily drawing must clear the bookshelf');
  assert.ok(1.08 < gardenDoorMinZ, 'daily drawing must clear the garden doorway');
  assert.match(read('src/state/homeProgress.ts'), /PREVIEW_UNLOCK_ALL = false/);
  assert.match(read('src/state/homeProgress.ts'), /components: \['fireplace', 'restnook', 'easel', 'sofa', 'table'\]/);
  const platformSource = read('src/scene/PlatformFx.tsx');
  assert.match(platformSource, /const EDGE_WOOD = '#75452f'/);
  assert.match(platformSource, /const EDGE_HIGHLIGHT = '#c27a53'/);
  assert.doesNotMatch(platformSource, /0\.24, 0\.72, 1\.0|#37c4ff|neon-blue/);
  const { SPOTS } = loadTsModule('src/scene/spots.ts');
  assert.deepEqual(
    ['a', 'b'].map((avatar) => ({
      x: SPOTS.sofa[avatar].x,
      z: SPOTS.sofa[avatar].z,
      rotY: SPOTS.sofa[avatar].rotY,
      seatY: SPOTS.sofa[avatar].seatY,
    })),
    [
      { x: 0.25, z: -2.82, rotY: 0, seatY: 0.5 },
      { x: 1, z: -2.82, rotY: 0, seatY: 0.5 },
    ],
  );
  assert.deepEqual(SPOTS.sofa.a.egress, { x: 0.25, z: -2.28, rotY: 0 });
  assert.deepEqual(
    ['a', 'b'].map((avatar) => ({
      x: SPOTS.romantic[avatar].x,
      z: SPOTS.romantic[avatar].z,
      rotY: SPOTS.romantic[avatar].rotY,
      seatY: SPOTS.romantic[avatar].seatY,
    })),
    [
      { x: 4.08, z: -7.2, rotY: 0.28, seatY: 0.75 },
      { x: 4.92, z: -7.2, rotY: -0.28, seatY: 0.75 },
    ],
  );
  assert.deepEqual(SPOTS.romantic.b.egress, { x: 5.08, z: -6.05, rotY: 0 });
});

test('locked-room countdown shifts below active top overlays', () => {
  const source = read('src/scene/LockedRoomNotice.tsx');
  assert.match(source, /hasTopOverlay/);
  assert.match(source, /styles\.wrapShifted/);
});

test('pinch release cancels camera inertia', () => {
  const source = read('src/scene/usePan.ts');
  assert.match(source, /pinched\.current = true/);
  assert.match(source, /if \(pinched\.current\)/);
  assert.match(source, /camState\.velocityX = 0/);
});

test('furniture hitboxes drive collision-aware avatar routes', () => {
  const navigation = loadTsModule('src/scene/sceneNavigation.ts');
  const required = [
    'living.fireplace',
    'living.sofa',
    'living.table-and-chairs',
    'living.bookshelf',
    'living.daily-easel',
    'living.rest-nook',
    'garden.cherry-tree',
    'garden.koi-pond',
    'garden.lantern-left',
    'garden.lantern-right',
    'garden.bench',
    'bedroom.bed',
    'bedroom.wardrobe',
  ];
  const ids = new Set(navigation.SCENE_COLLIDERS.map((collider) => collider.id));
  for (const id of required) assert.ok(ids.has(id), `missing collider: ${id}`);

  const byId = new Map(navigation.SCENE_COLLIDERS.map((collider) => [collider.id, collider]));
  const gardenHeroes = ['garden.cherry-tree', 'garden.bench', 'garden.koi-pond'];
  for (let i = 0; i < gardenHeroes.length; i++) {
    for (let j = i + 1; j < gardenHeroes.length; j++) {
      const a = byId.get(gardenHeroes[i]);
      const b = byId.get(gardenHeroes[j]);
      const axisClearance = Math.max(
        b.minX - a.maxX,
        a.minX - b.maxX,
        b.minZ - a.maxZ,
        a.minZ - b.maxZ,
      );
      assert.ok(
        axisClearance >= 2.5,
        `${gardenHeroes[i]} and ${gardenHeroes[j]} need lawn between them, got ${axisClearance}`,
      );
    }
  }

  const routes = [
    navigation.planPath({ x: -1.8, z: -0.5 }, { x: 2.35, z: 0.65 }),
    navigation.planPath({ x: -1.3, z: 2.8 }, { x: -10.5, z: 6 }),
    navigation.planPath({ x: 2.8, z: -3.6 }, { x: 3.3, z: -5.3 }),
  ];
  for (const [routeIndex, route] of routes.entries()) {
    assert.ok(route.length > 1, 'route should contain collision-aware waypoints');
    for (let i = 1; i < route.length; i++) {
      const hit = navigation.segmentHitsCollider(route[i - 1], route[i]);
      assert.equal(
        hit,
        null,
        `route ${routeIndex + 1} segment ${i} crossed ${hit?.id ?? 'a collider'}: ${JSON.stringify(route)}`,
      );
    }
  }

  const { SPOTS } = loadTsModule('src/scene/spots.ts');
  for (const avatar of ['a', 'b']) {
    assert.equal(
      navigation.isWalkable(SPOTS.idle[avatar]),
      true,
      `idle.${avatar} must begin clear of furniture`,
    );
  }
  const expectedSeatCollider = {
    garden: 'garden.bench',
    romantic: 'bedroom.bed',
  };
  for (const id of ['garden', 'romantic']) {
    for (const avatar of ['a', 'b']) {
      const route = navigation.planPath(SPOTS.idle[avatar], SPOTS[id][avatar]);
      const destination = route.at(-1);
      assert.equal(destination.x, SPOTS[id][avatar].x, `${id}.${avatar} x must be reachable`);
      assert.equal(destination.z, SPOTS[id][avatar].z, `${id}.${avatar} z must be reachable`);
      for (let i = 1; i < route.length - 1; i++) {
        const hit = navigation.segmentHitsCollider(route[i - 1], route[i]);
        assert.equal(hit, null, `${id}.${avatar} crossed ${hit?.id ?? 'a collider'} before its seat`);
      }
      const finalHit = navigation.segmentHitsCollider(route.at(-2), destination);
      assert.equal(finalHit?.id, expectedSeatCollider[id]);
    }
  }
});

test('daily drawing is immediate and avatars walk briskly to random safe idle points', () => {
  const avatarSource = read('src/scene/Avatar.tsx');
  assert.match(avatarSource, /const WALK_SPEED = 1\.05/);
  assert.match(avatarSource, /const AMBIENT_SPEED = 0\.72/);
  assert.match(avatarSource, /const WALK_CADENCE = 10\.2/);
  assert.match(avatarSource, /randomLivingPoint\(/);
  assert.match(avatarSource, /const TABLE_ACTIVITY_CHANCE = 0\.3/);
  assert.match(avatarSource, /const chair = getSpotPose\('table', avatar\)/);
  assert.doesNotMatch(avatarSource, /AMBIENT_ROUTES|ambientIndex/);
  assert.match(avatarSource, /a\.ambientWait = 5 \+ Math\.random\(\) \* 4/);
  assert.match(avatarSource, /planPath\(/);
  assert.match(avatarSource, /Math\.sin\(t \* WALK_CADENCE/);
  assert.match(read('src/scene/rooms/Bedroom.tsx'), /function Bedroom\(\)/);

  const navigation = loadTsModule('src/scene/sceneNavigation.ts');
  let seed = 137;
  const random = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let point = { x: -0.6, z: 0.3 };
  for (let i = 0; i < 20; i++) {
    const next = navigation.randomLivingPoint(random, point, 0.8);
    assert.ok(navigation.isWalkable(next), `ambient point must be walkable: ${JSON.stringify(next)}`);
    assert.ok(Math.hypot(next.x - point.x, next.z - point.z) >= 0.8);
    point = next;
  }
});

test('seated activities use clear approaches and eased sit transitions', () => {
  const avatarSource = read('src/scene/Avatar.tsx');
  assert.match(avatarSource, /nearestWalkablePoint\(destination\)/);
  assert.match(avatarSource, /const settlingIntoSeat/);
  assert.match(avatarSource, /const standingUp/);
  assert.match(avatarSource, /THREE\.MathUtils\.damp\(root\.position\.x, destination\.x, 4\.8, dt\)/);
  assert.match(avatarSource, /THREE\.MathUtils\.damp\(root\.position\.x, waypoint\.x, 4\.8, dt\)/);
  assert.match(avatarSource, /a\.sit = THREE\.MathUtils\.damp\(a\.sit, sitTarget, 5, dt\)/);

  const navigation = loadTsModule('src/scene/sceneNavigation.ts');
  const { SPOTS } = loadTsModule('src/scene/spots.ts');
  for (const id of ['table', 'sofa', 'romantic', 'garden']) {
    for (const avatar of ['a', 'b']) {
      const seat = SPOTS[id][avatar];
      const approach = navigation.nearestWalkablePoint(seat);
      assert.ok(navigation.isWalkable(approach), `${id}.${avatar} approach must be clear`);
      assert.ok(
        Math.hypot(approach.x - seat.x, approach.z - seat.z) > 0.05,
        `${id}.${avatar} needs a distinct approach point`,
      );
      assert.equal(navigation.pointHitsCollider(approach), null);
    }
  }
});
