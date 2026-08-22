import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { HOME_ASSETS, HOME_ASSET_REGISTRY } from '@/home/catalog';
import {
  applyHomeOperation,
  createHomeObjectId,
  findOpenPlacement,
  validateHomeDraft,
} from '@/home/editor';
import { COTTAGE_V2_GARDEN_MASKS, COTTAGE_V2_ROOM_MASKS } from '@/home/layouts';
import { paletteChoices } from '@/home/palettes';
import {
  activeGrowthDays,
  gardenTierUnlockDay,
  moduleUnlockDay,
  roomSizeUnlockDay,
} from '@/home/progression';
import type {
  GardenTier,
  HomeAssetDefinition,
  HomeObjectSnapshot,
  HomeRoomSize,
  HomeSnapshot,
} from '@/home/types';
import { useHomeStore } from '@/state/homeStore';
import {
  type HomePlacementGhost,
  useHomeStudioStore,
  type HomeStudioTray,
} from '@/state/homeStudioStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { editorial } from '@/theme/hearth';
import { HomeAssetThumbnail } from './HomeAssetThumbnail';

const TRAYS: readonly { id: HomeStudioTray; label: string; help: string }[] = [
  { id: 'furnish', label: 'Furniture', help: 'Seats, tables, beds and storage' },
  { id: 'decorate', label: 'Finishing touches', help: 'Lights, plants, rugs and keepsakes' },
  { id: 'garden', label: 'Garden', help: 'Paths, planting and outdoor pieces' },
  { id: 'stored', label: 'Put away', help: 'Pieces ready to bring back' },
  { id: 'needs_spot', label: 'Place these', help: 'Pieces displaced by a room change' },
  { id: 'build', label: 'Rooms', help: 'Grow and arrange the home itself' },
];

const BUILD_CATEGORIES = new Set(['fireplace', 'portal', 'structure']);
const FURNISH_CATEGORIES = new Set(['storage', 'seating', 'surface', 'rest', 'bed']);
const DECORATE_CATEGORIES = new Set(['plant', 'lighting', 'keepsake', 'wall', 'textile']);
const ROOM_SIZES: readonly HomeRoomSize[] = ['compact', 'standard', 'large'];
const GARDEN_TIERS: readonly GardenTier[] = ['courtyard', 'standard', 'large', 'grand'];

const friendly = (value: string) => value
  .replaceAll('-', ' ')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const roomName = (moduleId: string) => {
  if (moduleId === 'living') return 'Living room';
  if (moduleId === 'future-room') return 'Extra room';
  return friendly(moduleId);
};

const tierName = (tier: HomeRoomSize | GardenTier) => ({
  compact: 'Cozy', standard: 'Roomy', large: 'Expanded',
  courtyard: 'Courtyard', grand: 'Grand garden',
}[tier] ?? friendly(tier));

function catalogForTray(tray: HomeStudioTray, roomKind: string | null, unlockedDays: number) {
  return HOME_ASSETS.filter((asset) => {
    if (roomKind && !asset.compatibleRooms.includes(roomKind as never)) return false;
    if (Number(asset.progression.day ?? 0) > unlockedDays) return false;
    if (tray === 'build') return BUILD_CATEGORIES.has(asset.category);
    if (tray === 'furnish') return FURNISH_CATEGORIES.has(asset.category);
    if (tray === 'decorate') return DECORATE_CATEGORIES.has(asset.category);
    if (tray === 'garden') return asset.compatibleRooms.includes('garden');
    return false;
  });
}

function placementIsValid(draft: HomeSnapshot, ghost: HomePlacementGhost) {
  try {
    let candidate = draft;
    if (ghost.isNew) {
      candidate = applyHomeOperation(candidate, {
        type: 'add', objectId: ghost.objectId, roomId: ghost.roomId,
        assetId: ghost.assetId, surface: ghost.surface, position: ghost.position,
        rotation: ghost.rotation, style: ghost.style,
        parentObjectId: ghost.parentObjectId ?? undefined,
        attachmentSocket: ghost.attachmentSocket ?? undefined,
      });
    } else {
      const object = draft.objects.find((item) => item.id === ghost.objectId);
      if (!object) return false;
      if (object.rotation !== ghost.rotation) {
        candidate = applyHomeOperation(candidate, {
          type: 'rotate', objectId: ghost.objectId, rotation: ghost.rotation,
        });
      }
      candidate = applyHomeOperation(candidate, {
        type: 'move', objectId: ghost.objectId, roomId: ghost.roomId,
        surface: ghost.surface, position: ghost.position,
        parentObjectId: ghost.parentObjectId,
        attachmentSocket: ghost.attachmentSocket,
      });
    }
    return !validateHomeDraft(candidate).some((issue) => issue.objectIds.includes(ghost.objectId));
  } catch {
    return false;
  }
}

