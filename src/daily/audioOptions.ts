import {
  AudioQuality,
  IOSOutputFormat,
  type RecordingOptions,
} from 'expo-audio';

export const DAILY_VOICE_MAX_DURATION_MS = 30_000;
export const DAILY_VOICE_MAX_BYTES = 750 * 1024;
export const DAILY_VOICE_BIT_RATE = 64_000;

export const DAILY_VOICE_RECORDING_OPTIONS: RecordingOptions = {
  directory: 'cache',
  extension: '.m4a',
  sampleRate: 44_100,
  numberOfChannels: 1,
  bitRate: DAILY_VOICE_BIT_RATE,
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
    maxFileSize: DAILY_VOICE_MAX_BYTES,
  },
  ios: {
    extension: '.m4a',
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    sampleRate: 44_100,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: DAILY_VOICE_BIT_RATE,
  },
};
