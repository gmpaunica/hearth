import { create } from 'zustand';

import type { ProfileAvatarRow } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { avatarIdentityFor } from './avatarIdentity';
import { DEFAULT_APPEARANCE, sanitizeAppearance, type AvatarAppearance } from './avatarAppearance';
import type { AvatarKey } from './sceneStore';

interface AvatarState {
  appearances: Record<AvatarKey, AvatarAppearance>;
  myAvatar: AvatarKey;
  userId: string | null;
  memberA: string | null;
  busy: boolean;
  error: string | null;
  load: (userId: string, memberA: string, partnerId: string) => Promise<void>;
  save: (appearance: AvatarAppearance) => Promise<void>;
  ingest: (row: ProfileAvatarRow) => void;
  reset: () => void;
}

const initialState = {
  appearances: DEFAULT_APPEARANCE,
  myAvatar: 'a' as AvatarKey,
  userId: null,
  memberA: null,
  busy: false,
  error: null,
};

function keyForRow(row: ProfileAvatarRow, userId: string | null, memberA?: string | null): AvatarKey | null {
  if (memberA) return row.id === memberA ? 'a' : 'b';
  if (row.id === userId) return 'a';
  return null;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  ...initialState,

  load: async (userId, memberA, partnerId) => {
    const myAvatar = avatarIdentityFor(userId, memberA).myAvatar;
    set({ userId, memberA, myAvatar, busy: true, error: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_config')
        .in('id', [userId, partnerId]);
      if (error) throw error;
      const appearances = { ...DEFAULT_APPEARANCE };
      for (const row of (data ?? []) as ProfileAvatarRow[]) {
        const key = keyForRow(row, userId, memberA);
        if (key) appearances[key] = sanitizeAppearance(row.avatar_config, DEFAULT_APPEARANCE[key]);
      }
      set({ appearances, busy: false });
    } catch (e) {
      set({ busy: false, error: messageOf(e) });
    }
  },

  save: async (appearance) => {
    const { userId, myAvatar } = get();
    if (!userId) {
      set({ error: 'Your profile is still loading. Please try Save again in a moment.' });
      return;
    }
    if (get().busy) {
      set({ error: 'Your profile is still loading. Please wait a moment, then try Save again.' });
      return;
    }
    const previous = get().appearances[myAvatar];
    set((state) => ({
      appearances: { ...state.appearances, [myAvatar]: appearance },
      busy: true,
      error: null,
    }));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_config: appearance })
        .eq('id', userId);
      if (error) throw error;
      set({ busy: false });
    } catch (e) {
      set((state) => ({
        appearances: { ...state.appearances, [myAvatar]: previous },
        busy: false,
        error: messageOf(e),
      }));
    }
  },

  ingest: (row) => {
    const key = keyForRow(row, get().userId, get().memberA);
    if (!key) return;
    set((state) => ({
      appearances: {
        ...state.appearances,
        [key]: sanitizeAppearance(row.avatar_config, DEFAULT_APPEARANCE[key]),
      },
    }));
  },

  reset: () => set(initialState),
}));

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Your character could not be saved. Please try again.';
}
