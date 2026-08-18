import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('approved Home Team master has an exact seam and a mobile MP3 delivery asset', () => {
  const wav = readFileSync(join(root, 'assets/audio/home-team-loop.wav'));
  const mp3 = readFileSync(join(root, 'assets/audio/home-team-loop.mp3'));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 44_100);
  assert.equal(wav.readUInt16LE(34), 16);

  const dataSize = wav.readUInt32LE(40);
  const frameCount = dataSize / 4;
  const duration = frameCount / 44_100;
  assert.ok(Math.abs(duration - 73.84614512471656) < 1 / 44_100);

  const lastFrame = 44 + dataSize - 4;
  assert.equal(wav.readInt16LE(44), wav.readInt16LE(lastFrame));
  assert.equal(wav.readInt16LE(46), wav.readInt16LE(lastFrame + 2));
  assert.equal(mp3.toString('ascii', 0, 3), 'ID3');
  assert.ok(mp3.length > 1_400_000 && mp3.length < 1_600_000);
});

test('music preferences are local, persistent, and gentle by default', () => {
  const prefs = read('src/lib/prefs.ts');
  const store = read('src/state/musicStore.ts');

  assert.match(prefs, /hearth\.musicEnabled/);
  assert.match(prefs, /hearth\.musicVolume/);
  assert.match(prefs, /return value !== 'false'/);
  assert.match(prefs, /return 'gentle'/);
  assert.match(store, /gentle: 0\.32/);
  assert.match(store, /void setMusicEnabledPref\(enabled\)/);
  assert.match(store, /void setMusicVolumePref\(volume\)/);
});

test('music loops only while Hearth is active', () => {
  const music = read('src/components/BackgroundMusic.tsx');
  const layout = read('src/app/_layout.tsx');

  assert.match(music, /home-team-loop\.mp3/);
  assert.match(music, /downloadFirst: true/);
  assert.match(music, /player\.loop = true/);
  assert.match(music, /shouldPlayInBackground: false/);
  assert.match(music, /playsInSilentMode: true/);
  assert.match(music, /useAudioPlayerStatus/);
  assert.match(music, /playerStatus\.isLoaded/);
  assert.match(music, /audioReady/);
  assert.match(music, /appState === 'active'/);
  assert.match(music, /player\.play\(\)/);
  assert.match(music, /player\.pause\(\)/);
  assert.match(layout, /<BackgroundMusic \/>/);
});

test('settings expose saved music power and volume controls', () => {
  const settings = read('src/components/Settings.tsx');

  assert.match(settings, />Background music</);
  assert.match(settings, /value=\{musicEnabled\}/);
  assert.match(settings, /onValueChange=\{setMusicEnabled\}/);
  assert.match(settings, /MUSIC_VOLUME_OPTIONS\.map/);
  assert.match(settings, /setMusicVolume\(option\.id\)/);
  assert.match(settings, /musicPlayback === 'playing'/);
  assert.match(settings, /retryMusic/);
  for (const label of ['Quiet', 'Gentle', 'Full']) {
    assert.match(read('src/state/musicStore.ts'), new RegExp(`label: '${label}'`));
  }
});

test('new native audio runtime disables recording and background capabilities', () => {
  const app = JSON.parse(read('app.json'));
  const eas = JSON.parse(read('eas.json'));
  const audioPlugin = app.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-audio',
  );

  assert.equal(app.expo.version, '1.0.3');
  assert.ok(audioPlugin);
  assert.deepEqual(audioPlugin[1], {
    microphonePermission: false,
    recordAudioAndroid: false,
    enableBackgroundPlayback: false,
    enableBackgroundRecording: false,
  });
  assert.equal(eas.build.preview.autoIncrement, true);
});
