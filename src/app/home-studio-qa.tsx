import { Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HomeStudio } from '@/components/HomeStudio';
import { cloneHomeSnapshot } from '@/home/editor';
import { LEGACY_COTTAGE_V2_SNAPSHOT } from '@/home/layouts';
import { useHomeStore } from '@/state/homeStore';
import { type HomePlacementGhost, useHomeStudioStore } from '@/state/homeStudioStore';
import { HearthTheme } from '@/theme/hearth';

type QaState = 'catalog' | 'selected' | 'placing' | 'blocked' | 'conflict' | 'offline';

function HomeStudioQaExperience({ state }: { state: QaState }) {
  useEffect(() => {
    const base = cloneHomeSnapshot(LEGACY_COTTAGE_V2_SNAPSHOT);
    const draft = cloneHomeSnapshot(base);
    const placementGhost: HomePlacementGhost | null = state === 'placing' || state === 'blocked' ? {
      objectId: 'qa-potted-fern',
      assetId: 'potted-fern',
      roomId: 'fallback-room-living',
      surface: 'floor',
      position: state === 'blocked' ? [99, 0, 99] : [2.5, 0, 1.5],
      rotation: 0,
      style: {},
      parentObjectId: null,
      attachmentSocket: null,
      isNew: true,
      valid: state !== 'blocked',
    } : null;
    const hasDraft = state !== 'catalog';

    useHomeStore.getState().previewSnapshot(draft);
    useHomeStudioStore.setState({
      isOpen: true,
      mode: 'decorate',
      baseSnapshot: base,
      draftSnapshot: draft,
      operations: hasDraft ? [{ type: 'rotate', objectId: 'fallback-sofa', rotation: 1 }] : [],
      undoStack: [],
      redoStack: [],
      selectedRoomId: 'fallback-room-living',
      selectedObjectId: state === 'selected' ? 'fallback-sofa' : null,
      tray: 'furnish',
      issues: [],
      conflictMessages: state === 'conflict' ? ['Cottage sofa was also changed by your partner.'] : [],
      message: state === 'offline'
        ? 'Hearth can’t reach home right now. Your decorating draft is kept on this phone.'
        : state === 'blocked' ? 'This spot blocks a walking path. Keep moving the piece.' : null,
      saving: false,
      pendingRequestId: null,
      simulateFrozen: false,
      placementGhost,
      draggingObjectId: null,
    });

    return () => {
      useHomeStore.getState().clearPreview();
      useHomeStudioStore.setState({ isOpen: false, placementGhost: null });
    };
  }, [state]);

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={styles.scenePlaceholder} accessibilityElementsHidden>
        <Text style={styles.sceneTitle}>Shared home preview</Text>
        <Text style={styles.sceneCopy}>The voxel room stays mounted behind these decorating controls.</Text>
      </View>
      <HomeStudio reviewMode />
    </View>
  );
}

/** Development-only, backend-free decorating review states. */
export default function HomeStudioQaRoute() {
  const { state: requested } = useLocalSearchParams<{ state?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const states: QaState[] = ['catalog', 'selected', 'placing', 'blocked', 'conflict', 'offline'];
  const state = states.includes(requested as QaState) ? requested as QaState : 'catalog';
  return <HomeStudioQaExperience key={state} state={state} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HearthTheme.color.parchmentWarm },
  scenePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.xl, paddingBottom: 230 },
  sceneTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 22, textAlign: 'center' },
  sceneCopy: { marginTop: 6, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 280 },
});