function AssetCard({ asset, actionLabel, onPress }: {
  asset: HomeAssetDefinition;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.assetCard}>
      <HomeAssetThumbnail asset={asset} />
      <Text style={styles.assetName} numberOfLines={1}>{friendly(asset.id)}</Text>
      <Text style={styles.assetKind} numberOfLines={1}>{friendly(asset.category)}</Text>
      <Pressable style={styles.assetAction} onPress={onPress} accessibilityLabel={`${actionLabel} ${friendly(asset.id)}`}>
        <Text style={styles.assetActionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function PlacedCard({ object, selected, onPress }: {
  object: HomeObjectSnapshot;
  selected: boolean;
  onPress: () => void;
}) {
  const definition = HOME_ASSET_REGISTRY.get(object.assetId);
  if (!definition) return null;
  return (
    <Pressable
      style={[styles.placedCard, selected && styles.placedCardSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.placedPreview}><HomeAssetThumbnail asset={definition} /></View>
      <View style={styles.placedCopy}>
        <Text style={[styles.assetName, selected && styles.selectedInk]} numberOfLines={1}>{friendly(object.assetId)}</Text>
        <Text style={styles.assetKind}>{object.placementState === 'placed' ? 'In this room' : 'Ready to place'}</Text>
      </View>
    </Pressable>
  );
}

export function HomeStudio() {
  const isOpen = useHomeStudioStore((state) => state.isOpen);
  const mode = useHomeStudioStore((state) => state.mode);
  const draft = useHomeStudioStore((state) => state.draftSnapshot);
  const base = useHomeStudioStore((state) => state.baseSnapshot);
  const operations = useHomeStudioStore((state) => state.operations);
  const undoStack = useHomeStudioStore((state) => state.undoStack);
  const redoStack = useHomeStudioStore((state) => state.redoStack);
  const selectedRoomId = useHomeStudioStore((state) => state.selectedRoomId);
  const selectedObjectId = useHomeStudioStore((state) => state.selectedObjectId);
  const tray = useHomeStudioStore((state) => state.tray);
  const issues = useHomeStudioStore((state) => state.issues);
  const conflicts = useHomeStudioStore((state) => state.conflictMessages);
  const message = useHomeStudioStore((state) => state.message);
  const saving = useHomeStudioStore((state) => state.saving);
  const simulateFrozen = useHomeStudioStore((state) => state.simulateFrozen);
  const ghost = useHomeStudioStore((state) => state.placementGhost);
  const activeMoment = useMomentV2Store((state) => Boolean(state.snapshot?.active));
  const homeStatus = useHomeStore((state) => state.status);
  const [section, setSection] = useState<'catalog' | 'world' | 'diagnostics'>('catalog');
  const execute = useHomeStudioStore((state) => state.execute);
  const setMessage = useHomeStudioStore((state) => state.setMessage);
  const setGhost = useHomeStudioStore((state) => state.setPlacementGhost);
  const isDeveloper = mode === 'developer';

  const room = draft?.rooms.find((candidate) => candidate.id === selectedRoomId) ?? null;
  const selected = draft?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const activeDefinition = HOME_ASSET_REGISTRY.get(ghost?.assetId ?? selected?.assetId ?? '');
  const activeStyle = ghost?.style ?? selected?.style ?? {};
  const selectedVariants = typeof activeDefinition?.progression.style_variants === 'string'
    ? activeDefinition.progression.style_variants.split(',').filter(Boolean) : [];

  const exitStudioSurface = () => {
    useMomentsSurfaceStore.getState().setSettingsOpen(false);
    useMomentV2Store.getState().resumePlayback();
  };

  const cancel = () => {
    const discard = async () => {
      await useHomeStudioStore.getState().cancel();
      exitStudioSurface();
    };
    if (!operations.length) return void discard();
    Alert.alert('Discard your changes?', 'The shared home will stay exactly as it was before you opened the editor.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => void discard() },
    ]);
  };

  const save = async () => {
    if (ghost) return setMessage('Tap the tick to place this piece before saving.');
    if (activeMoment) return setMessage('Finish the active Moment before saving the home.');
    if (!isDeveloper && !draft?.capabilities.edit) {
      return setMessage('Your shared world is currently view-only. Everything remains safe and visible.');
    }
    const saved = await useHomeStudioStore.getState().save();
    if (saved) exitStudioSurface();
  };

  const stageAsset = (asset: HomeAssetDefinition, style: Record<string, unknown> = {}) => {
    if (!draft || !room) return;
    const placement = findOpenPlacement(draft, asset.id, room.id);
    if (!placement) {
      setMessage(`There is no clear space for ${friendly(asset.id)} in the ${roomName(room.moduleId).toLowerCase()}.`);
      return;
    }
    const pending: HomePlacementGhost = {
      objectId: createHomeObjectId(), assetId: asset.id, roomId: room.id,
      surface: placement.surface, position: placement.position, rotation: 0,
      style, parentObjectId: placement.parentObjectId ?? null,
      attachmentSocket: placement.attachmentSocket ?? null, isNew: true, valid: true,
    };
    useHomeStudioStore.getState().selectObject(null);
    setGhost(pending);
    setMessage('Drag the new piece in the room. Pinch or drag empty space to look around.');
  };

  const stageStoredObject = (object: HomeObjectSnapshot) => {
    if (!draft || !room) return;
    const placement = findOpenPlacement(draft, object.assetId, room.id);
    if (!HOME_ASSET_REGISTRY.has(object.assetId) || !placement) {
      setMessage(`There is no clear space for ${friendly(object.assetId)} here.`);
      return;
    }
    useHomeStudioStore.getState().selectObject(object.id);
    setGhost({
      objectId: object.id, assetId: object.assetId, roomId: room.id,
      surface: placement.surface, position: placement.position, rotation: object.rotation,
      style: object.style, parentObjectId: placement.parentObjectId ?? null,
      attachmentSocket: placement.attachmentSocket ?? null, isNew: false, valid: true,
    });
  };

  const confirmPlacement = () => {
    if (!draft || !ghost || !ghost.valid) return;
    if (ghost.isNew) {
      execute({
        type: 'add', objectId: ghost.objectId, roomId: ghost.roomId,
        assetId: ghost.assetId, surface: ghost.surface, position: ghost.position,
        rotation: ghost.rotation, style: ghost.style,
        parentObjectId: ghost.parentObjectId ?? undefined,
        attachmentSocket: ghost.attachmentSocket ?? undefined,
      });
    } else {
      const object = draft.objects.find((item) => item.id === ghost.objectId);
      if (!object) return;
      if (object.rotation !== ghost.rotation) execute({ type: 'rotate', objectId: ghost.objectId, rotation: ghost.rotation });
      if (JSON.stringify(object.style) !== JSON.stringify(ghost.style)) execute({ type: 'restyle', objectId: ghost.objectId, style: ghost.style });
      execute({
        type: 'move', objectId: ghost.objectId, roomId: ghost.roomId,
        surface: ghost.surface, position: ghost.position,
        parentObjectId: ghost.parentObjectId, attachmentSocket: ghost.attachmentSocket,
      });
    }
    setGhost(null);
    useHomeStudioStore.getState().setDraggingObject(null);
    setMessage(`${friendly(ghost.assetId)} placed. Save when the room feels right.`);
  };

  const cancelPlacement = () => {
    setGhost(null);
    useHomeStudioStore.getState().setDraggingObject(null);
    if (ghost?.isNew) useHomeStudioStore.getState().selectObject(null);
    setMessage(null);
  };

  const rotatePlacement = () => {
    if (!draft) return;
    const current: HomePlacementGhost | null = ghost ?? (selected && selected.roomId ? {
      objectId: selected.id, assetId: selected.assetId, roomId: selected.roomId,
      surface: selected.surface, position: selected.position, rotation: selected.rotation,
      style: selected.style, parentObjectId: selected.parentObjectId,
      attachmentSocket: selected.attachmentSocket, isNew: false, valid: true,
    } : null);
    if (!current) return;
    const next: HomePlacementGhost = { ...current, rotation: ((current.rotation + 1) % 4) as 0 | 1 | 2 | 3 };
    setGhost({ ...next, valid: placementIsValid(draft, next) });
  };

  const stageDuplicate = () => {
    if (!selected) return;
    const definition = HOME_ASSET_REGISTRY.get(selected.assetId);
    if (definition) stageAsset(definition, selected.style);
  };

  const setStyle = (key: string, value: string) => {
    if (ghost) {
      if (!draft) return;
      const next = { ...ghost, style: { ...ghost.style, [key]: value } };
      setGhost({ ...next, valid: placementIsValid(draft, next) });
    } else if (selected) execute({ type: 'restyle', objectId: selected.id, style: { [key]: value } });
  };

  const resizeRoom = (sizeTier: HomeRoomSize) => {
    if (!room || room.moduleId === 'garden') return;
    const masks = COTTAGE_V2_ROOM_MASKS[room.moduleId];
    if (masks) execute({ type: 'resize', roomId: room.id, sizeTier, bounds: { ...masks[sizeTier] } });
  };
  const resizeGarden = (gardenTier: GardenTier) => {
    if (!room || room.moduleId !== 'garden') return;
    const mask = COTTAGE_V2_GARDEN_MASKS[gardenTier];
    execute({ type: 'resize', roomId: room.id, sizeTier: mask.sizeTier, bounds: { ...mask.bounds }, gardenTier });
  };
  const attachRoom = (moduleId: 'bedroom' | 'future-room') => {
    if (!draft) return;
    const growthDays = activeGrowthDays(draft);
    if (!isDeveloper && growthDays < moduleUnlockDay(moduleId)) return setMessage(`${roomName(moduleId)} unlocks on active day ${moduleUnlockDay(moduleId)}.`);
    const socketId = moduleId === 'bedroom' ? 'bedroom-north' : 'future-east';
    if (draft.rooms.some((candidate) => candidate.socketId === socketId)) return;
    const roomId = createHomeObjectId();
    execute({ type: 'attach_module', roomId, moduleId, socketId, sizeTier: 'compact', bounds: { ...COTTAGE_V2_ROOM_MASKS[moduleId].compact } });
    useHomeStudioStore.getState().selectRoom(roomId);
  };

  if (!isOpen || !draft) return null;

  const placedObjects = draft.objects.filter((object) => object.roomId === selectedRoomId && object.placementState === 'placed' && !object.parentObjectId);
  const storedObjects = draft.objects.filter((object) => object.placementState === 'stored' && !object.parentObjectId);
  const needsSpotObjects = draft.objects.filter((object) => object.placementState === 'needs_spot' && !object.parentObjectId);
  const trayObjects = tray === 'stored' ? storedObjects : tray === 'needs_spot' ? needsSpotObjects : null;
  const growthDays = activeGrowthDays(draft);
  const unlockedDays = isDeveloper ? Infinity : growthDays;
  const availableTrays = TRAYS.filter((candidate) => isDeveloper
    || ['furnish', 'decorate'].includes(candidate.id)
    || (candidate.id === 'stored' && storedObjects.length > 0)
    || (candidate.id === 'needs_spot' && needsSpotObjects.length > 0)
    || (candidate.id === 'garden' && room?.moduleId === 'garden' && growthDays >= 30)
    || (candidate.id === 'build' && draft.capabilities.expand && growthDays >= 6));
  const availableRoomSizes = room ? ROOM_SIZES.filter((size) => isDeveloper || size === room.sizeTier || growthDays >= roomSizeUnlockDay(room.moduleId, size)) : [];
  const availableGardenTiers = GARDEN_TIERS.filter((tier) => isDeveloper || tier === draft.gardenTier || growthDays >= gardenTierUnlockDay(tier));
  const catalog = catalogForTray(tray, room?.moduleId ?? null, unlockedDays);
  const blockingIssues = issues.filter((problem) => problem.code !== 'frozen_simulation');
  const sceneCost = draft.objects.filter((object) => object.placementState === 'placed').reduce((total, object) => total + (HOME_ASSET_REGISTRY.get(object.assetId)?.renderCost ?? 2), 0);
  const saveDisabled = saving || Boolean(ghost) || activeMoment || (!isDeveloper && !draft.capabilities.edit) || blockingIssues.length > 0 || conflicts.length > 0;

  const paletteEditor = activeDefinition && (selected || ghost) ? (
    <View style={styles.paletteEditor}>
      {activeDefinition.paletteSlots.map((slot) => {
        const choices = paletteChoices(slot);
        if (!choices.length) return null;
        return (
          <View key={slot} style={styles.paletteBlock}>
            <Text style={styles.paletteLabel}>{friendly(slot)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
              {choices.map((choice) => {
                const chosen = activeStyle[slot] === choice.id;
                return (
                  <Pressable key={choice.id} style={[styles.paletteChoice, chosen && styles.paletteChoiceSelected]} onPress={() => setStyle(slot, choice.id)} accessibilityRole="radio" accessibilityState={{ selected: chosen }} accessibilityLabel={`${choice.label} ${friendly(slot)}`}>
                    <View style={[styles.paletteSwatch, { backgroundColor: choice.color }]} />
                    <Text style={styles.paletteChoiceText}>{choice.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
      {selectedVariants.length > 0 && (
        <View style={styles.paletteBlock}>
          <Text style={styles.paletteLabel}>Style</Text>
          <View style={styles.variantRow}>
            {selectedVariants.map((variant) => {
              const chosen = (activeStyle.variant ?? selectedVariants[0]) === variant;
              return <Pressable key={variant} style={[styles.choiceButton, chosen && styles.choiceButtonSelected]} onPress={() => setStyle('variant', variant)}><Text style={[styles.choiceButtonText, chosen && styles.choiceButtonTextSelected]}>{friendly(variant)}</Text></Pressable>;
            })}
          </View>
        </View>
      )}
    </View>
  ) : null;

  const worldTools = room ? (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.panelTitle}>{roomName(room.moduleId)}</Text>
        <Text style={styles.helpText}>Choose how much usable space this area has. Pieces that no longer fit move safely to “Place these”.</Text>
        <View style={styles.choiceRow}>
          {(room.moduleId === 'garden' ? availableGardenTiers : availableRoomSizes).map((tier) => {
            const chosen = room.moduleId === 'garden' ? draft.gardenTier === tier : room.sizeTier === tier;
            return <Pressable key={tier} style={[styles.choiceButton, chosen && styles.choiceButtonSelected]} onPress={() => room.moduleId === 'garden' ? resizeGarden(tier as GardenTier) : resizeRoom(tier as HomeRoomSize)} accessibilityState={{ selected: chosen }}><Text style={[styles.choiceButtonText, chosen && styles.choiceButtonTextSelected]}>{tierName(tier)}</Text></Pressable>;
          })}
        </View>
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.panelTitle}>Home areas</Text>
        <Text style={styles.helpText}>Add a room only when you want another distinct place in the shared home.</Text>
        <View style={styles.actionRow}>
          {!draft.rooms.some((candidate) => candidate.socketId === 'bedroom-north') && (isDeveloper || growthDays >= moduleUnlockDay('bedroom')) && <Pressable style={styles.secondaryButton} onPress={() => attachRoom('bedroom')}><Text style={styles.secondaryButtonText}>Add bedroom</Text></Pressable>}
          {!draft.rooms.some((candidate) => candidate.socketId === 'future-east') && (isDeveloper || growthDays >= moduleUnlockDay('future-room')) && <Pressable style={styles.secondaryButton} onPress={() => attachRoom('future-room')}><Text style={styles.secondaryButtonText}>Add extra room</Text></Pressable>}
        </View>
      </View>
      {isDeveloper && <Pressable style={styles.secondaryButton} onPress={() => Alert.alert('Restore foundation layout?', 'Placed pieces move safely to Put away before the authored foundation is restored.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => useHomeStudioStore.getState().resetToFoundation() }])}><Text style={styles.secondaryButtonText}>Reset layout</Text></Pressable>}
    </ScrollView>
  ) : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none" accessibilityViewIsModal>
      <View style={styles.toolbar} pointerEvents="auto">
        <Pressable style={styles.closeButton} onPress={cancel} accessibilityLabel="Cancel Home Studio"><Text style={styles.closeButtonText}>Cancel</Text></Pressable>
        <View style={styles.toolbarTitleWrap} pointerEvents="none"><Text style={styles.eyebrow}>{isDeveloper ? 'Developer tools' : `Day ${Math.floor(growthDays) + 1}`}</Text><Text style={styles.toolbarTitle}>{isDeveloper ? 'Home Studio' : 'Decorate home'}</Text></View>
        <Pressable style={[styles.saveButton, saveDisabled && styles.buttonDisabled]} onPress={() => void save()} disabled={saveDisabled}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text></Pressable>
      </View>

      <View style={styles.areaBar} pointerEvents="auto">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaContent}>
          {draft.rooms.map((candidate) => (
            <Pressable key={candidate.id} style={[styles.areaChoice, candidate.id === selectedRoomId && styles.areaChoiceSelected]} onPress={() => useHomeStudioStore.getState().selectRoom(candidate.id)} accessibilityRole="radio" accessibilityState={{ selected: candidate.id === selectedRoomId }}>
              <Text style={[styles.areaText, candidate.id === selectedRoomId && styles.areaTextSelected]}>{roomName(candidate.moduleId)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.workArea} pointerEvents="box-none">
        <View style={styles.sceneHint} pointerEvents="none"><Text style={styles.sceneHintText}>Drag a piece to move it · drag empty space to look around · pinch to zoom</Text></View>
        <View style={styles.panel} pointerEvents="auto">
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderCopy}><Text style={styles.panelTitle}>{ghost ? `Place ${friendly(ghost.assetId)}` : selected ? friendly(selected.assetId) : 'Choose what to change'}</Text><Text style={styles.helpText}>{ghost ? 'Green means the spot is clear. Red means keep moving.' : room ? roomName(room.moduleId) : 'Shared home'}</Text></View>
            <View style={styles.historyRow}>
              <Pressable style={[styles.iconButton, !undoStack.length && styles.buttonDisabled]} onPress={() => useHomeStudioStore.getState().undo()} disabled={!undoStack.length} accessibilityLabel="Undo home edit"><Text style={styles.iconText}>↶</Text></Pressable>
              <Pressable style={[styles.iconButton, !redoStack.length && styles.buttonDisabled]} onPress={() => useHomeStudioStore.getState().redo()} disabled={!redoStack.length} accessibilityLabel="Redo home edit"><Text style={styles.iconText}>↷</Text></Pressable>
            </View>
          </View>

          {ghost && <View style={[styles.placementBar, !ghost.valid && styles.placementBarInvalid]}><Pressable style={styles.placementCancel} onPress={cancelPlacement}><Text style={styles.placementCancelText}>Cancel</Text></Pressable><Pressable style={styles.rotateButton} onPress={rotatePlacement} accessibilityLabel="Rotate piece"><Text style={styles.rotateButtonText}>↻ Rotate</Text></Pressable><Pressable style={[styles.confirmButton, !ghost.valid && styles.buttonDisabled]} onPress={confirmPlacement} disabled={!ghost.valid} accessibilityLabel="Confirm this placement"><Text style={styles.confirmButtonText}>✓</Text></Pressable></View>}

          {isDeveloper && <View style={styles.sectionTabs}>{([['catalog', 'Catalog'], ['world', 'World'], ['diagnostics', 'QA']] as const).map(([id, label]) => <Pressable key={id} onPress={() => setSection(id)} style={[styles.sectionTab, section === id && styles.sectionTabSelected]}><Text style={[styles.sectionTabText, section === id && styles.sectionTabTextSelected]}>{label}</Text></Pressable>)}</View>}

          {(isDeveloper && section === 'world') || (!isDeveloper && tray === 'build') ? worldTools
            : isDeveloper && section === 'diagnostics' ? (
              <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
                <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricValue}>{draft.objects.length}</Text><Text style={styles.metricLabel}>Pieces</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{sceneCost}/480</Text><Text style={styles.metricLabel}>Scene load</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{operations.length}</Text><Text style={styles.metricLabel}>Changes</Text></View></View>
                <View style={styles.sectionCard}><Text style={styles.panelTitle}>Snapshot health</Text><Text style={styles.diagnosticLine}>Revision {base?.revision ?? 0} · {homeStatus}</Text><Text style={styles.diagnosticLine}>{draft.catalogVersion} · {draft.layoutId}</Text></View>
                <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Frozen-world simulation</Text><Text style={styles.helpText}>Preview the future read-only state without changing the saved world.</Text></View><Switch value={simulateFrozen} onValueChange={(value) => useHomeStudioStore.getState().setSimulateFrozen(value)} /></View>
                <Pressable style={styles.secondaryButton} onPress={() => void Share.share({ message: JSON.stringify(draft, null, 2), title: 'Hearth home snapshot' })}><Text style={styles.secondaryButtonText}>Export snapshot</Text></Pressable>
                {issues.map((problem, index) => <View key={`${problem.code}-${index}`} style={styles.issueCard}><Text style={styles.issueTitle}>{friendly(problem.code)}</Text><Text style={styles.issueText}>{problem.message}</Text></View>)}
              </ScrollView>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trays}>
                  {availableTrays.map((candidate) => <Pressable key={candidate.id} style={[styles.tray, tray === candidate.id && styles.traySelected]} onPress={() => useHomeStudioStore.getState().setTray(candidate.id)} accessibilityHint={candidate.help}><Text style={[styles.trayText, tray === candidate.id && styles.trayTextSelected]}>{candidate.label}</Text></Pressable>)}
                </ScrollView>
                <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
                  {(selected || ghost) && activeDefinition && <View style={styles.sectionCard}><Text style={styles.panelTitle}>Make it yours</Text><Text style={styles.helpText}>Drag the piece itself in the scene. Colors and styles update in this draft.</Text>{paletteEditor}{!ghost?.isNew && selected && <View style={styles.actionRow}><Pressable style={styles.secondaryButton} onPress={rotatePlacement}><Text style={styles.secondaryButtonText}>Rotate</Text></Pressable><Pressable style={styles.secondaryButton} onPress={stageDuplicate}><Text style={styles.secondaryButtonText}>Duplicate</Text></Pressable><Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => Alert.alert('Put this piece away?', 'You can bring it back later from Put away.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Put away', onPress: () => execute({ type: 'store', objectId: selected.id }) }])}><Text style={styles.dangerButtonText}>Put away</Text></Pressable></View>}</View>}
                  <Text style={styles.listHeading}>{trayObjects ? TRAYS.find((item) => item.id === tray)?.label : `Already in ${roomName(room?.moduleId ?? 'room')}`}</Text>
                  <View style={styles.placedGrid}>{(trayObjects ?? placedObjects).map((object) => <PlacedCard key={object.id} object={object} selected={selectedObjectId === object.id} onPress={() => trayObjects ? stageStoredObject(object) : useHomeStudioStore.getState().selectObject(object.id)} />)}</View>
                  {(trayObjects ?? placedObjects).length === 0 && <Text style={styles.emptyText}>Nothing here yet.</Text>}
                  {!trayObjects && tray !== 'build' && <><Text style={styles.listHeading}>{isDeveloper ? 'Complete catalog' : 'Add something'}</Text><View style={styles.assetGrid}>{catalog.map((asset) => <AssetCard key={asset.id} asset={asset} actionLabel="Add" onPress={() => stageAsset(asset)} />)}</View></>}
                </ScrollView>
              </>
            )}

          {(message || conflicts.length > 0 || activeMoment) && <View style={styles.notice}><Text style={styles.noticeText}>{activeMoment ? 'Home editing pauses until the active Moment ends.' : message}</Text>{conflicts.map((conflict) => <Text key={conflict} style={styles.conflictText}>• {conflict}</Text>)}{conflicts.length > 0 && <View style={styles.actionRow}><Pressable style={styles.noticeButton} onPress={() => useHomeStudioStore.getState().keepLocalResolution()}><Text style={styles.noticeButtonText}>Keep my changes</Text></Pressable><Pressable style={styles.noticeButton} onPress={() => void useHomeStudioStore.getState().usePartnerVersion()}><Text style={styles.noticeButtonText}>Use partner version</Text></Pressable></View>}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 300, elevation: 70 },
  toolbar: { minHeight: 76, paddingTop: 18, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,250,241,0.98)', borderBottomWidth: 1, borderBottomColor: editorial.lineStrong },
  closeButton: { width: 68, minHeight: 42, justifyContent: 'center', alignItems: 'flex-start' },
  closeButtonText: { color: editorial.clay, fontSize: 13, fontWeight: '900' },
  toolbarTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  eyebrow: { color: editorial.inkSoft, fontSize: 8, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  toolbarTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  saveButton: { width: 68, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.clay },
  saveText: { color: editorial.onAccent, fontSize: 13, fontWeight: '900' },
  buttonDisabled: { opacity: 0.35 },
  areaBar: { backgroundColor: 'rgba(255,250,241,0.95)', borderBottomWidth: 1, borderBottomColor: editorial.line },
  areaContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  areaChoice: { borderRadius: 14, minHeight: 38, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  areaChoiceSelected: { backgroundColor: editorial.clay, borderColor: editorial.clay },
  areaText: { color: editorial.inkSoft, fontSize: 12, fontWeight: '800' },
  areaTextSelected: { color: editorial.onAccent },
  workArea: { flex: 1, justifyContent: 'flex-end' },
  sceneHint: { position: 'absolute', top: 10, alignSelf: 'center', maxWidth: 330, borderRadius: 15, backgroundColor: 'rgba(255,250,241,0.90)', paddingHorizontal: 13, paddingVertical: 8 },
  sceneHintText: { color: editorial.inkSoft, fontSize: 10, lineHeight: 14, textAlign: 'center', fontWeight: '700' },
  panel: { alignSelf: 'center', width: '100%', maxWidth: 520, height: '48%', minHeight: 360, backgroundColor: editorial.paperStrong, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: editorial.lineStrong, shadowColor: editorial.shadow, shadowOpacity: 0.24, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 20, overflow: 'hidden' },
  panelHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: editorial.lineStrong, alignSelf: 'center', marginTop: 8 },
  panelHeader: { minHeight: 62, paddingHorizontal: 15, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelHeaderCopy: { flex: 1 },
  panelTitle: { color: editorial.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  helpText: { color: editorial.inkSoft, fontSize: 10, lineHeight: 14, marginTop: 2 },
  historyRow: { flexDirection: 'row', gap: 6 },
  iconButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  iconText: { color: editorial.ink, fontSize: 20, fontWeight: '900' },
  placementBar: { marginHorizontal: 13, marginBottom: 7, minHeight: 54, borderRadius: 18, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(111,151,101,0.16)', borderWidth: 1, borderColor: editorial.sage },
  placementBarInvalid: { backgroundColor: 'rgba(167,66,50,0.10)', borderColor: editorial.danger },
  placementCancel: { paddingHorizontal: 9, minHeight: 40, justifyContent: 'center' },
  placementCancelText: { color: editorial.danger, fontSize: 11, fontWeight: '900' },
  rotateButton: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: editorial.paper },
  rotateButtonText: { color: editorial.ink, fontSize: 11, fontWeight: '900' },
  confirmButton: { width: 48, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.sage },
  confirmButtonText: { color: editorial.onAccent, fontSize: 22, fontWeight: '900' },
  sectionTabs: { flexDirection: 'row', paddingHorizontal: 13, paddingBottom: 8, gap: 7 },
  sectionTab: { flex: 1, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint },
  sectionTabSelected: { backgroundColor: editorial.ink },
  sectionTabText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '900' },
  sectionTabTextSelected: { color: editorial.onAccent },
  trays: { paddingHorizontal: 13, paddingBottom: 9, gap: 7 },
  tray: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: editorial.line, backgroundColor: editorial.paper },
  traySelected: { borderColor: editorial.clay, backgroundColor: 'rgba(177,103,76,0.13)' },
  trayText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '800' },
  trayTextSelected: { color: editorial.clay },
  panelScroll: { flex: 1 },
  panelContent: { paddingHorizontal: 13, paddingBottom: 100, gap: 10 },
  sectionCard: { borderRadius: 19, padding: 13, gap: 10, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong },
  paletteEditor: { gap: 10 },
  paletteBlock: { gap: 6 },
  paletteLabel: { color: editorial.inkSoft, fontSize: 10, fontWeight: '900' },
  paletteRow: { gap: 8, paddingRight: 7 },
  paletteChoice: { minWidth: 92, minHeight: 48, paddingHorizontal: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  paletteChoiceSelected: { borderColor: editorial.clay, borderWidth: 2, backgroundColor: 'rgba(177,103,76,0.10)' },
  paletteSwatch: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(76,54,45,0.18)' },
  paletteChoiceText: { color: editorial.ink, fontSize: 10, fontWeight: '800' },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  choiceButtonSelected: { backgroundColor: editorial.clay, borderColor: editorial.clay },
  choiceButtonText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '900' },
  choiceButtonTextSelected: { color: editorial.onAccent },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { flexGrow: 1, minHeight: 42, borderRadius: 13, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  secondaryButtonText: { color: editorial.ink, fontSize: 10, fontWeight: '900' },
  dangerButton: { backgroundColor: 'rgba(167,66,50,0.08)' },
  dangerButtonText: { color: editorial.danger, fontSize: 10, fontWeight: '900' },
  listHeading: { color: editorial.clay, fontSize: 10, fontWeight: '900', marginTop: 4 },
  placedGrid: { gap: 7 },
  placedCard: { minHeight: 64, borderRadius: 16, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.line },
  placedCardSelected: { borderColor: editorial.clay, borderWidth: 2, backgroundColor: 'rgba(177,103,76,0.08)' },
  placedPreview: { width: 70, height: 50, borderRadius: 11, overflow: 'hidden' },
  placedCopy: { flex: 1 },
  selectedInk: { color: editorial.clay },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  assetCard: { width: '50%', paddingHorizontal: 4, paddingBottom: 10 },
  assetName: { color: editorial.ink, fontSize: 12, fontWeight: '900', marginTop: 6 },
  assetKind: { color: editorial.inkSoft, fontSize: 9, marginTop: 1 },
  assetAction: { minHeight: 38, marginTop: 7, borderRadius: 12, backgroundColor: editorial.clay, alignItems: 'center', justifyContent: 'center' },
  assetActionText: { color: editorial.onAccent, fontSize: 11, fontWeight: '900' },
  emptyText: { color: editorial.inkSoft, fontSize: 11, paddingVertical: 14, textAlign: 'center' },
  metricRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.line },
  metricValue: { color: editorial.ink, fontSize: 16, fontWeight: '900' },
  metricLabel: { color: editorial.inkSoft, fontSize: 9, marginTop: 2 },
  diagnosticLine: { color: editorial.inkSoft, fontSize: 11, lineHeight: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: editorial.paper },
  settingCopy: { flex: 1 },
  settingTitle: { color: editorial.ink, fontSize: 12, fontWeight: '900' },
  issueCard: { borderRadius: 14, padding: 10, backgroundColor: 'rgba(167,66,50,0.08)', borderWidth: 1, borderColor: 'rgba(167,66,50,0.20)' },
  issueTitle: { color: editorial.danger, fontSize: 10, fontWeight: '900' },
  issueText: { color: editorial.ink, fontSize: 10, lineHeight: 14, marginTop: 2 },
  notice: { position: 'absolute', left: 12, right: 12, bottom: 10, borderRadius: 15, padding: 10, backgroundColor: editorial.ink, gap: 4 },
  noticeText: { color: editorial.onAccent, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  conflictText: { color: editorial.paperTint, fontSize: 9, lineHeight: 12 },
  noticeButton: { flexGrow: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  noticeButtonText: { color: editorial.onAccent, fontSize: 9, fontWeight: '900' },
});
