import { create } from 'zustand';

import { useAuthStore } from '@/state/authStore';
import { mapDomainError, reportDomainError, type DomainOperation } from '@/lib/domainError';
import {
  createMediaId,
  deleteDailyArtifact,
  fetchTodayDailyMedia,
  markMediaReceived,
  plantPhotoDay,
  readLocalFileAsArrayBuffer,
  unplantPhotoDay,
  uploadAndFinalizeMedia,
} from './api';
import {
  normalizeTodaySnapshot,
  type DailyMediaItem,
  type DailyMedium,
  type DailyReceiptKind,
  type TodayDailyMediaSnapshot,
} from './model';
import { DAILY_VOICE_BIT_RATE, DAILY_VOICE_MAX_BYTES } from './audioOptions';
import { DAILY_PHOTO_MAX_BYTES, type ProcessedDailyPhoto } from './photo';

const MAX_TIMER_MS = 2_000_000_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let newestRefresh = 0;

interface DailyMediaState {
  snapshot: TodayDailyMediaSnapshot | null;
  loading: boolean;
  busy: string | null;
  error: string | null;
  arrival: { medium: DailyMedium; mediaId: string; token: number } | null;
  refresh: (announceArrival?: boolean) => Promise<void>;
  submitVoice: (uri: string, durationMs: number) => Promise<boolean>;
  submitPhoto: (photo: ProcessedDailyPhoto) => Promise<boolean>;
  markReceived: (item: DailyMediaItem, kind: DailyReceiptKind) => Promise<void>;
  deleteArtifact: (kind: DailyMedium | 'sketch', id: string) => Promise<boolean>;
  plantToday: () => Promise<boolean>;
  unplantToday: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

function errorMessage(error: unknown, operation: DomainOperation, fallback: string) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : '';
  if (/slot is already finalized/i.test(message)) return 'Your answer for today is already sent.';
  const safe = mapDomainError(error, operation);
  reportDomainError(safe);
  return safe.code === 'unknown' ? fallback : safe.message;
}

