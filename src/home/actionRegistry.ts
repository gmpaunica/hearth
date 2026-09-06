import { router } from 'expo-router';
import { useMemo } from 'react';

import { useDrawingStore } from '@/state/drawingStore';
import { useHomeProgress } from '@/state/homeProgress';
import { useHomeStore } from '@/state/homeStore';
import { useHomeStudioStore } from '@/state/homeStudioStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';

export type HomeActionId =
  | 'moments'
  | 'hearth'
  | 'account'
  | 'today-sketch'
  | 'sketchbook'
  | 'daily-voice'
  | 'daily-photo'
  | 'diary'
  | 'memories'
  | 'wardrobe'
  | 'decorate';

export type HomeActionGroup = 'Today & rituals' | 'Keepsakes' | 'Make it ours';

interface HomeActionContext {
  gardenUnlocked: boolean;
  activeMoment: boolean;
  editingBlocked: boolean;
  canEdit: boolean;
  sketchSaved: boolean;
  unreadSketch: boolean;
}

export interface HomeActionDefinition {
  id: HomeActionId;
  label: string;
  description: string;
  icon: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  drawerGroup: HomeActionGroup | null;
  drawerOrder: number;
  sceneEntry: 'fireplace' | 'easel' | 'record-player' | 'instant-camera' | 'greenhouse' | null;
  availability?: (context: HomeActionContext) => { enabled: boolean; reason?: string };
  badge?: (context: HomeActionContext) => string | null;
}

export interface HomeAction extends HomeActionDefinition {
  enabled: boolean;
  disabledReason: string | null;
  badgeLabel: string | null;
}

const alwaysAvailable = () => ({ enabled: true });

/** Labels, placement, discoverability, unlock copy, and accessibility live here. */
export const HOME_ACTION_REGISTRY: readonly HomeActionDefinition[] = [
  {
    id: 'moments', label: 'Moments', description: 'Say what you need, gently.', icon: '♥',
    accessibilityLabel: 'Open Moments', accessibilityHint: 'Share or respond to a relationship moment',
    drawerGroup: null, drawerOrder: 0, sceneEntry: null,
  },
  {
    id: 'hearth', label: 'Fire', description: 'See what is happening by the fireplace.', icon: '♨',
    accessibilityLabel: 'Open fireplace status', accessibilityHint: 'Focus the fireplace and its current state',
    drawerGroup: null, drawerOrder: 0, sceneEntry: 'fireplace',
  },
  {
    id: 'account', label: 'Account', description: 'Privacy, recovery, and home settings.', icon: '●',
    accessibilityLabel: 'Open account and privacy settings', accessibilityHint: 'Manage this phone and your Hearth account',
    drawerGroup: null, drawerOrder: 0, sceneEntry: null,
  },
  {
    id: 'today-sketch', label: "Today's sketch", description: 'Leave one tiny thing for each other.', icon: '✎',
    accessibilityLabel: "Open today's sketch", accessibilityHint: 'Draw or view the shared daily sketch',
    drawerGroup: 'Today & rituals', drawerOrder: 10, sceneEntry: 'easel',
    badge: (context) => context.unreadSketch ? 'New' : context.sketchSaved ? null : 'Open',
  },
  {
    id: 'sketchbook', label: 'Sketchbook', description: 'Turn through your shared daily pages.', icon: '▤',
    accessibilityLabel: 'Open sketchbook', accessibilityHint: 'Browse sketches by day',
    drawerGroup: 'Today & rituals', drawerOrder: 20, sceneEntry: null,
  },
  {
    id: 'daily-voice', label: 'Voice note', description: 'Record or hear today’s small hello.', icon: '♪',
    accessibilityLabel: "Open today's voice note", accessibilityHint: 'Record or listen at the record player',
    drawerGroup: 'Today & rituals', drawerOrder: 30, sceneEntry: 'record-player',
  },
  {
    id: 'daily-photo', label: 'Instant photo', description: 'Keep one ordinary glimpse from today.', icon: '▣',
    accessibilityLabel: "Open today's instant photo", accessibilityHint: 'Take, choose, or view a daily photo',
    drawerGroup: 'Today & rituals', drawerOrder: 40, sceneEntry: 'instant-camera',
  },
  {
    id: 'diary', label: 'Our diary', description: 'Find voice notes and sketches by date.', icon: '⌁',
    accessibilityLabel: 'Open our diary', accessibilityHint: 'Browse shared daily keepsakes by date',
    drawerGroup: 'Today & rituals', drawerOrder: 50, sceneEntry: null,
  },
  {
    id: 'memories', label: 'Memory greenhouse', description: 'Visit the stories growing in your garden.', icon: '♧',
    accessibilityLabel: 'Open memory greenhouse', accessibilityHint: 'Browse the memories planted in the garden',
    drawerGroup: 'Keepsakes', drawerOrder: 10, sceneEntry: 'greenhouse',
    availability: (context) => context.gardenUnlocked
      ? { enabled: true }
      : { enabled: false, reason: 'The garden opens after 30 active days together.' },
  },
  {
    id: 'wardrobe', label: 'Wardrobe', description: 'Choose how your character feels like you.', icon: '✦',
    accessibilityLabel: 'Open wardrobe', accessibilityHint: 'Customize your character',
    drawerGroup: 'Make it ours', drawerOrder: 10, sceneEntry: null,
  },
  {
    id: 'decorate', label: 'Decorate', description: 'Arrange your shared rooms together.', icon: '◆',
    accessibilityLabel: 'Decorate your shared home', accessibilityHint: 'Open home decorating mode',
    drawerGroup: 'Make it ours', drawerOrder: 20, sceneEntry: null,
    availability: (context) => context.activeMoment || context.editingBlocked || !context.canEdit
      ? { enabled: false, reason: 'Home editing rests while a Moment or home update is active.' }
      : { enabled: true },
  },
] as const;

