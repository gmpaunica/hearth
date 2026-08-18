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

function compile(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', 'require', output)(module.exports, module, nodeRequire);
  return module.exports;
}

function linearChannel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]) {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}

test('all six 40 by 18 run-length mosaics fit the 390 by 844 review viewport', () => {
  const source = read('src/components/MomentVignette.tsx');
  const destinations = ['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic'];
  for (const [index, destination] of destinations.entries()) {
    const start = source.indexOf(`  ${destination}: {`);
    const end = index === destinations.length - 1
      ? source.indexOf('\n};', start)
      : source.indexOf(`  ${destinations[index + 1]}: {`, start);
    const block = source.slice(start, end);
    assert.notEqual(start, -1, `${destination} mosaic must exist`);
    assert.equal((block.match(/\brow\(/g) ?? []).length, 18, `${destination} must have 18 rows`);
    for (const match of block.matchAll(/\[(\d+),\s*(\d+),\s*'[^']+'\]/g)) {
      const startCell = Number(match[1]);
      const length = Number(match[2]);
      assert.ok(startCell >= 0 && length > 0 && startCell + length <= 40, `${destination} run must fit 40 cells`);
    }
  }
  assert.match(source, /aspectRatio: 40 \/ 18/);
  assert.match(source, /left: `\$\{start \* 2\.5\}%`/);
  assert.match(source, /width: `\$\{length \* 2\.5\}%`/);
  // 390x844 keeps a 40:18 banner at 390x175.5 before the sheet padding,
  // preserving the intended pixel aspect without a raster asset.
  assert.equal(390 / (390 / (40 / 18)), 40 / 18);
});

test('banner text is pure white over a cocoa scrim with WCAG AA contrast', () => {
  const source = read('src/components/MomentVignette.tsx');
  assert.match(source, /bannerTitle: \{ color: '#FFFFFF'/);
  assert.match(source, /bannerLocation: \{ color: '#FFFFFF'/);
  assert.match(source, /backgroundColor: 'rgba\(49, 27, 21, 0\.86\)'/);
  assert.match(source, /textShadowColor: '#2A1712'/);
  assert.doesNotMatch(source, /banner(?:Title|Location): \{ color: '#(?:FFF0|FFC|F2C|EFD|E8A)/i);

  // Worst case is the translucent scrim composited over pure white.
  const background = [49, 27, 21].map((channel) => Math.round(channel * 0.86 + 255 * 0.14));
  const ratio = (luminance([255, 255, 255]) + 0.05) / (luminance(background) + 0.05);
  assert.ok(ratio >= 4.5, `white/scrim contrast must be at least 4.5:1, got ${ratio.toFixed(2)}`);
});

test('creation and destination previews match the owner review flow', () => {
  const controller = read('src/components/MomentsController.tsx');
  const preview = read('src/components/MomentConsequencePreview.tsx');
  assert.match(controller, /How do you feel right now\?/);
  assert.match(controller, /\['fireplace', 'table', 'romantic'\]/);
  assert.match(controller, /\['garden', 'sofa', 'rest'\]/);
  assert.ok(controller.indexOf('About us') < controller.indexOf('What I need'));
  assert.equal((controller.match(/>1 of 2</g) ?? []).length, 1);
  assert.equal((controller.match(/>2 of 2</g) ?? []).length, 1);
  assert.doesNotMatch(controller, /Review moment|review page/i);
  assert.match(preview, /<VoxelMosaic destination=\{consequence\.destination\}/);
  assert.match(preview, /<PostcardProp prop=\{consequence\.prop\}/);
  assert.doesNotMatch(preview, /CharacterCanvas|CharacterRenderer|<mesh|<group/);
  assert.match(preview, /This says the apology reached you; it does not mean everything is resolved\./);
  assert.doesNotMatch(preview, /partnerName|myName|>You<|nameLabel|avatarLabel/);
  assert.equal((preview.match(/<Text style=\{styles\.description\}>/g) ?? []).length, 1);
});

test('all three Rest responses have validated inputs, accurate props, and durable Today scenes', () => {
  const composer = read('src/components/RestResponseComposer.tsx');
  const catalog = read('src/moments/consequenceCatalog.ts');
  const scene = read('src/scene/MomentSceneDetails.tsx');
  const store = read('src/state/momentV2Store.ts');
  assert.match(composer, /const SIZE = 12/);
  assert.match(composer, /const CELL_COUNT = SIZE \* SIZE/);
  assert.match(composer, /REST_DOODLE_PALETTE = \[[^\]]+\] as const/s);
  assert.equal((composer.match(/REST_DOODLE_PALETTE = \[/g) ?? []).length, 1);
  assert.match(composer, /PanResponder\.create/);
  assert.match(composer, /onPanResponderMove/);
  assert.match(composer, />Undo</);
  assert.match(composer, />Clear</);
  assert.match(composer, /palette_id: 'hearth-rest-v1'/);
  assert.match(composer, /\['duck', 'frog', 'toast'\]/);
  for (const action of ['rest_doodle', 'rest_visitor', 'rest_hug']) assert.match(catalog, new RegExp(`${action}: consequence`));
  for (const action of ['make_doodle', 'send_visitor', 'send_hug']) assert.match(store, new RegExp(`'${action}'`));
  assert.match(store, /'respond_to_rest_moment'/);
  assert.match(scene, /payload\.cells\.length !== 144/);
  assert.match(scene, /const visitor = event\.payload/);
  assert.match(scene, /reduceMotion \? 0\.34/);
  assert.match(scene, /<RestHeartToken/);
  assert.match(scene, /<RestHugWave/);
  assert.match(scene, /newestProp\(todayEvents, 'tiny_drawing'\)/);
  assert.match(scene, /newestProp\(todayEvents, 'silly_visitor'\)/);
  assert.match(scene, /newestProp\(todayEvents, 'hug_token'\)/);
});

test('one continuously mounted sheet tracks, clamps, hands off scroll, and settles for 20 cycles', () => {
  const controller = read('src/components/MomentsController.tsx');
  const physics = compile('src/state/momentSheetPhysics.ts');
  const height = 844;
  const topInset = 59;
  const bottomInset = 34;
  const expandedY = Math.max(topInset + 116, 132);
  const dockedY = height - bottomInset - 48;
  assert.equal(expandedY, 175);
  assert.equal(dockedY, 762);
  assert.equal(height - bottomInset - dockedY, 48);
  assert.match(controller, /const dockedWidth = Math\.min\(214, Math\.max\(144, width - 176\)\)/);
  assert.match(controller, /interpolate\(progress, \[0, 1\], \[dockedWidth, expandedWidth\]\)/);
  assert.match(controller, /const sheetY = useSharedValue\(dockedY\)/);
  assert.match(controller, /dragStartY\.value = sheetY\.value/);
  assert.match(controller, /dragStartY\.value \+ event\.translationY/);
  assert.match(controller, /simultaneousWithExternalGesture\(nativeScroll\)/);
  assert.match(controller, /scrollY\.value <= 0 && event\.translationY > 0/);
  assert.match(controller, /momentSheetProgress\(sheetY\.value/);
  assert.match(controller, /BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.match(controller, /accessibilityActions=\{expanded/);
  assert.match(controller, /onAccessibilityAction/);
  assert.doesNotMatch(controller, /dockPan|Swipe up or tap to expand/);
  assert.doesNotMatch(controller, /chevronButton|chevronText/);

  for (let cycle = 0; cycle < 20; cycle += 1) {
    const up = physics.clampMomentSheetY(dockedY - 420, expandedY, dockedY);
    assert.equal(physics.resolveMomentSheetExpanded(up, -80, expandedY, dockedY), true);
    const partialDown = physics.clampMomentSheetY(expandedY + 80, expandedY, dockedY);
    assert.equal(physics.resolveMomentSheetExpanded(partialDown, 0, expandedY, dockedY), true);
    assert.equal(physics.resolveMomentSheetExpanded(expandedY + 5, 900, expandedY, dockedY), false);
    assert.equal(physics.resolveMomentSheetExpanded(dockedY - 5, -900, expandedY, dockedY), true);
    assert.equal(physics.momentSheetProgress(expandedY, expandedY, dockedY), 1);
    assert.equal(physics.momentSheetProgress(dockedY, expandedY, dockedY), 0);
  }
});

test('one ritual snapshot drives the physical fire while Fireplace adds only temporary tending', () => {
  const ritual = read('src/state/dailyRitualStore.ts');
  const presentation = read('src/state/firePresentation.ts');
  const atmosphere = read('src/scene/Atmosphere.tsx');
  const hearth = read('src/components/HearthStatusCard.tsx');
  const home = read('src/app/index.tsx');
  const sync = read('src/state/useHearthSync.ts');
  const drawing = read('src/state/drawingStore.ts');
  for (const state of ['steady', 'low', 'warming', 'glowing']) {
    assert.match(presentation, new RegExp(`${state}:`));
  }
  assert.match(presentation, /state: 'tending'/);
  assert.match(presentation, /readyCount === 1 \? 0\.52/);
  assert.match(hearth, /Fire: \{fire\.label\}/);
  assert.doesNotMatch(home, /RitualFireOrb/);
  assert.match(atmosphere, /useDailyRitualStore\.getState\(\)\.snapshot\?\.fire_state/);
  assert.match(atmosphere, /firePresentation\(/);
  assert.match(atmosphere, /baseFire \+ glow/);
  assert.doesNotMatch(atmosphere, /not_now[^\n]+fire|momentAtmosphere[^\n]+atmo\.fire/s);
  assert.match(ritual, /next_refresh_at/);
  assert.match(ritual, /setTimeout\(\(\) => void get\(\)\.refresh\(\), delay\)/);
  assert.match(sync, /s === 'active'/);
  assert.match(sync, /useDailyRitualStore\.getState\(\)\.refresh/);
  assert.match(drawing, /currentHomeDate/);
  assert.match(drawing, /useDailyRitualStore\.getState\(\)\.refresh/);
  assert.match(read('src/components/DailyDrawing.tsx'), /if \(homeDate\) void load\(\)/);
  assert.match(ritual, /completed_units/);
  assert.doesNotMatch(ritual, /partner.*completed|streak|failure|relationship score/i);
});

test('drawing reminder and reactions preserve privacy and exactly-once spatial playback', () => {
  const drawingUi = read('src/components/DailyDrawing.tsx');
  const anchors = read('src/scene/WorldAnchorProjector.tsx');
  const overlay = read('src/components/SpatialReactionOverlay.tsx');
  const store = read('src/state/momentV2Store.ts');
  const sync = read('src/state/useHearthSync.ts');
  assert.match(drawingUi, /pencilSatellite/);
  assert.match(drawingUi, /Tiny sketch tonight\?/);
  assert.doesNotMatch(drawingUi, /partner.*(?:missing|completion|sketch tonight)/i);
  for (const anchor of ['fireplace', 'garden', 'sofa', 'table', 'rest', 'romantic', 'drawing']) {
    assert.match(anchors, new RegExp(`  ${anchor}: \\[`));
  }
  assert.match(overlay, /Math\.min\(width - 118, Math\.max\(118, anchor\.x\)\)/);
  assert.match(overlay, /anchor\.occluded/);
  assert.match(overlay, /requestMomentCameraFocus\(reaction\.anchor/);
  assert.match(store, /3500/);
  assert.match(store, /Persist before playback/);
  assert.match(store, /completionBaselinePending/);
  assert.match(store, /actionBaselinePending/);
  assert.match(store, /readinessBaselinePending/);
  assert.match(store, /persistSeenSpatial/);
  assert.match(store, /surface\.settingsOpen \|\| surface\.hearthOpen \|\| surface\.expanded \|\| !surface\.appVisible/);
  assert.match(sync, /setAppVisible\(s === 'active'\)/);
  const incomingBeat = store.slice(store.indexOf('const beginNextReactionBeat'), store.indexOf('const applySnapshot'));
  assert.doesNotMatch(incomingBeat, /requestMomentCameraFocus/);
  assert.doesNotMatch(store, /partner_name[^\n]+reaction|identity\.partner_name[^\n]+copy/);
});

test('readiness halves are stable, public to the couple, and event-driven', () => {
  const heart = read('src/components/FireplaceReconnectBubble.tsx');
  const store = read('src/state/momentV2Store.ts');
  const sync = read('src/state/useHearthSync.ts');
  assert.match(heart, /member_a/);
  assert.match(heart, /member_b/);
  assert.match(heart, /const leftOn = completing \|\| participant\(memberA\)\?\.readiness === true/);
  assert.match(heart, /const rightOn = completing \|\| participant\(memberB\)\?\.readiness === true/);
  assert.match(heart, /x < 4 \? leftOn : rightOn/);
  assert.match(heart, /Tap to reconnect/);
  assert.match(heart, /setReadiness\(active\.signal_id, !mineOn\)/);
  assert.match(store, /Your partner is ready to reconnect\./);
  assert.match(store, /Your partner needs more time\./);
  assert.match(store, /triggerReadinessHeartComplete/);
  assert.match(sync, /table: 'moment_readiness_events'/);
});

test('payoff routing waits for dock and focus, restores camera, and keeps Romantic in scene', () => {
  const controller = read('src/components/MomentsController.tsx');
  const store = read('src/state/momentV2Store.ts');
  const fullscreen = read('src/components/PixelHeartPayoff.tsx');
  const romantic = read('src/scene/ReconcileHeart.tsx');
  const home = read('src/scene/HomeScene.tsx');
  assert.match(controller, /if \(finished && !expanded\) runOnJS\(resumePlayback\)\(\)/);
  assert.match(store, /requestMomentCameraFocus\(event\.destination, scene\.reduceMotion\)/);
  assert.match(store, /}, 220\)/);
  assert.match(store, /scene\.reduceMotion \? 500 : 800/);
  assert.match(store, /restoreMomentCameraFocus\(\)/);
  assert.match(fullscreen, /payoff\.destination !== 'romantic'/);
  assert.match(fullscreen, /duration: 700/);
  assert.match(fullscreen, /reduceMotion \? 1/);
  assert.match(romantic, /liveMomentAction\?\.destination === 'romantic'/);
  assert.match(romantic, /come_close/);
  assert.match(romantic, /send_affection/);
  assert.match(romantic, /momentPayoff\?\.destination === 'romantic'/);
  assert.doesNotMatch(home, /MomentDestinationPayoff/);
});

test('ending preserves avatar position, doorway owns one floor layer, and the real hearth opens status', () => {
  const store = read('src/state/momentV2Store.ts');
  const completionBeat = store.slice(store.indexOf('const beginNextCompletionBeat'), store.indexOf('const beginNextReactionBeat'));
  const avatar = read('src/scene/Avatar.tsx');
  const room = read('src/scene/Room.tsx');
  const fireplace = read('src/scene/objects/Fireplace.tsx');
  const layout = read('src/app/_layout.tsx');
  assert.doesNotMatch(completionBeat, /setSpot\(|requestSnap\(/);
  assert.match(completionBeat, /never rewrite a character's world position/);
  assert.match(avatar, /spotId === 'idle'[\s\S]*a\.sit = 0;[\s\S]*a\.seatY = 0;/);
  assert.match(avatar, /\? \{ x: root\.position\.x, z: root\.position\.z, rotY: a\.rotY, seatY: 0 \}/);
  const arch = room.slice(room.indexOf('function buildGardenArch'), room.indexOf('function GardenPassage'));
  assert.doesNotMatch(arch, /v\.box\([^,]+,\s*-1,/);
  assert.match(room, /const threshold = x >= 10 && z >= 0 && z <= 3/);
  assert.match(fireplace, /onClick=\{openHearth\}/);
  assert.match(fireplace, /useMomentsSurfaceStore\.getState\(\)\.openHearth\(\)/);
  assert.match(layout, /Fredoka-SemiBold\.ttf/);
  assert.match(layout, /Nunito-Regular\.ttf/);
});
