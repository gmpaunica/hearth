import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { MomentsController } from '@/components/MomentsController';
import type {
  ActiveMomentV2,
  MomentParticipantV2,
  MomentPersonalActionKind,
  MomentSnapshotV2,
} from '@/lib/db';
import { HomeScene } from '@/scene/HomeScene';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { HearthTheme } from '@/theme/hearth';

type QaState = 'send' | 'waiting' | 'respond' | 'space' | 'meet' | 'offline';

const ACTIVE_BASE: ActiveMomentV2 = {
  signal_id: 'qa-moment',
  couple_id: 'qa-couple',
  author_id: 'member-a',
  destination: 'fireplace',
  intent: 'stay_close',
  phase: 'waiting',
  shared_started_at: null,
  shared_ended_at: null,
  created_at: '2026-09-07T18:00:00.000Z',
  updated_at: '2026-09-07T18:00:00.000Z',
};

function participant(
  userId: string,
  role: MomentParticipantV2['role'],
  responseAction: string | null = null,
): MomentParticipantV2 {
  return {
    user_id: userId,
    role,
    note: role === 'author' ? 'I would like us to find a soft way back.' : null,
    note_removed: false,
    response_action: responseAction,
    responded_at: responseAction ? '2026-09-07T18:04:00.000Z' : null,
    joined_at: role === 'author' || responseAction ? '2026-09-07T18:02:00.000Z' : null,
    readiness: responseAction ? false : null,
    readiness_updated_at: responseAction ? '2026-09-07T18:05:00.000Z' : null,
    returned_at: null,
  };
}

function qaSnapshot(state: QaState): MomentSnapshotV2 {
  const empty: MomentSnapshotV2 = {
    identity: {
      user_id: 'member-a',
      partner_id: 'member-b',
      user_name: 'You',
      partner_name: 'Your partner',
    },
    active: null,
    personal_action: { kind: 'none' },
    participants: [],
    presence: [],
    today_outcomes: [],
    completion_events: [],
    current_action_events: [],
    today_action_events: [],
    readiness_events: [],
    earlier_moments: [],
  };
  if (state === 'send') return empty;

  const invited = state === 'respond' || state === 'space';
  const destination: ActiveMomentV2['destination'] = state === 'space' ? 'garden' : 'fireplace';
  const personalAction: MomentPersonalActionKind = state === 'respond'
    ? 'respond_fireplace'
    : state === 'space'
      ? 'respond_garden'
      : state === 'meet'
        ? 'confirm_fireplace'
        : 'wait';
  const active = {
    ...ACTIVE_BASE,
    author_id: invited ? 'member-b' : 'member-a',
    destination,
    intent: destination === 'fireplace' ? 'stay_close' as const : null,
    phase: state === 'meet' ? 'shared' as const : 'waiting' as const,
    shared_started_at: state === 'meet' ? '2026-09-07T18:04:00.000Z' : null,
  };
  const authorId = active.author_id;
  const partnerId = authorId === 'member-a' ? 'member-b' : 'member-a';
  const response = state === 'meet' ? 'come_sit' : null;
  return {
    ...empty,
    active,
    personal_action: { kind: personalAction },
    participants: [
      participant(authorId, 'author'),
      participant(partnerId, 'partner', response),
    ],
    presence: [
      {
        user_id: authorId,
        signal_id: active.signal_id,
        destination,
        is_active_moment: true,
        is_present: true,
        moved_at: active.created_at,
        left_at: null,
      },
    ],
  };
}

function MomentsQaExperience({ state }: { state: QaState }) {
  useEffect(() => {
    const moments = useMomentV2Store.getState();
    const surfaces = useMomentsSurfaceStore.getState();
    const scene = useSceneStore.getState();
    void moments.hydrate(qaSnapshot(state), true).then(() => {
      if (state === 'offline') {
        useMomentV2Store.setState({
          syncStatus: 'reconnecting',
          errorCode: 'offline',
          error: 'Hearth can’t reach home right now. Check your connection and try again.',
        });
      }
      surfaces.openMoments();
    });
    scene.setSpot('a', state === 'space' ? 'idle' : 'fireplace');
    scene.setSpot('b', state === 'space' ? 'garden' : 'fireplace');
    return () => {
      useMomentV2Store.getState().reset();
      scene.setSpot('a', 'idle');
      scene.setSpot('b', 'idle');
    };
  }, [state]);

  return (
    <View testID={`moments-qa-${state}`} style={styles.root}>
      <View style={styles.scene} pointerEvents="none">
        <SceneCanvas>
          <HomeScene initialRoom={state === 'space' ? 'garden' : 'living'} />
        </SceneCanvas>
      </View>
      <MomentsController />
    </View>
  );
}

/** Development-only deterministic states for responsive Moments review. */
export default function MomentsQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const state: QaState = requested === 'waiting'
    || requested === 'respond'
    || requested === 'space'
    || requested === 'meet'
    || requested === 'offline'
    ? requested
    : 'send';
  return <MomentsQaExperience state={state} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HearthTheme.color.parchmentWarm },
  scene: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
