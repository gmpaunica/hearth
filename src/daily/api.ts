import { supabase } from '@/lib/supabase';
import type {
  DailyMedium,
  DailyReceiptKind,
  DiaryDay,
  GreenhouseMemory,
  TodayDailyMediaSnapshot,
} from './model';

export const DAILY_MEDIA_BUCKET = 'daily-media';
export const SIGNED_MEDIA_URL_SECONDS = 300;

export interface FinalizeMediaInput {
  assignmentId: string;
  mediaId: string;
  medium: DailyMedium;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  durationMs?: number | null;
  audioChannels?: number | null;
  audioBitRate?: number | null;
  width?: number | null;
  height?: number | null;
}

export async function fetchTodayDailyMedia(): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_today_daily_media');
  if (error) throw error;
  return data as TodayDailyMediaSnapshot;
}

export function createMediaId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (!uuid) throw new Error('Secure media identifiers are unavailable on this device.');
  return uuid;
}

export async function readLocalFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('The selected media file could not be read.');
  return response.arrayBuffer();
}

export async function uploadAndFinalizeMedia(
  bytes: ArrayBuffer,
  input: Omit<FinalizeMediaInput, 'byteSize'>,
): Promise<string> {
  const storage = supabase.storage.from(DAILY_MEDIA_BUCKET);
  const upload = await storage.upload(input.storagePath, bytes, {
    contentType: input.mimeType,
    upsert: false,
    cacheControl: '3600',
  });
  if (upload.error) throw upload.error;
  try {
    const { data, error } = await supabase.rpc('finalize_daily_submission', {
      p_assignment_id: input.assignmentId,
      p_media_id: input.mediaId,
      p_medium: input.medium,
      p_storage_path: input.storagePath,
      p_mime_type: input.mimeType,
      p_byte_size: bytes.byteLength,
      p_duration_ms: input.durationMs ?? null,
      p_audio_channels: input.audioChannels ?? null,
      p_audio_bit_rate: input.audioBitRate ?? null,
      p_width: input.width ?? null,
      p_height: input.height ?? null,
    });
    if (error) throw error;
    return String(data);
  } catch (error) {
    // Metadata is created only after a successful object upload. If that final
    // transaction fails, immediately remove the orphan through the Storage API;
    // the scheduled orphan scan remains a durable fallback.
    const removed = await storage.remove([input.storagePath]);
    if (removed.error) console.warn('[hearth] orphan media cleanup deferred:', removed.error);
    throw error;
  }
}

export async function createSignedMediaUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DAILY_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_MEDIA_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function markMediaReceived(mediaId: string, kind: DailyReceiptKind) {
  const { error } = await supabase.rpc('mark_daily_media_received', {
    p_media_id: mediaId,
    p_kind: kind,
  });
  if (error) throw error;
}

export async function plantPhotoDay(homeDate: string) {
  const { error } = await supabase.rpc('plant_photo_day', { p_home_date: homeDate });
  if (error) throw error;
}

export async function unplantPhotoDay(homeDate: string) {
  const { error } = await supabase.rpc('unplant_photo_day', { p_home_date: homeDate });
  if (error) throw error;
}

export async function deleteDailyArtifact(kind: DailyMedium | 'sketch', id: string) {
  const { error } = await supabase.rpc('delete_daily_artifact', { p_kind: kind, p_id: id });
  if (error) throw error;
}

export async function fetchDiaryPage(beforeDate?: string, limit = 20): Promise<DiaryDay[]> {
  const { data, error } = await supabase.rpc('get_diary_page', {
    p_before_date: beforeDate ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as DiaryDay[];
}

export async function fetchGreenhousePage(beforeDate?: string, limit = 12): Promise<GreenhouseMemory[]> {
  const { data, error } = await supabase.rpc('get_greenhouse_page', {
    p_before_date: beforeDate ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as GreenhouseMemory[];
}
