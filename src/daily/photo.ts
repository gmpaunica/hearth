import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const DAILY_PHOTO_MAX_WIDTH = 1600;
export const DAILY_PHOTO_MAX_HEIGHT = 2000;
export const DAILY_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const DAILY_PHOTO_JPEG_QUALITY = 0.82;

export interface ProcessedDailyPhoto {
  uri: string;
  width: number;
  height: number;
}

export function centerCrop4x5(width: number, height: number) {
  const targetRatio = 4 / 5;
  const sourceRatio = width / height;
  if (sourceRatio > targetRatio) {
    const cropWidth = Math.max(4, Math.floor(height * targetRatio));
    return { originX: Math.floor((width - cropWidth) / 2), originY: 0, width: cropWidth, height };
  }
  const cropHeight = Math.max(5, Math.floor(width / targetRatio));
  return { originX: 0, originY: Math.floor((height - cropHeight) / 2), width, height: cropHeight };
}

export async function processDailyPhoto(
  uri: string,
  sourceWidth: number,
  sourceHeight: number,
): Promise<ProcessedDailyPhoto> {
  const crop = centerCrop4x5(sourceWidth, sourceHeight);
  const scale = Math.min(
    1,
    DAILY_PHOTO_MAX_WIDTH / crop.width,
    DAILY_PHOTO_MAX_HEIGHT / crop.height,
  );
  // Keep exact 4:5 integer dimensions after scaling.
  let width = Math.max(4, Math.floor((crop.width * scale) / 4) * 4);
  let height = Math.round(width * 5 / 4);
  if (height > DAILY_PHOTO_MAX_HEIGHT) {
    height = DAILY_PHOTO_MAX_HEIGHT;
    width = DAILY_PHOTO_MAX_WIDTH;
  }
  const context = ImageManipulator.manipulate(uri).crop(crop);
  if (width !== crop.width || height !== crop.height) context.resize({ width, height });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: DAILY_PHOTO_JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: false,
  });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 5],
  shape: 'rectangle',
  quality: 1,
  exif: false,
  base64: false,
  allowsMultipleSelection: false,
};

async function processPickerResult(result: ImagePicker.ImagePickerResult) {
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (!asset.uri || asset.width <= 0 || asset.height <= 0) {
    throw new Error('That photo could not be read.');
  }
  return processDailyPhoto(asset.uri, asset.width, asset.height);
}

export async function takeDailyPhoto(): Promise<ProcessedDailyPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(permission.canAskAgain
      ? 'Camera permission is needed only when you take a photo.'
      : 'Camera access is off. You can enable it in your phone settings.');
  }
  return processPickerResult(await ImagePicker.launchCameraAsync(pickerOptions));
}

export async function chooseDailyPhoto(): Promise<ProcessedDailyPhoto | null> {
  return processPickerResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
}
