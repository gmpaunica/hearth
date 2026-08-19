export type DailyMedium = 'voice' | 'photo';
export type DailyReceiptKind = 'photo_viewed' | 'voice_playback_started';

export interface DailyMediaItem {
  id: string;
  author_id: string;
  medium: DailyMedium;
  home_date: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  submitted_at: string;
  receipt: string | null;
}

export interface TodayDailyMediaSnapshot {
  assignment_id: string;
  home_date: string;
  home_timezone: string;
  next_refresh_at: string;
  photo_prompt: string;
  voice_prompt: string;
  shared_prompt_copy: string;
  submissions: DailyMediaItem[];
  greenhouse_planted: boolean;
  greenhouse_planting_final: boolean;
}

export interface DiarySketch {
  id: string;
  author_id: string;
  grid: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryVoice {
  id: string;
  author_id: string;
  storage_path: string;
  mime_type: string;
  duration_ms: number;
  submitted_at: string;
  receipt: string | null;
}

export interface DiaryDay {
  home_date: string;
  sketches: DiarySketch[];
  voices: DiaryVoice[];
}

export interface GreenhousePhoto {
  id: string;
  author_id: string;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  submitted_at: string;
}

export interface GreenhouseMemory {
  id: string;
  home_date: string;
  planted_at: string;
  photos: GreenhousePhoto[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const nullableString = (value: unknown): value is string | null => value == null || isString(value);
const nullableNumber = (value: unknown): value is number | null => value == null || typeof value === 'number';

export function normalizeTodaySnapshot(value: unknown): TodayDailyMediaSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.submissions)) return null;
  const submissions = value.submissions.filter(isRecord).map((item) => ({
    id: item.id,
    author_id: item.author_id,
    medium: item.medium,
    home_date: item.home_date,
    storage_path: item.storage_path,
    mime_type: item.mime_type,
    byte_size: item.byte_size,
    duration_ms: item.duration_ms ?? null,
    width: item.width ?? null,
    height: item.height ?? null,
    submitted_at: item.submitted_at,
    receipt: item.receipt ?? null,
  })).filter((item): item is DailyMediaItem =>
    isString(item.id)
    && isString(item.author_id)
    && (item.medium === 'voice' || item.medium === 'photo')
    && isString(item.home_date)
    && isString(item.storage_path)
    && isString(item.mime_type)
    && typeof item.byte_size === 'number'
    && nullableNumber(item.duration_ms)
    && nullableNumber(item.width)
    && nullableNumber(item.height)
    && isString(item.submitted_at)
    && nullableString(item.receipt));

  if (
    !isString(value.assignment_id)
    || !isString(value.home_date)
    || !isString(value.home_timezone)
    || !isString(value.next_refresh_at)
    || !isString(value.photo_prompt)
    || !isString(value.voice_prompt)
    || !isString(value.shared_prompt_copy)
    || typeof value.greenhouse_planted !== 'boolean'
    || typeof value.greenhouse_planting_final !== 'boolean'
    || submissions.length !== value.submissions.length
  ) return null;
  return {
    assignment_id: value.assignment_id,
    home_date: value.home_date,
    home_timezone: value.home_timezone,
    next_refresh_at: value.next_refresh_at,
    photo_prompt: value.photo_prompt,
    voice_prompt: value.voice_prompt,
    shared_prompt_copy: value.shared_prompt_copy,
    submissions,
    greenhouse_planted: value.greenhouse_planted,
    greenhouse_planting_final: value.greenhouse_planting_final,
  };
}

export function mineFor(
  snapshot: TodayDailyMediaSnapshot | null,
  userId: string | null,
  medium: DailyMedium,
) {
  return snapshot?.submissions.find((item) => item.author_id === userId && item.medium === medium) ?? null;
}

export function partnerFor(
  snapshot: TodayDailyMediaSnapshot | null,
  userId: string | null,
  medium: DailyMedium,
) {
  return snapshot?.submissions.find((item) => item.author_id !== userId && item.medium === medium) ?? null;
}
