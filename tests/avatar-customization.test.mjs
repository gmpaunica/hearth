import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('wardrobe supports modular clothing and coherent full-look overrides', () => {
  const appearance = read('src/state/avatarAppearance.ts');
  const wardrobe = read('src/components/Wardrobe.tsx');

  for (const outfit of [
    'heritage-street',
    'modern-prep',
    'layered-90s',
    'soft-tailoring',
    'slip-dress',
    'relaxed-suit',
    'lilac-layers',
    'ember-hoodie',
  ]) {
    assert.match(appearance, new RegExp(`id: '${outfit}'`));
  }
  assert.match(appearance, /technical-pack/);
  assert.match(appearance, /metal-frames/);
  assert.match(appearance, /brooch-cluster/);
  assert.match(appearance, /zigzag-headband/);
  assert.match(appearance, /cream-beanie/);
  assert.match(appearance, /label: 'Olive Hoodie'/);
  assert.match(appearance, /label: 'Coral Sweater'/);
  assert.match(appearance, /label: 'Garden Overalls'/);
  assert.match(appearance, /export const CHARACTER_PRESETS/);
  assert.match(appearance, /'layered-90s': \{\s*skinTone: 'peach',\s*hair: 'long-waves'/);
  assert.match(appearance, /'soft-tailoring': \{\s*skinTone: 'cocoa',\s*hair: 'braided-pony'/);
  assert.match(appearance, /'ember-hoodie': \{\s*skinTone: 'amber',\s*hair: 'beanie-crop'/);
  assert.match(appearance, /export function applyCharacterPreset/);
  assert.match(appearance, /id: 'moss-hoodie'/);
  assert.match(appearance, /id: 'garden-overalls'/);
  assert.match(appearance, /id: 'denim-weekend'/);
  assert.match(appearance, /id: 'straight-denim'/);
  assert.match(appearance, /id: 'retro-sneakers'/);
  assert.match(appearance, /id: 'slip-dress'/);
  assert.match(appearance, /id: 'relaxed-suit'/);
  assert.match(wardrobe, /id: 'top'/);
  assert.match(wardrobe, /id: 'bottom'/);
  assert.match(wardrobe, /id: 'shoes'/);
  assert.match(wardrobe, /APPEARANCE_OPTIONS\.outfit/);
  assert.match(wardrobe, /applyCharacterPreset\(base, id\)/);
  assert.match(wardrobe, /applyCharacterPreset\(draft, id\)/);
  assert.match(wardrobe, /outfit: 'none'/);
});

test('reference defaults preserve stable member identity and clothing-only looks', () => {
  const appearance = read('src/state/avatarAppearance.ts');
  const theme = read('src/theme/hearth.ts');

  assert.match(
    appearance,
    /DEFAULT_APPEARANCE[\s\S]*a: \{ \.\.\.CHARACTER_PRESETS\['layered-90s'\] \}[\s\S]*b: \{ \.\.\.CHARACTER_PRESETS\['heritage-street'\] \}/,
  );
  assert.match(
    appearance,
    /'heritage-street': \{[\s\S]*?hair: 'textured-crop',[\s\S]*?face: 'calm'/,
  );
  assert.match(theme, /a: \{ skin: '#e6bc88', hair: '#87380a', outfit: '#c25e4b'/);
  assert.match(theme, /b: \{ skin: '#e6bc88', hair: '#6b3c1b', outfit: '#666b47'/);
  assert.match(appearance, /top: look\.top/);
  assert.match(appearance, /bottom: look\.bottom/);
  assert.match(appearance, /shoes: look\.shoes/);
  assert.doesNotMatch(appearance, /return CHARACTER_PRESETS\[outfitId\] \? \{ \.\.\.base, \.\.\.CHARACTER_PRESETS/);
  assert.match(appearance, /HIDDEN_COMPATIBILITY_IDS/);
  assert.match(appearance, /'boxy-tee'/);
  assert.match(appearance, /bottom: \['dress-skirt'\]/);
  assert.match(appearance, /face: CHARACTER_PALETTE\.face/);
});

test('home, wardrobe, and lab share the pivoted concept-sheet character renderer', () => {
  const avatar = read('src/scene/Avatar.tsx');
  const figure = read('src/scene/ReferenceAvatarFigure.tsx');
  const renderer = read('src/character/CharacterRenderer.tsx');
  const preview = read('src/scene/WardrobePreview.tsx');
  const thumbnail = read('src/scene/WardrobeThumbnail.tsx');
  const viewport = read('src/character/CharacterViewport.tsx');
  const lab = read('src/character/CharacterLab.tsx');

  assert.match(figure, /const V = 0\.052/);
  assert.match(figure, /const LEG_CELLS = 5/);
  assert.match(figure, /const TORSO_CELLS = 6/);
  assert.match(figure, /const ARM_CELLS = 2/);
  assert.match(figure, /const SHOULDER_CELLS = 7/);
  assert.match(figure, /AVATAR_HEAD_WIDTH_CELLS = 11/);
  assert.doesNotMatch(figure, /DETAIL_V/);
  assert.doesNotMatch(figure, /buildHeadDetails/);
  assert.doesNotMatch(figure, /buildHairDetails/);
  assert.match(renderer, /<ReferenceAvatarFigure/);
  assert.match(avatar, /<CharacterRenderer/);
  assert.match(preview, /<CharacterRenderer/);
  assert.match(preview, /fixedPalette/);
  assert.match(thumbnail, /fixedPalette/);
  assert.match(viewport, /fixedPalette/);
  assert.match(lab, /REFERENCE_CHARACTER_PRESETS\.map/);
  assert.match(figure, /rigRefs\?\.leftArm/);
  assert.match(figure, /rigRefs\?\.rightLeg/);
  assert.doesNotMatch(figure, /v\.set\(5, 3, 9, nose\)/);
});

test('development QA renders deterministic direction and real-home character checks', () => {
  const lab = read('src/character/CharacterLab.tsx');
  const homeQa = read('src/app/character-home-qa.tsx');

  assert.match(lab, /requestedView === 'directions'/);
  assert.match(lab, /requestedPreset === CHARACTER_02\.id \? CHARACTER_02 : CHARACTER_01/);
  assert.match(lab, /FRONT 3\/4/);
  assert.match(lab, /BACK 3\/4/);
  assert.match(lab, /actors=\{actors\}/);
  assert.match(homeQa, /if \(!__DEV__\) return <Redirect/);
  assert.match(homeQa, /scene\.setSpot\('a', 'idle'\)/);
  assert.match(homeQa, /scene\.setSpot\('b', 'sofa'\)/);
  assert.match(homeQa, /<HomeScene initialRoom=\{requestedRoom\} \/>/);
  assert.match(homeQa, /room === 'garden' \|\| room === 'bedroom'/);
});

test('hair, eyes, and legs keep their detail from every viewing angle', () => {
  const appearance = read('src/state/avatarAppearance.ts');
  const wardrobe = read('src/components/Wardrobe.tsx');
  const thumbnail = read('src/scene/WardrobeThumbnail.tsx');
  const figure = read('src/scene/ReferenceAvatarFigure.tsx');

  for (const style of ['butterfly-layers', 'soft-wolf', 'italian-bob', 'modern-mullet']) {
    assert.match(appearance, new RegExp(`id: '${style}'`));
  }
  for (const shape of ['round', 'almond', 'upturned', 'soft-lidded']) {
    assert.match(appearance, new RegExp(`id: '${shape}'`));
  }
  assert.match(wardrobe, /id: 'eyes'/);
  for (const focus of ['head', 'eyes', 'top', 'bottom', 'shoes']) {
    assert.match(thumbnail, new RegExp(`${focus}: \{ zoom:`));
  }
  assert.match(thumbnail, /rotation=\{\[0, 0, 0\]\}/);
  assert.match(figure, /const hairLight = colors\.hairAccent/);
  assert.match(figure, /One primary cube is one visible art pixel/);
  assert.match(figure, /v\.box\(ankleX, 2, 0, 2, 3, 2, colors\.bottom\)/);
  assert.match(figure, /position=\{\[-2 \* V/);
  assert.match(figure, /v\.box\(3, 4, FACE_FRONT_Z, 1, 2, 1, eye\)/);
  assert.match(figure, /v\.set\(5, 3, FACE_FRONT_Z \+ 1/);
  assert.match(figure, /v\.remove\(0, 7, -1, 11, 9, 10\)/);
});

test('character presets and poses stay modular and customization-ready', () => {
  const presets = read('src/character/characterPresets.ts');
  const poses = read('src/character/characterPoses.ts');
  const types = read('src/character/characterTypes.ts');
  const route = read('src/app/character-lab.tsx');

  assert.match(presets, /Green Hoodie/);
  assert.match(presets, /Coral Sweater/);
  for (let index = 3; index <= 8; index += 1) {
    assert.match(presets, new RegExp(`Character 0${index}`));
  }
  for (const pose of ['idle', 'sit', 'wave', 'holdObject', 'sitTogether', 'hug', 'holdHands']) {
    assert.match(poses, new RegExp(`${pose}:`));
  }
  assert.match(types, /export interface CharacterRigRefs/);
  assert.match(types, /export interface CharacterPreset/);
  assert.match(route, /if \(!__DEV__\) return <Redirect/);
});

test('signed-in users can save only their own avatar profile', () => {
  const migration = read('supabase/migrations/20260806190000_profile_avatar_update_policy.sql');

  assert.match(migration, /for update to authenticated/);
  assert.match(migration, /using \(id = \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /with check \(id = \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /grant update \(display_name, avatar_config\)/);
});

test('wardrobe save verifies a real updated profile row', () => {
  const store = read('src/state/avatarStore.ts');
  const wardrobe = read('src/components/Wardrobe.tsx');

  assert.match(store, /\.from\('profiles'\)\s*\.update/);
  assert.doesNotMatch(store, /select\('id'\)/);
  assert.match(store, /profile is still loading/);
  assert.match(wardrobe, /draftOverride/);
  assert.match(wardrobe, /const draft = draftOverride \?\? saved/);
  assert.match(wardrobe, /Unsaved changes/);
  assert.match(wardrobe, /Save changes/);
  assert.match(wardrobe, /WardrobeThumbnail/);
  assert.match(wardrobe, /Mix & match/);
  assert.match(wardrobe, /section === 'outfits'/);
  assert.match(wardrobe, /position: 'absolute'/);
});

test('wardrobe character rotates directly under a horizontal finger drag', () => {
  const preview = read('src/scene/WardrobePreview.tsx');

  assert.match(preview, /onResponderGrant={handleDragGrant}/);
  assert.match(preview, /onResponderMove={handleDragMove}/);
  assert.match(preview, /rotation=\{\[0, rotationY, 0\]\}/);
  assert.match(preview, /Drag to rotate/);
});

test('main house preserves detailed voxels with a higher-resolution nearest-neighbour pass', () => {
  const pixelPass = read('src/scene/PixelPass.tsx');
  const home = read('src/scene/HomeScene.tsx');

  assert.match(pixelPass, /HOME_ART_RESOLUTION = 360/);
  assert.match(pixelPass, /minFilter: THREE\.NearestFilter/);
  assert.match(pixelPass, /magFilter: THREE\.NearestFilter/);
  assert.match(home, /<PixelPass resolution=\{HOME_ART_RESOLUTION\}/);
});
