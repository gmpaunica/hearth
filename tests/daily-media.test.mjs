import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Daily Record is foreground-only mono AAC/M4A with independent 30 second and 750 KiB guards', () => {
  const options = read('src/daily/audioOptions.ts');
  const screen = read('src/components/daily/DailyRecordScreen.tsx');
  assert.match(options, /extension:\s*['"]\.m4a['"]/);
  assert.match(options, /numberOfChannels:\s*1/);
  assert.match(options, /bitRate:\s*DAILY_VOICE_BIT_RATE/);
  assert.match(options, /outputFormat:\s*['"]mpeg4['"]/);
  assert.match(options, /audioEncoder:\s*['"]aac['"]/);
  assert.match(options, /maxFileSize:\s*DAILY_VOICE_MAX_BYTES/);
  assert.match(screen, /record\(\{\s*forDuration:\s*30\s*\}\)/);
  assert.match(screen, /durationMillis\s*>=\s*DAILY_VOICE_MAX_DURATION_MS/);
  assert.match(screen, /allowsBackgroundRecording:\s*false/);
  assert.match(screen, /shouldPlayInBackground:\s*false/);
});

test('microphone permission is requested only from the explicit record action', () => {
  const screen = read('src/components/daily/DailyRecordScreen.tsx');
  const start = screen.match(/const startRecording = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';
  assert.match(start, /requestRecordingPermissionsAsync\(\)/);
  assert.match(start, /prepareToRecordAsync/);
  assert.equal((screen.match(/requestRecordingPermissionsAsync\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(screen, /useEffect\([\s\S]{0,300}requestRecordingPermissionsAsync/);
});

test('recording is cancelled safely when backgrounded or interrupted and never auto-sends', () => {
  const screen = read('src/components/daily/DailyRecordScreen.tsx');
  assert.match(screen, /AppState\.addEventListener\(['"]change['"]/);
  assert.match(screen, /state !== ['"]active['"][\s\S]{0,100}finishRecording\(false, true\)/);
  assert.match(screen, /mediaServicesDidReset/);
  assert.match(screen, /Nothing was sent/);
  assert.match(screen, /LISTEN BEFORE SENDING/);
  assert.match(screen, /Re-record/);
  assert.match(screen, /'Sending…'\s*:\s*'Send'/);
  assert.doesNotMatch(screen, /submitVoice\([^)]*\)[\s\S]{0,120}finishRecording/);
});

test('React Native uploads are ArrayBuffers and orphaned objects are removed if metadata finalization fails', () => {
  const api = read('src/daily/api.ts');
  assert.match(api, /response\.arrayBuffer\(\)/);
  assert.match(api, /bytes:\s*ArrayBuffer/);
  assert.match(api, /storage\.upload\(input\.storagePath, bytes/);
  assert.match(api, /finalize_daily_submission/);
  assert.match(api, /catch \(error\)[\s\S]{0,360}storage\.remove\(\[input\.storagePath\]\)/);
  assert.match(api, /SIGNED_MEDIA_URL_SECONDS = 300/);
  assert.match(api, /createSignedUrl\(storagePath, SIGNED_MEDIA_URL_SECONDS\)/);
});

test('voice playback is user-initiated and recipient receipt is written only as playback starts', () => {
  const player = read('src/components/daily/VoiceNotePlayer.tsx');
  assert.match(player, /onPress=\{\(\) => void toggle\(\)\}/);
  assert.match(player, /player\.play\(\)/);
  assert.match(player, /markReceived\(item, ['"]voice_playback_started['"]\)/);
  assert.doesNotMatch(player, /useEffect\([\s\S]{0,160}player\.play\(\)/);
  assert.doesNotMatch(player, /autoplay|autoPlay/);
});

test('daily media realtime refreshes the dedicated store without opening or moving the camera', () => {
  const sync = read('src/state/useHearthSync.ts');
  const consoleObject = read('src/scene/objects/MediaConsole.tsx');
  assert.match(sync, /table:\s*['"]daily_media['"]/);
  assert.match(sync, /useDailyMediaStore\.getState\(\)\.refresh\(true\)/);
  assert.match(consoleObject, /unreadVoice/);
  assert.match(consoleObject, /useFrame/);
  assert.match(consoleObject, /router\.push\(['"]\/daily-record['"]/);
  assert.doesNotMatch(consoleObject, /camera|requestMomentCameraFocus|publishFocusedRoom/);
});

test('the daily record copy is shared, optional, independent, and has a final author delete', () => {
  const screen = read('src/components/daily/DailyRecordScreen.tsx');
  const scaffold = read('src/components/daily/DailyMediaScaffold.tsx');
  assert.match(screen, /sharedCopy=\{snapshot\?\.shared_prompt_copy\}/);
  assert.match(screen, /YOUR ANSWER/);
  assert.match(screen, /A VOICE FOR YOU/);
  assert.match(scaffold, /Optional, always/);
  assert.match(screen, /will not reopen today’s recording slot/);
  assert.match(screen, /deleteArtifact\(['"]voice['"]/);
  assert.doesNotMatch(screen + scaffold, /streak|score|countdown|reminder|complete today/i);
});
