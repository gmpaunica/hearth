import { Asset } from 'expo-asset';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { DailyPhotoScreen } from '@/components/daily/DailyPhotoScreen';
import { DailyRecordScreen } from '@/components/daily/DailyRecordScreen';
import { OurDiaryScreen } from '@/components/daily/OurDiaryScreen';
import type { Couple } from '@/lib/db';
import { useDailyCollectionStore } from '@/daily/collectionStore';
import type { DailyMediaItem, TodayDailyMediaSnapshot } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { EMPTY_GRID } from '@/state/drawingStore';
import { HearthTheme } from '@/theme/hearth';

type QaState =
  | 'photo-empty'
  | 'photo-preview'
  | 'photo-error'
  | 'photo-sent'
  | 'photo-delete'
  | 'voice-idle'
  | 'voice-preview'
  | 'voice-error'
  | 'voice-sent'
  | 'voice-delete'
  | 'diary-empty'
  | 'diary-book'
  | 'diary-delete';

const QA_COUPLE: Couple = {
  id: 'qa-couple', invite_code: 'HEARTH', member_a: 'member-a', member_b: 'member-b',
  created_at: '2026-08-17T12:00:00.000Z', paired_at: '2026-08-17T12:00:00.000Z',
  home_timezone: 'Europe/Brussels',
};

const PHOTO_URI = Asset.fromModule(require('../../assets/images/fireplace/fireplace-keepsake.webp')).uri;
const AUDIO_URI = Asset.fromModule(require('../../assets/audio/home-team-loop.mp3')).uri;

const item = (id: string, authorId: string, medium: 'photo' | 'voice'): DailyMediaItem => ({
  id,
  author_id: authorId,
  medium,
  home_date: '2026-09-08',
  storage_path: `qa/${id}.${medium === 'photo' ? 'jpg' : 'm4a'}`,
  mime_type: medium === 'photo' ? 'image/jpeg' : 'audio/mp4',
  byte_size: 12_000,
  duration_ms: medium === 'voice' ? 12_000 : null,
  width: medium === 'photo' ? 800 : null,
  height: medium === 'photo' ? 1000 : null,
  submitted_at: '2026-09-08T18:00:00.000Z',
  receipt: null,
});

const snapshot = (submissions: DailyMediaItem[]): TodayDailyMediaSnapshot => ({
  assignment_id: 'qa-assignment',
  home_date: '2026-09-08',
  home_timezone: 'Europe/Brussels',
  next_refresh_at: '2026-09-09T00:00:00.000Z',
  photo_prompt: 'What felt quietly beautiful today?',
  voice_prompt: 'What small moment would you tell them about?',
  shared_prompt_copy: 'You can answer differently. Neither person needs to go first.',
  submissions,
  greenhouse_planted: false,
  greenhouse_planting_final: false,
});

function DailyMediaQaExperience({ state }: { state: QaState }) {
  useEffect(() => {
    useAuthStore.setState({ userId: 'member-a', partnerId: 'member-b', couple: QA_COUPLE });
    const photoSent = state === 'photo-sent' || state === 'photo-delete';
    const voiceSent = state === 'voice-sent' || state === 'voice-delete';
    const media: DailyMediaItem[] = [];
    if (photoSent) media.push(item('photo-a', 'member-a', 'photo'));
    if (voiceSent) media.push(item('voice-a', 'member-a', 'voice'));
    useDailyMediaStore.setState({
      snapshot: snapshot(media), loading: false, busy: null,
      error: state === 'photo-error' ? 'Couldn’t send your photo. It is still here—try again when you are ready.'
        : state === 'voice-error' ? 'Couldn’t send your recording. It is still here—try again when you are ready.' : null,
      arrival: null,
    });
    useDailyCollectionStore.setState({
      diary: state === 'diary-empty' ? [] : [{
        home_date: '2026-09-07',
        sketches: [
          { id: 'sketch-a', author_id: 'member-a', grid: EMPTY_GRID.replace(/^.{600}/, '0'.repeat(600)), created_at: '2026-09-07T18:00:00Z', updated_at: '2026-09-07T18:00:00Z' },
          { id: 'sketch-b', author_id: 'member-b', grid: EMPTY_GRID, created_at: '2026-09-07T18:10:00Z', updated_at: '2026-09-07T18:10:00Z' },
        ],
        voices: [{ id: 'diary-voice', author_id: 'member-b', storage_path: 'qa/voice.m4a', mime_type: 'audio/mp4', duration_ms: 12_000, submitted_at: '2026-09-07T18:15:00Z', receipt: null }],
      }],
      diaryLoading: false, diaryHasMore: false, busy: null, error: null,
    });
    return () => {
      useDailyMediaStore.getState().reset();
      useDailyCollectionStore.getState().reset();
    };
  }, [state]);

  if (state.startsWith('photo-')) {
    const preview = state === 'photo-preview' || state === 'photo-error';
    return <DailyPhotoScreen reviewMode reviewPreview={preview ? { uri: PHOTO_URI, width: 800, height: 1000 } : null} reviewMediaUri={PHOTO_URI} reviewDeleteOpen={state === 'photo-delete'} />;
  }
  if (state.startsWith('voice-')) {
    const preview = state === 'voice-preview' || state === 'voice-error';
    return <DailyRecordScreen reviewMode reviewPhase={preview ? 'preview' : 'idle'} reviewPreviewUri={preview ? AUDIO_URI : null} reviewMediaUri={AUDIO_URI} reviewDeleteOpen={state === 'voice-delete'} />;
  }
  return <OurDiaryScreen reviewMode reviewAudioUri={AUDIO_URI} reviewDeleteId={state === 'diary-delete' ? 'sketch-a' : null} />;
}

/** Development-only, mutation-free photo, voice, and diary review states. */
export default function DailyMediaQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const states: QaState[] = ['photo-empty', 'photo-preview', 'photo-error', 'photo-sent', 'photo-delete', 'voice-idle', 'voice-preview', 'voice-error', 'voice-sent', 'voice-delete', 'diary-empty', 'diary-book', 'diary-delete'];
  const state = states.includes(requested as QaState) ? requested as QaState : 'photo-empty';
  return <View style={styles.root}><DailyMediaQaExperience key={state} state={state} /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: HearthTheme.color.parchment } });
