import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { DailyDrawing } from '@/components/DailyDrawing';
import type { Couple } from '@/lib/db';
import { EMPTY_GRID, useDrawingStore } from '@/state/drawingStore';
import { useAuthStore } from '@/state/authStore';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useRitualPreferencesStore } from '@/state/ritualPreferencesStore';
import { HearthTheme } from '@/theme/hearth';

type QaState = 'empty' | 'drawing' | 'saved' | 'preferences' | 'book' | 'delete';

const QA_COUPLE: Couple = {
  id: 'qa-couple',
  invite_code: 'HEARTH',
  member_a: 'member-a',
  member_b: 'member-b',
  created_at: '2026-08-17T12:00:00.000Z',
  paired_at: '2026-08-17T12:00:00.000Z',
  home_timezone: 'Europe/Brussels',
};

function sketch(seed: number): string {
  const cells = EMPTY_GRID.split('');
  for (let y = 28; y < 132; y += 1) {
    for (let x = 20; x < 108; x += 1) {
      if ((x * 3 + y * 5 + seed) % 29 < 3) cells[y * 128 + x] = String((x + y + seed) % 6);
    }
  }
  return cells.join('');
}

function DailySketchQaExperience({ state }: { state: QaState }) {
  const bookState = state === 'book' || state === 'delete';
  useEffect(() => {
    useAuthStore.setState({ userId: 'member-a', partnerId: 'member-b', couple: QA_COUPLE });
    useRitualPreferencesStore.setState({ sketchReminderEnabled: state !== 'preferences' });
    useDrawingStore.setState({
      myGrid: state === 'drawing' || state === 'saved' ? sketch(2) : EMPTY_GRID,
      myTitle: state === 'saved' ? 'A soft Tuesday' : '',
      mineSaved: state === 'saved',
      mySlotOpen: true,
      partnerGrid: state === 'empty' || state === 'drawing' ? null : sketch(7),
      partnerTitle: state === 'empty' || state === 'drawing' ? '' : 'Tea by the window',
      partnerSeen: true,
      loading: false,
      error: null,
      sketchbookLoading: false,
      sketchbookError: null,
      memberAName: 'You',
      memberBName: 'Your person',
      sketchbookDays: [
        { day: '2026-09-05', memberAHasDrawing: true, memberBHasDrawing: true },
        { day: '2026-09-06', memberAHasDrawing: false, memberBHasDrawing: true },
        { day: '2026-09-07', memberAHasDrawing: true, memberBHasDrawing: true },
      ],
      sketchbookPages: {
        '2026-09-05': { day: '2026-09-05', memberAId: 'qa-a-5', memberAGrid: sketch(1), memberATitle: 'Little sun', memberBId: 'qa-b-5', memberBGrid: sketch(5), memberBTitle: 'Home again' },
        '2026-09-06': { day: '2026-09-06', memberAId: null, memberAGrid: null, memberATitle: '', memberBId: 'qa-b-6', memberBGrid: sketch(4), memberBTitle: 'Sunday cup' },
        '2026-09-07': { day: '2026-09-07', memberAId: 'qa-a-7', memberAGrid: sketch(2), memberATitle: 'A soft Tuesday', memberBId: 'qa-b-7', memberBGrid: sketch(7), memberBTitle: 'Tea by the window' },
      },
      sketchbookLoadingDays: [],
      sketchbookDayErrors: {},
      deletingSketchId: null,
      deleteError: null,
    });
    if (bookState) useMomentsSurfaceStore.getState().openDrawing('sketchbook');
    else useMomentsSurfaceStore.getState().openDrawing('today');
    return () => {
      useDrawingStore.getState().reset();
      useRitualPreferencesStore.getState().reset();
      useMomentsSurfaceStore.getState().closeSurface();
    };
  }, [bookState, state]);

  return (
    <View testID={`daily-sketch-qa-${state}`} style={styles.root}>
      <DailyDrawing
        showTrigger={false}
        reviewMode
        reviewInitialTab={state === 'drawing' || state === 'saved' ? 'yours' : 'theirs'}
        reviewPreferencesOpen={state === 'preferences'}
        reviewDeleteTarget={state === 'delete' ? { id: 'qa-a-5', day: '2026-09-05' } : null}
      />
    </View>
  );
}

/** Development-only deterministic states for the optional sketch ritual. */
export default function DailySketchQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const state: QaState = requested === 'drawing'
    || requested === 'saved'
    || requested === 'preferences'
    || requested === 'book'
    || requested === 'delete'
    ? requested
    : 'empty';
  return <DailySketchQaExperience state={state} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HearthTheme.color.parchment },
});