function currentContext(): HomeActionContext {
  const home = useHomeStore.getState().resolved;
  const drawing = useDrawingStore.getState();
  return {
    gardenUnlocked: home.rooms.some((room) => room.id === 'garden'),
    activeMoment: Boolean(useMomentV2Store.getState().snapshot?.active),
    editingBlocked: home.capabilities.blockedByMoment,
    canEdit: home.capabilities.edit,
    sketchSaved: drawing.mineSaved,
    unreadSketch: Boolean(drawing.partnerGrid && !drawing.partnerSeen),
  };
}

function resolvedAction(definition: HomeActionDefinition, context: HomeActionContext): HomeAction {
  const availability: { enabled: boolean; reason?: string } =
    (definition.availability ?? alwaysAvailable)(context);
  return {
    ...definition,
    enabled: availability.enabled,
    disabledReason: availability.reason ?? null,
    badgeLabel: definition.badge?.(context) ?? null,
  };
}

export function getHomeAction(id: HomeActionId): HomeAction {
  const definition = HOME_ACTION_REGISTRY.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown home action: ${id}`);
  return resolvedAction(definition, currentContext());
}

export function performHomeAction(id: HomeActionId): boolean {
  const action = getHomeAction(id);
  if (!action.enabled) return false;
  const surfaces = useMomentsSurfaceStore.getState();
  switch (id) {
    case 'moments': surfaces.openMoments(); break;
    case 'hearth': surfaces.openHearth(); break;
    case 'account': surfaces.openSettings(); break;
    case 'today-sketch': surfaces.openDrawing('today'); break;
    case 'sketchbook': surfaces.openDrawing('sketchbook'); break;
    case 'daily-voice': surfaces.closeSurface(); router.push('/daily-record' as never); break;
    case 'daily-photo': surfaces.closeSurface(); router.push('/daily-photo' as never); break;
    case 'diary': surfaces.closeSurface(); router.push('/diary' as never); break;
    case 'memories': surfaces.closeSurface(); router.push('/greenhouse' as never); break;
    case 'wardrobe': surfaces.closeSurface(); router.push('/wardrobe' as never); break;
    case 'decorate':
      surfaces.openStudio('decorate');
      void useHomeStudioStore.getState().open('decorate');
      break;
  }
  return true;
}

export function useHomeActions(): HomeAction[] {
  const { components } = useHomeProgress();
  const activeMoment = useMomentV2Store((state) => Boolean(state.snapshot?.active));
  const editingBlocked = useHomeStore((state) => state.resolved.capabilities.blockedByMoment);
  const canEdit = useHomeStore((state) => state.resolved.capabilities.edit);
  const sketchSaved = useDrawingStore((state) => state.mineSaved);
  const partnerGrid = useDrawingStore((state) => state.partnerGrid);
  const partnerSeen = useDrawingStore((state) => state.partnerSeen);
  return useMemo(() => {
    const context: HomeActionContext = {
      gardenUnlocked: components.has('garden'),
      activeMoment,
      editingBlocked,
      canEdit,
      sketchSaved,
      unreadSketch: Boolean(partnerGrid && !partnerSeen),
    };
    return HOME_ACTION_REGISTRY.map((definition) => resolvedAction(definition, context));
  }, [activeMoment, canEdit, components, editingBlocked, partnerGrid, partnerSeen, sketchSaved]);
}
