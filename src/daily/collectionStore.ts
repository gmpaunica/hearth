import { create } from 'zustand';

import {
  deleteDailyArtifact,
  fetchDiaryPage,
  fetchGreenhousePage,
  unplantPhotoDay,
} from './api';
import type { DailyMedium, DiaryDay, GreenhouseMemory } from './model';

const DIARY_PAGE_SIZE = 20;
const GREENHOUSE_PAGE_SIZE = 12;

interface CollectionState {
  diary: DiaryDay[];
  diaryLoading: boolean;
  diaryHasMore: boolean;
  greenhouse: GreenhouseMemory[];
  greenhouseLoading: boolean;
  greenhouseHasMore: boolean;
  busy: string | null;
  error: string | null;
  loadDiary: (reset?: boolean) => Promise<void>;
  loadGreenhouse: (reset?: boolean) => Promise<void>;
  deleteFromDiary: (kind: DailyMedium | 'sketch', id: string) => Promise<boolean>;
  unplantMemory: (homeDate: string) => Promise<boolean>;
  reset: () => void;
}

export const useDailyCollectionStore = create<CollectionState>((set, get) => ({
  diary: [],
  diaryLoading: false,
  diaryHasMore: true,
  greenhouse: [],
  greenhouseLoading: false,
  greenhouseHasMore: true,
  busy: null,
  error: null,

  loadDiary: async (reset = false) => {
    if (get().diaryLoading || (!reset && !get().diaryHasMore)) return;
    const current = reset ? [] : get().diary;
    set({ diaryLoading: true, error: null });
    try {
      const page = await fetchDiaryPage(current.at(-1)?.home_date, DIARY_PAGE_SIZE);
      set({
        diary: reset ? page : [...current, ...page],
        diaryHasMore: page.length === DIARY_PAGE_SIZE,
        diaryLoading: false,
      });
    } catch {
      set({ diaryLoading: false, error: 'Couldn\u2019t open Our Diary.' });
    }
  },

  loadGreenhouse: async (reset = false) => {
    if (get().greenhouseLoading || (!reset && !get().greenhouseHasMore)) return;
    const current = reset ? [] : get().greenhouse;
    set({ greenhouseLoading: true, error: null });
    try {
      const page = await fetchGreenhousePage(current.at(-1)?.home_date, GREENHOUSE_PAGE_SIZE);
      set({
        greenhouse: reset ? page : [...current, ...page],
        greenhouseHasMore: page.length === GREENHOUSE_PAGE_SIZE,
        greenhouseLoading: false,
      });
    } catch {
      set({ greenhouseLoading: false, error: 'Couldn\u2019t open the greenhouse.' });
    }
  },

  deleteFromDiary: async (kind, id) => {
    if (get().busy) return false;
    set({ busy: `delete-${kind}`, error: null });
    try {
      await deleteDailyArtifact(kind, id);
      set((state) => ({
        busy: null,
        diary: state.diary.map((day) => ({
          ...day,
          sketches: kind === 'sketch' ? day.sketches.filter((item) => item.id !== id) : day.sketches,
          voices: kind === 'voice' ? day.voices.filter((item) => item.id !== id) : day.voices,
        })).filter((day) => day.sketches.length > 0 || day.voices.length > 0),
      }));
      return true;
    } catch {
      set({ busy: null, error: 'Couldn\u2019t delete this diary item.' });
      return false;
    }
  },

  unplantMemory: async (homeDate) => {
    if (get().busy) return false;
    set({ busy: `unplant-${homeDate}`, error: null });
    try {
      await unplantPhotoDay(homeDate);
      set((state) => ({
        busy: null,
        greenhouse: state.greenhouse.filter((memory) => memory.home_date !== homeDate),
      }));
      return true;
    } catch {
      set({ busy: null, error: 'Couldn\u2019t remove this greenhouse memory.' });
      return false;
    }
  },

  reset: () => set({
    diary: [], diaryLoading: false, diaryHasMore: true,
    greenhouse: [], greenhouseLoading: false, greenhouseHasMore: true,
    busy: null, error: null,
  }),
}));
