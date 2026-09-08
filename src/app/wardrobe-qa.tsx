import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Wardrobe } from '@/components/Wardrobe';
import { DEFAULT_APPEARANCE, type AvatarAppearance } from '@/state/avatarAppearance';
import { useAvatarStore } from '@/state/avatarStore';

type QaState = 'saved' | 'changed' | 'saving' | 'error' | 'locked' | 'discard';

const EDITED_LOOK: AvatarAppearance = {
  ...DEFAULT_APPEARANCE.a,
  outfit: 'none',
  top: 'garden-overalls',
  bottom: 'wide-trousers',
  shoes: 'ankle-boots',
};

function WardrobeQaExperience({ state }: { state: QaState }) {
  useEffect(() => {
    useAvatarStore.setState({
      appearances: DEFAULT_APPEARANCE,
      myAvatar: 'a',
      userId: state === 'locked' ? null : 'member-a',
      memberA: 'member-a',
      busy: state === 'saving',
      error: state === 'error' ? 'Couldn’t save your character. Your preview is still here—try again.' : null,
    });
    return () => useAvatarStore.getState().reset();
  }, [state]);

  const changed = state === 'changed' || state === 'saving' || state === 'error' || state === 'discard';
  return <Wardrobe
    reviewMode
    reviewDraft={changed ? EDITED_LOOK : null}
    reviewProfileReady={state !== 'locked'}
    reviewDiscardOpen={state === 'discard'}
    reviewSaved={state === 'saved'}
  />;
}

/** Development-only, mutation-free wardrobe review states. */
export default function WardrobeQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const states: QaState[] = ['saved', 'changed', 'saving', 'error', 'locked', 'discard'];
  const state = states.includes(requested as QaState) ? requested as QaState : 'changed';
  return <WardrobeQaExperience key={state} state={state} />;
}