export const useDailyMediaStore = create<DailyMediaState>((set, get) => ({
  snapshot: null,
  loading: false,
  busy: null,
  error: null,
  arrival: null,

  refresh: async (announceArrival = false) => {
    const requestId = ++newestRefresh;
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const previous = get().snapshot;
    set({ loading: previous == null, error: null });
    try {
      const snapshot = normalizeTodaySnapshot(await fetchTodayDailyMedia());
      if (requestId !== newestRefresh) return;
      if (!snapshot) throw new Error('Invalid daily media state');
      let arrival = get().arrival;
      if (announceArrival && previous) {
        const previousIds = new Set(previous.submissions.map((item) => item.id));
        const incoming = snapshot.submissions.find(
          (item) => item.author_id !== userId && !previousIds.has(item.id),
        );
        if (incoming) arrival = {
          medium: incoming.medium,
          mediaId: incoming.id,
          token: (arrival?.token ?? 0) + 1,
        };
      }
      set({ snapshot, loading: false, error: null, arrival });
      if (refreshTimer) clearTimeout(refreshTimer);
      const delay = Math.max(250, Math.min(
        MAX_TIMER_MS,
        Date.parse(snapshot.next_refresh_at) - Date.now() + 250,
      ));
      refreshTimer = setTimeout(() => void get().refresh(false), delay);
    } catch (error) {
      if (requestId === newestRefresh) {
        set({ loading: false, error: errorMessage(error, 'daily_media_load', 'Couldn’t open today’s shared prompts. Try again when you are ready.') });
      }
    }
  },

  submitVoice: async (uri, durationMs) => {
    const snapshot = get().snapshot;
    const auth = useAuthStore.getState();
    if (!snapshot || !auth.couple?.id || !auth.userId || get().busy) return false;
    set({ busy: 'voice-upload', error: null });
    try {
      const bytes = await readLocalFileAsArrayBuffer(uri);
      if (bytes.byteLength > DAILY_VOICE_MAX_BYTES) {
        throw new Error('This recording is larger than 750 KiB. Please record it again.');
      }
      const mediaId = createMediaId();
      const storagePath = `${auth.couple.id}/${auth.userId}/voice/${snapshot.home_date}/${mediaId}.m4a`;
      await uploadAndFinalizeMedia(bytes, {
        assignmentId: snapshot.assignment_id,
        mediaId,
        medium: 'voice',
        storagePath,
        mimeType: 'audio/mp4',
        durationMs: Math.max(1, Math.min(30_000, Math.round(durationMs))),
        audioChannels: 1,
        audioBitRate: DAILY_VOICE_BIT_RATE,
      });
      await get().refresh(false);
      set({ busy: null });
      return true;
    } catch (error) {
      set({
        busy: null,
        error: errorMessage(error, 'daily_media_upload', 'Couldn’t send your recording. It is still here—try again when you are ready.'),
      });
      return false;
    }
  },

  submitPhoto: async (photo) => {
    const snapshot = get().snapshot;
    const auth = useAuthStore.getState();
    if (!snapshot || !auth.couple?.id || !auth.userId || get().busy) return false;
    set({ busy: 'photo-upload', error: null });
    try {
      const bytes = await readLocalFileAsArrayBuffer(photo.uri);
      if (bytes.byteLength > DAILY_PHOTO_MAX_BYTES) {
        throw new Error('This processed photo is larger than 3 MiB. Please choose another.');
      }
      if (photo.width > 1600 || photo.height > 2000 || photo.width * 5 !== photo.height * 4) {
        throw new Error('The processed photo did not keep the required 4:5 crop.');
      }
      const mediaId = createMediaId();
      const storagePath = `${auth.couple.id}/${auth.userId}/photo/${snapshot.home_date}/${mediaId}.jpg`;
      await uploadAndFinalizeMedia(bytes, {
        assignmentId: snapshot.assignment_id,
        mediaId,
        medium: 'photo',
        storagePath,
        mimeType: 'image/jpeg',
        width: photo.width,
        height: photo.height,
      });
      await get().refresh(false);
      set({ busy: null });
      return true;
    } catch (error) {
      set({
        busy: null,
        error: errorMessage(error, 'daily_media_upload', 'Couldn’t send your photo. It is still here—try again when you are ready.'),
      });
      return false;
    }
  },

  markReceived: async (item, kind) => {
    if (item.receipt) return;
    try {
      await markMediaReceived(item.id, kind);
      set((state) => ({
        snapshot: state.snapshot ? {
          ...state.snapshot,
          submissions: state.snapshot.submissions.map((current) =>
            current.id === item.id ? { ...current, receipt: new Date().toISOString() } : current,
          ),
        } : null,
      }));
    } catch (error) {
      const safe = mapDomainError(error, 'daily_media_receipt');
      reportDomainError(safe);
    }
  },

  deleteArtifact: async (kind, id) => {
    if (get().busy) return false;
    set({ busy: `delete-${kind}`, error: null });
    try {
      await deleteDailyArtifact(kind, id);
      await get().refresh(false);
      set({ busy: null });
      return true;
    } catch (error) {
      set({ busy: null, error: errorMessage(error, 'daily_media_delete', 'Couldn’t remove this yet. Your copy is still safe.') });
      return false;
    }
  },

  plantToday: async () => {
    const homeDate = get().snapshot?.home_date;
    if (!homeDate || get().busy) return false;
    set({ busy: 'plant', error: null });
    try {
      await plantPhotoDay(homeDate);
      await get().refresh(false);
      set({ busy: null });
      return true;
    } catch (error) {
      set({ busy: null, error: errorMessage(error, 'daily_media_upload', 'Couldn’t keep this day in the greenhouse.') });
      return false;
    }
  },

  unplantToday: async () => {
    const homeDate = get().snapshot?.home_date;
    if (!homeDate || get().busy) return false;
    set({ busy: 'unplant', error: null });
    try {
      await unplantPhotoDay(homeDate);
      await get().refresh(false);
      set({ busy: null });
      return true;
    } catch (error) {
      set({ busy: null, error: errorMessage(error, 'daily_media_delete', 'Couldn’t remove this greenhouse memory.') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => {
    newestRefresh += 1;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    set({ snapshot: null, loading: false, busy: null, error: null, arrival: null });
  },
}));
