import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('photo and voice explain private permission timing before the system prompt', () => {
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const voice = read('src/components/daily/DailyRecordScreen.tsx');
  assert.match(photo, /Camera access is requested only after Take photo/);
  assert.match(photo, /private picker; Hearth receives only the image you select/);
  assert.match(voice, /Microphone access is requested only after Record/);
  assert.match(voice, /only while this page is in the foreground/);
});

test('failed uploads keep the local preview and expose a deliberate retry', () => {
  const store = read('src/daily/store.ts');
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const voice = read('src/components/daily/DailyRecordScreen.tsx');
  assert.match(store, /It is still here—try again when you are ready/);
  assert.match(photo, /Your preview is still here/);
  assert.match(photo, /Try sending again/);
  assert.match(voice, /Your recording is still here/);
  assert.match(voice, /Try sending again/);
  assert.doesNotMatch(photo, /setPreview\(null\)[\s\S]{0,100}catch/);
});

test('private photo access and voice playback have user-initiated retry states', () => {
  const photo = read('src/components/daily/PrivatePhoto.tsx');
  const player = read('src/components/daily/VoiceNotePlayer.tsx');
  assert.match(photo, /Try opening private photo again/);
  assert.match(photo, /setAttempt\(\(value\) => value \+ 1\)/);
  assert.match(player, /Try again playing/);
  assert.match(player, /setLoadedPath\(null\)/);
  assert.match(player, /Playback starts only when you choose this button/);
  assert.doesNotMatch(player, /Ⅱ|▶/);
});

test('media and diary deletion use inline consequences and completion feedback', () => {
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const voice = read('src/components/daily/DailyRecordScreen.tsx');
  const diary = read('src/components/daily/OurDiaryScreen.tsx');
  for (const source of [photo, voice, diary]) {
    assert.match(source, /Remove forever/);
    assert.match(source, /stays closed|stay closed/);
    assert.match(source, /accessibilityLiveRegion="polite"/);
  }
  assert.doesNotMatch(voice + diary, /Alert\.alert/);
});

test('all daily media surfaces use the semantic theme and full-size destructive controls', () => {
  const paths = [
    'src/components/daily/DailyMediaScaffold.tsx',
    'src/components/daily/DailyPhotoScreen.tsx',
    'src/components/daily/DailyRecordScreen.tsx',
    'src/components/daily/OurDiaryScreen.tsx',
    'src/components/daily/PrivatePhoto.tsx',
    'src/components/daily/VoiceNotePlayer.tsx',
  ];
  const sources = paths.map(read);
  for (const source of sources) {
    assert.match(source, /HearthTheme/);
    assert.doesNotMatch(source, /editorial|momentsTypography/);
  }
  assert.match(sources.join('\n'), /HearthTheme\.touch\.minimum/);
});

test('daily media failures use typed domain mapping and QA stays development-only', () => {
  const store = read('src/daily/store.ts');
  const collection = read('src/daily/collectionStore.ts');
  const domain = read('src/lib/domainError.ts');
  const qa = read('src/app/daily-media-qa.tsx');
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const voice = read('src/components/daily/DailyRecordScreen.tsx');
  const diary = read('src/components/daily/OurDiaryScreen.tsx');
  for (const operation of ['daily_media_load', 'daily_media_upload', 'daily_media_delete', 'daily_media_receipt', 'diary_load', 'diary_delete', 'greenhouse_load', 'greenhouse_delete', 'avatar_load', 'avatar_save', 'home_edit']) {
    assert.match(domain, new RegExp(`'${operation}'`));
  }
  assert.match(store, /mapDomainError/);
  assert.match(collection, /mapDomainError/);
  assert.match(qa, /if \(!__DEV__\) return <Redirect href="\/"/);
  assert.match(qa, /photo-error/);
  assert.match(qa, /voice-error/);
  assert.match(qa, /diary-delete/);
  assert.doesNotMatch(qa, /supabase|submitPhoto|submitVoice|deleteArtifact/);
  assert.match(photo, /const send = async \(\) => \{\s*if \(reviewMode\) return/);
  assert.match(voice, /const send = async \(\) => \{\s*if \(reviewMode\) return/);
  assert.match(diary, /if \(reviewMode\) return false/);
});
