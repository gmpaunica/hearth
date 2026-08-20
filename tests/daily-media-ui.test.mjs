import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('photo acquisition offers camera or library and explicitly excludes EXIF/base64 data', () => {
  const photo = read('src/daily/photo.ts');
  const screen = read('src/components/daily/DailyPhotoScreen.tsx');
  assert.match(screen, /accessibilityLabel="Take photo"/);
  assert.match(screen, /accessibilityLabel="Choose photo"/);
  assert.match(photo, /requestCameraPermissionsAsync\(\)/);
  assert.match(photo, /launchCameraAsync\(cameraOptions\)/);
  assert.match(photo, /launchImageLibraryAsync\(libraryOptions\)/);
  assert.match(photo, /mediaTypes:\s*\[['"]images['"]\]/);
  assert.match(photo, /cameraOptions[\s\S]{0,300}allowsEditing:\s*false/);
  assert.match(photo, /libraryOptions[\s\S]{0,180}allowsEditing:\s*true/);
  assert.match(photo, /aspect:\s*\[4,\s*5\]/);
  assert.match(photo, /exif:\s*false/);
  assert.match(photo, /base64:\s*false/);
  assert.match(screen, />1  Take</);
  assert.match(screen, />2  Preview</);
  assert.match(screen, />3  Send</);
  assert.match(screen, /Opening camera/);
  assert.match(screen, /acquiring != null/);
});

test('the final image pipeline enforces a 4:5 center crop and maximum 1600 by 2000 JPEG', () => {
  const photo = read('src/daily/photo.ts');
  assert.match(photo, /targetRatio = 4 \/ 5/);
  assert.match(photo, /ImageManipulator\.manipulate\(uri\)\.crop\(crop\)/);
  assert.match(photo, /context\.resize\(\{ width, height \}\)/);
  assert.match(photo, /DAILY_PHOTO_MAX_WIDTH = 1600/);
  assert.match(photo, /DAILY_PHOTO_MAX_HEIGHT = 2000/);
  assert.match(photo, /DAILY_PHOTO_JPEG_QUALITY = 0\.82/);
  assert.match(photo, /format:\s*SaveFormat\.JPEG/);
  assert.match(photo, /base64:\s*false/);

  const crop = (width, height) => {
    const target = 4 / 5;
    if (width / height > target) {
      const cropWidth = Math.max(4, Math.floor(height * target));
      return { width: cropWidth, height };
    }
    const cropHeight = Math.max(5, Math.floor(width / target));
    return { width, height: cropHeight };
  };
  assert.deepEqual(crop(4000, 3000), { width: 2400, height: 3000 });
  assert.deepEqual(crop(2400, 4000), { width: 2400, height: 3000 });
});

test('processed photos are size-checked, previewed, replaceable, and sent only by final action', () => {
  const store = read('src/daily/store.ts');
  const screen = read('src/components/daily/DailyPhotoScreen.tsx');
  assert.match(store, /bytes\.byteLength > DAILY_PHOTO_MAX_BYTES/);
  assert.match(store, /photo\.width > 1600/);
  assert.match(store, /photo\.height > 2000/);
  assert.match(store, /photo\.width \* 5 !== photo\.height \* 4/);
  assert.match(store, /mimeType:\s*['"]image\/jpeg['"]/);
  assert.match(screen, />PREVIEW</);
  assert.match(screen, />Replace</);
  assert.match(screen, /submitPhoto\(preview\)/);
  assert.match(screen, /'Sending…'\s*:\s*'Send'/);
  assert.doesNotMatch(screen, /TextInput/);
});

test('a partner photo receipt is written only after the private image genuinely loads', () => {
  const photo = read('src/components/daily/PrivatePhoto.tsx');
  assert.match(photo, /createSignedMediaUrl\(item\.storage_path\)/);
  assert.match(photo, /onLoad=\{\(\) =>/);
  assert.match(photo, /markReceived\(item, ['"]photo_viewed['"]\)/);
  assert.doesNotMatch(photo, /useEffect\([\s\S]{0,240}photo_viewed/);
});

test('photo planting is captionless, either-person, auto-pair-ready, and final on removal', () => {
  const screen = read('src/components/daily/DailyPhotoScreen.tsx');
  const store = read('src/daily/store.ts');
  assert.match(screen, /Keep this day in the greenhouse/);
  assert.match(screen, /If both photos arrive before the home day ends, they live together\./);
  assert.match(screen, /Removal is final for this photo-day\./);
  assert.match(store, /plantPhotoDay\(homeDate\)/);
  assert.match(store, /unplantPhotoDay\(homeDate\)/);
  assert.match(screen, /No caption\./);
  assert.doesNotMatch(screen, /album|countdown|reminder|streak|score/i);
});

test('the two daily media objects are independently tappable without navigating during R3F dispatch', () => {
  const consoleObject = read('src/scene/objects/MediaConsole.tsx');
  const bookshelf = read('src/scene/objects/Bookshelf.tsx');
  const table = read('src/scene/objects/TableSet.tsx');
  const livingRoom = read('src/scene/rooms/LivingRoom.tsx');
  const actions = read('src/components/daily/DailyMediaHomeActions.tsx');
  assert.match(consoleObject, /export function DailyRecordPlayer/);
  assert.match(consoleObject, /export function DailyCamera/);
  assert.match(consoleObject, /useDeferredDailyRoute\(['"]\/daily-record['"]\)/);
  assert.match(consoleObject, /useDeferredDailyRoute\(['"]\/daily-photo['"]\)/);
  assert.match(consoleObject, /requestAnimationFrame\(\(\) => \{[\s\S]{0,120}router\.push\(path as never\);[\s\S]{0,120}openingRef\.current = false/);
  assert.match(consoleObject, /if \(openingRef\.current\) return/);
  assert.match(consoleObject, /buildPlayingRecord/);
  assert.match(consoleObject, /recordRef\.current\.rotation\.y \+= delta \* 1\.8/);
  assert.match(consoleObject, /if \(recordRef\.current && !atmo\.reduceMotion\)/);
  assert.match(consoleObject, /Open lid reads clearly/);
  assert.match(consoleObject, /Pivot, counterweight, angled arm, headshell, and needle/);
  assert.equal((consoleObject.match(/onClick=\{open\}/g) ?? []).length, 2);
  assert.doesNotMatch(consoleObject, /<mesh[^>]+onClick=/);
  assert.match(consoleObject, /buildRecordBubble/);
  assert.match(consoleObject, /buildPhotoBubble/);
  assert.match(bookshelf, /DailyCamera position=\{\[x \+ 0\.52, y \+ 3\.04, z \+ 0\.2\]\}/);
  assert.doesNotMatch(bookshelf, /room\.plantLeaf|#9d5938|#79ad63|#648f54/);
  assert.match(table, /DailyRecordPlayer position=\{\[x \+ 0\.3, y \+ 0\.82, z \+ 0\.32\]\}/);
  assert.doesNotMatch(table, /#de8890|#f0b59d|#d66f7b/);
  assert.doesNotMatch(livingRoom, /MediaConsole/);
  assert.match(actions, /record player voice prompt/);
  assert.match(actions, /instant camera photo prompt/);
});

test('daily media headers do not present decorative top-right chrome as a fake button', () => {
  const scaffold = read('src/components/daily/DailyMediaScaffold.tsx');
  const photo = read('src/components/daily/DailyPhotoScreen.tsx');
  const record = read('src/components/daily/DailyRecordScreen.tsx');

  assert.match(scaffold, /styles\.headerSpacer/);
  assert.doesNotMatch(scaffold, /styles\.icon|iconText|icon: string/);
  assert.doesNotMatch(photo + record, /icon=/);
});
