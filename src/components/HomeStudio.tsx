import { useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { HOME_ASSETS, HOME_ASSET_REGISTRY } from '@/home/catalog';
import { COTTAGE_V2_GARDEN_MASKS, COTTAGE_V2_ROOM_MASKS } from '@/home/layouts';
import { paletteChoices } from '@/home/palettes';
import {
  applyHomeOperation,
  createHomeObjectId,
  findOpenPlacement,
  snapHomeCoordinate,
  validateHomeDraft,
} from '@/home/editor';
import type { GardenTier, HomeAssetDefinition, HomeObjectSnapshot, HomeRoomSize } from '@/home/types';
import { daysTogether } from '@/state/homeProgress';
import { useHomeStore } from '@/state/homeStore';
import { useHomeStudioStore, type HomeStudioTray } from '@/state/homeStudioStore';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { editorial } from '@/theme/hearth';

const TRAYS: readonly { id: HomeStudioTray; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'furnish', label: 'Furnish' },
  { id: 'decorate', label: 'Decorate' },
  { id: 'garden', label: 'Garden' },
  { id: 'stored', label: 'Stored' },
  { id: 'needs_spot', label: 'Needs a new spot' },
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

function catalogForTray(
  tray: HomeStudioTray,
  roomKind: string | null,
  unlockedDays: number,
) {
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

function ObjectRow({
  object,
  selected,
  onPress,
}: {
  object: HomeObjectSnapshot;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.objectRow, selected && styles.objectRowSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.objectName, selected && styles.objectNameSelected]}>
        {friendly(object.assetId)}
      </Text>
      <Text style={styles.objectMeta}>
        {object.placementState === 'placed'
          ? `${object.position[0].toFixed(2)}, ${object.position[2].toFixed(2)}`
          : friendly(object.placementState)}
      </Text>
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
  const activeMoment = useMomentV2Store((state) => Boolean(state.snapshot?.active));
  const homeStatus = useHomeStore((state) => state.status);
  const [section, setSection] = useState<'catalog' | 'diagnostics'>('catalog');
  const execute = useHomeStudioStore((state) => state.execute);
  const setMessage = useHomeStudioStore((state) => state.setMessage);
  const setGhost = useHomeStudioStore((state) => state.setPlacementGhost);
  const isDeveloper = mode === 'developer';

  const room = draft?.rooms.find((candidate) => candidate.id === selectedRoomId) ?? null;
  const selected = draft?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const definition = selected ? HOME_ASSET_REGISTRY.get(selected.assetId) : null;
  const selectedVariants = typeof definition?.progression.style_variants === 'string'
    ? definition.progression.style_variants.split(',').filter(Boolean) : [];

  const exitStudioSurface = () => {
    useMomentsSurfaceStore.getState().setSettingsOpen(false);
    useMomentV2Store.getState().resumePlayback();
  };

  const cancel = () => {
    const discard = async () => {
      await useHomeStudioStore.getState().cancel();
      exitStudioSurface();
    };
    if (!operations.length) {
      void discard();
      return;
    }
    Alert.alert(
      'Discard this draft?',
      'Your unsaved Home Studio changes will be removed.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => void discard() },
      ],
    );
  };

  const save = async () => {
    if (activeMoment) {
      setMessage('Finish the active Moment before saving the home.');
      return;
    }
    if (!isDeveloper && !draft?.capabilities.edit) {
      setMessage('Your shared world is currently view-only. Everything remains safe and visible.');
      return;
    }
    const saved = await useHomeStudioStore.getState().save();
    if (saved) exitStudioSurface();
  };

  const tryAdd = (asset: HomeAssetDefinition) => {
    if (!draft || !room) return;
    const placement = findOpenPlacement(draft, asset.id, room.id);
    if (!placement) {
      setMessage(`No valid ${room.moduleId} space is open for ${friendly(asset.id)}.`);
      return;
    }
    execute({
      type: 'add',
      objectId: createHomeObjectId(),
      roomId: room.id,
      assetId: asset.id,
      surface: placement.surface,
      position: placement.position,
      rotation: 0,
      parentObjectId: placement.parentObjectId,
      attachmentSocket: placement.attachmentSocket,
    });
  };

  const restoreObject = (object: HomeObjectSnapshot) => {
    if (!draft || !room) return;
    const placement = findOpenPlacement(draft, object.assetId, room.id);
    if (!placement) {
      setMessage(`No valid ${room.moduleId} space is open for ${friendly(object.assetId)}.`);
      return;
    }
    execute({
      type: 'move', objectId: object.id, roomId: room.id,
      surface: placement.surface, position: placement.position,
    });
  };

  const nudge = (x: number, z: number) => {
    if (!selected || !room) return;
    execute({
      type: 'move',
      objectId: selected.id,
      roomId: room.id,
      surface: selected.surface,
      position: [
        snapHomeCoordinate(selected.position[0] + x),
        selected.position[1],
        snapHomeCoordinate(selected.position[2] + z),
      ],
    });
  };

  const resizeRoom = (sizeTier: HomeRoomSize) => {
    if (!room || room.moduleId === 'garden') return;
    const masks = COTTAGE_V2_ROOM_MASKS[room.moduleId];
    if (!masks) return;
    execute({ type: 'resize', roomId: room.id, sizeTier, bounds: { ...masks[sizeTier] } });
  };

  const resizeGarden = (gardenTier: GardenTier) => {
    if (!room || room.moduleId !== 'garden') return;
    const mask = COTTAGE_V2_GARDEN_MASKS[gardenTier];
    execute({
      type: 'resize',
      roomId: room.id,
      sizeTier: mask.sizeTier,
      bounds: { ...mask.bounds },
      gardenTier,
    });
  };

  const attachRoom = (moduleId: 'bedroom' | 'future-room') => {
    if (!draft) return;
    const socketId = moduleId === 'bedroom' ? 'bedroom-north' : 'future-east';
    if (draft.rooms.some((candidate) => candidate.socketId === socketId)) return;
    const roomId = createHomeObjectId();
    execute({
      type: 'attach_module',
      roomId,
      moduleId,
      socketId,
      sizeTier: 'compact',
      bounds: { ...COTTAGE_V2_ROOM_MASKS[moduleId].compact },
    });
    useHomeStudioStore.getState().selectRoom(roomId);
  };

  const dragPlacement = (dx: number, dy: number) => {
    if (!selected || !room || !draft) return null;
    const position: [number, number, number] = [
      snapHomeCoordinate(selected.position[0] + dx * 0.015),
      selected.position[1],
      snapHomeCoordinate(selected.position[2] + dy * 0.015),
    ];
    try {
      const candidate = applyHomeOperation(draft, {
        type: 'move', objectId: selected.id, roomId: room.id,
        surface: selected.surface, position,
      });
      return {
        position,
        valid: !validateHomeDraft(candidate).some((problem) => problem.objectIds.includes(selected.id)),
      };
    } catch {
      return { position, valid: false };
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => Boolean(selected && room),
    onMoveShouldSetPanResponder: (_event, gesture) => Boolean(selected && room
      && Math.hypot(gesture.dx, gesture.dy) > 3),
    onPanResponderMove: (_event, gesture) => {
      const candidate = dragPlacement(gesture.dx, gesture.dy);
      if (!candidate || !selected) return;
      setGhost({
        objectId: selected.id,
        assetId: selected.assetId,
        position: candidate.position,
        rotation: selected.rotation,
        valid: candidate.valid,
      });
    },
    onPanResponderRelease: (_event, gesture) => {
      const candidate = dragPlacement(gesture.dx, gesture.dy);
      setGhost(null);
      if (!candidate || !selected || !room) return;
      if (!candidate.valid) {
        setMessage('That red placement blocks a boundary, route, or another object.');
        return;
      }
      execute({
        type: 'move', objectId: selected.id, roomId: room.id,
        surface: selected.surface, position: candidate.position,
      });
    },
    onPanResponderTerminate: () => setGhost(null),
  });

  if (!isOpen || !draft) return null;

  const placedObjects = draft.objects.filter((object) =>
    object.roomId === selectedRoomId && object.placementState === 'placed');
  const storedObjects = draft.objects.filter((object) =>
    object.placementState === 'stored' && !object.parentObjectId);
  const needsSpotObjects = draft.objects.filter((object) =>
    object.placementState === 'needs_spot' && !object.parentObjectId);
  const trayObjects = tray === 'stored' ? storedObjects
    : tray === 'needs_spot' ? needsSpotObjects : null;
  const growthDays = daysTogether(draft.pairedAt);
  const unlockedDays = isDeveloper ? Infinity : growthDays;
  const availableTrays = isDeveloper
    ? TRAYS
    : TRAYS.filter((candidate) => ['furnish', 'decorate', 'stored', 'needs_spot'].includes(candidate.id)
      || (candidate.id === 'garden' && room?.moduleId === 'garden' && growthDays >= 30));
  const catalog = catalogForTray(tray, room?.moduleId ?? null, unlockedDays);
  const blockingIssues = issues.filter((problem) => problem.code !== 'frozen_simulation');
  const effectiveSection = isDeveloper ? section : 'catalog';
  const sceneCost = draft.objects
    .filter((object) => object.placementState === 'placed')
    .reduce((total, object) => total + (HOME_ASSET_REGISTRY.get(object.assetId)?.renderCost ?? 2), 0);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolbarButton} onPress={cancel} accessibilityLabel="Cancel Home Studio">
          <Text style={styles.toolbarButtonText}>Cancel</Text>
        </Pressable>
        <View style={styles.toolbarTitleWrap}>
          <Text style={styles.eyebrow}>{isDeveloper ? 'Developer' : `Day ${Math.floor(growthDays) + 1}`}</Text>
          <Text style={styles.toolbarTitle}>{isDeveloper ? 'Home Studio' : 'Decorate'}</Text>
        </View>
        <View style={styles.historyRow}>
          <Pressable
            style={[styles.iconButton, !undoStack.length && styles.buttonDisabled]}
            onPress={() => useHomeStudioStore.getState().undo()}
            disabled={!undoStack.length}
            accessibilityLabel="Undo home edit"
          ><Text style={styles.iconText}>↶</Text></Pressable>
          <Pressable
            style={[styles.iconButton, !redoStack.length && styles.buttonDisabled]}
            onPress={() => useHomeStudioStore.getState().redo()}
            disabled={!redoStack.length}
            accessibilityLabel="Redo home edit"
          ><Text style={styles.iconText}>↷</Text></Pressable>
        </View>
        <Pressable
          style={[styles.saveButton, (saving || activeMoment || (!isDeveloper && !draft.capabilities.edit) || blockingIssues.length > 0 || conflicts.length > 0) && styles.buttonDisabled]}
          onPress={() => void save()}
          disabled={saving || activeMoment || (!isDeveloper && !draft.capabilities.edit) || blockingIssues.length > 0 || conflicts.length > 0}
          accessibilityLabel="Save home atomically"
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <View style={styles.areaBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaContent}>
          {draft.rooms.map((candidate) => (
            <Pressable
              key={candidate.id}
              style={[styles.areaChoice, candidate.id === selectedRoomId && styles.areaChoiceSelected]}
              onPress={() => useHomeStudioStore.getState().selectRoom(candidate.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: candidate.id === selectedRoomId }}
            >
              <Text style={[styles.areaText, candidate.id === selectedRoomId && styles.areaTextSelected]}>
                {friendly(candidate.moduleId)} · {friendly(candidate.sizeTier)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.workArea} pointerEvents="box-none">
        <View style={styles.sceneHint} pointerEvents="none">
          <Text style={styles.sceneHintText}>
            {isDeveloper
              ? 'The mounted home is your preview. Use the grid pad or accessible nudges to move a selection.'
              : 'Arrange the pieces you have grown into together. New choices unlock with active time.'}
          </Text>
        </View>

        <View style={styles.panel}>
          {isDeveloper && <View style={styles.sectionTabs}>
            <Pressable onPress={() => setSection('catalog')} style={[styles.sectionTab, section === 'catalog' && styles.sectionTabSelected]}>
              <Text style={styles.sectionTabText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => setSection('diagnostics')} style={[styles.sectionTab, section === 'diagnostics' && styles.sectionTabSelected]}>
              <Text style={styles.sectionTabText}>Diagnostics</Text>
            </Pressable>
          </View>}

          {effectiveSection === 'diagnostics' ? (
            <ScrollView style={styles.panelScroll} contentContainerStyle={styles.diagnostics}>
              <Text style={styles.panelTitle}>Current snapshot</Text>
              <Text style={styles.diagnosticLine}>Revision {base?.revision ?? 0} · {homeStatus}</Text>
              <Text style={styles.diagnosticLine}>{draft.objects.length} objects · render cost {sceneCost}/480</Text>
              <Text style={styles.diagnosticLine}>{operations.length} local command{operations.length === 1 ? '' : 's'}</Text>
              <Text style={styles.diagnosticLine}>{draft.catalogVersion} · {draft.layoutId}</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>Frozen-world simulation</Text>
                  <Text style={styles.settingHint}>Preview the future read-only state. Developer Save stays available.</Text>
                </View>
                <Switch
                  value={simulateFrozen}
                  onValueChange={(value) => useHomeStudioStore.getState().setSimulateFrozen(value)}
                  accessibilityLabel="Frozen-world simulation"
                />
              </View>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => void Share.share({ message: JSON.stringify(draft, null, 2), title: 'Hearth home snapshot' })}
              ><Text style={styles.secondaryActionText}>Export snapshot</Text></Pressable>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => Alert.alert(
                  'Restore foundation layout?',
                  'Everything currently placed moves to Stored; the complete foundation layout is added to this draft.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Restore', onPress: () => useHomeStudioStore.getState().resetToFoundation() },
                  ],
                )}
              ><Text style={styles.secondaryActionText}>Reset layout</Text></Pressable>
              {issues.map((problem, index) => (
                <View key={`${problem.code}-${index}`} style={styles.issueCard}>
                  <Text style={styles.issueTitle}>{friendly(problem.code)}</Text>
                  <Text style={styles.issueText}>{problem.message}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trays}>
                {availableTrays.map((candidate) => (
                  <Pressable
                    key={candidate.id}
                    style={[styles.tray, tray === candidate.id && styles.traySelected]}
                    onPress={() => useHomeStudioStore.getState().setTray(candidate.id)}
                  ><Text style={[styles.trayText, tray === candidate.id && styles.trayTextSelected]}>{candidate.label}</Text></Pressable>
                ))}
              </ScrollView>

              <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
                {tray === 'build' && room && (
                  <View style={styles.expansionCard}>
                    <Text style={styles.panelTitle}>Authored expansion masks</Text>
                    <Text style={styles.selectionMeta}>
                      Rooms stay on their cottage-v2 sockets so the isometric cutaway remains readable.
                    </Text>
                    <View style={styles.tierRow}>
                      {(room.moduleId === 'garden' ? GARDEN_TIERS : ROOM_SIZES).map((tier) => {
                        const selectedTier = room.moduleId === 'garden'
                          ? draft.gardenTier === tier
                          : room.sizeTier === tier;
                        return (
                          <Pressable
                            key={tier}
                            style={[styles.tierButton, selectedTier && styles.tierButtonSelected]}
                            onPress={() => room.moduleId === 'garden'
                              ? resizeGarden(tier as GardenTier)
                              : resizeRoom(tier as HomeRoomSize)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: selectedTier }}
                          >
                            <Text style={[styles.tierButtonText, selectedTier && styles.tierButtonTextSelected]}>
                              {friendly(tier)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.actionRow}>
                      {!draft.rooms.some((candidate) => candidate.socketId === 'bedroom-north') && (
                        <Pressable style={styles.miniAction} onPress={() => attachRoom('bedroom')}>
                          <Text style={styles.miniActionText}>Attach bedroom</Text>
                        </Pressable>
                      )}
                      {!draft.rooms.some((candidate) => candidate.socketId === 'future-east') && (
                        <Pressable style={styles.miniAction} onPress={() => attachRoom('future-room')}>
                          <Text style={styles.miniActionText}>Attach future room</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {selected && definition && (
                  <View style={styles.selectionCard}>
                    <View style={styles.selectionHeader}>
                      <View style={styles.selectionCopy}>
                        <Text style={styles.panelTitle}>{friendly(selected.assetId)}</Text>
                        <Text style={styles.selectionMeta}>Snap grid {selected.position[0].toFixed(2)} × {selected.position[2].toFixed(2)}</Text>
                      </View>
                      <Pressable onPress={() => useHomeStudioStore.getState().selectObject(null)} hitSlop={8}>
                        <Text style={styles.clearSelection}>Clear</Text>
                      </Pressable>
                    </View>
                    <View style={styles.surfaceRow}>
                      {definition.compatibleSurfaces.map((surface) => (
                        <View key={surface} style={[styles.surfaceChip, selected.surface === surface && styles.surfaceChipSelected]}>
                          <Text style={styles.surfaceText}>{friendly(surface)}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.nudgeGrid} {...panResponder.panHandlers}>
                      <Text style={styles.dragLabel}>Drag this pad</Text>
                      <View style={styles.nudgeRow}>
                        <View style={styles.nudgeSpacer} />
                        <Pressable style={styles.nudge} onPress={() => nudge(0, -0.25)} accessibilityLabel="Nudge back"><Text>↑</Text></Pressable>
                        <View style={styles.nudgeSpacer} />
                      </View>
                      <View style={styles.nudgeRow}>
                        <Pressable style={styles.nudge} onPress={() => nudge(-0.25, 0)} accessibilityLabel="Nudge left"><Text>←</Text></Pressable>
                        <Pressable
                          style={styles.nudge}
                          onPress={() => execute({ type: 'rotate', objectId: selected.id, rotation: ((selected.rotation + 1) % 4) as 0 | 1 | 2 | 3 })}
                          accessibilityLabel="Rotate 90 degrees"
                        ><Text>↻</Text></Pressable>
                        <Pressable style={styles.nudge} onPress={() => nudge(0.25, 0)} accessibilityLabel="Nudge right"><Text>→</Text></Pressable>
                      </View>
                      <View style={styles.nudgeRow}>
                        <View style={styles.nudgeSpacer} />
                        <Pressable style={styles.nudge} onPress={() => nudge(0, 0.25)} accessibilityLabel="Nudge forward"><Text>↓</Text></Pressable>
                        <View style={styles.nudgeSpacer} />
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.miniAction}
                        onPress={() => {
                          const placement = room && findOpenPlacement(draft, selected.assetId, room.id);
                          if (!placement || !room) return setMessage('No open spot is available for a duplicate.');
                          execute({
                            type: 'add', objectId: createHomeObjectId(), roomId: room.id,
                            assetId: selected.assetId, surface: placement.surface,
                            position: placement.position, rotation: selected.rotation,
                            style: selected.style, parentObjectId: placement.parentObjectId,
                            attachmentSocket: placement.attachmentSocket,
                          });
                        }}
                      ><Text style={styles.miniActionText}>Duplicate</Text></Pressable>
                      <Pressable
                        style={[styles.miniAction, styles.storeAction]}
                        onPress={() => Alert.alert(
                          'Move to Stored?',
                          selected.parentObjectId ? 'This attached piece will be stored.' : 'Attached pieces move with their parent.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Store', onPress: () => execute({ type: 'store', objectId: selected.id }) },
                          ],
                        )}
                      ><Text style={styles.storeActionText}>Store</Text></Pressable>
                    </View>
                    {definition.paletteSlots.map((slot) => {
                      const choices = paletteChoices(slot);
                      if (!choices.length) return null;
                      return (
                        <View key={slot} style={styles.paletteBlock}>
                          <Text style={styles.paletteLabel}>{friendly(slot)}</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
                            {choices.map((choice) => {
                              const paletteSelected = selected.style[slot] === choice.id;
                              return (
                                <Pressable
                                  key={choice.id}
                                  style={[styles.paletteChoice, paletteSelected && styles.paletteChoiceSelected]}
                                  onPress={() => execute({ type: 'restyle', objectId: selected.id, style: { [slot]: choice.id } })}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected: paletteSelected }}
                                  accessibilityLabel={`${choice.label} ${friendly(slot)}`}
                                >
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
                            const variantSelected = (selected.style.variant ?? selectedVariants[0]) === variant;
                            return (
                              <Pressable
                                key={variant}
                                style={[styles.tierButton, variantSelected && styles.tierButtonSelected]}
                                onPress={() => execute({ type: 'restyle', objectId: selected.id, style: { variant } })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: variantSelected }}
                              >
                                <Text style={[styles.tierButtonText, variantSelected && styles.tierButtonTextSelected]}>{friendly(variant)}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.listHeading}>{trayObjects ? TRAYS.find((item) => item.id === tray)?.label : `${friendly(room?.moduleId ?? 'room')} objects`}</Text>
                {(trayObjects ?? placedObjects).map((object) => (
                  <ObjectRow
                    key={object.id}
                    object={object}
                    selected={selectedObjectId === object.id}
                    onPress={() => trayObjects ? restoreObject(object) : useHomeStudioStore.getState().selectObject(object.id)}
                  />
                ))}
                {(trayObjects ?? placedObjects).length === 0 && (
                  <Text style={styles.emptyText}>Nothing here yet.</Text>
                )}

                {!trayObjects && (
                  <>
                    <Text style={styles.listHeading}>{isDeveloper ? 'Every registered piece' : 'Unlocked pieces'}</Text>
                    {catalog.map((asset) => (
                      <View key={asset.id} style={styles.catalogRow}>
                        <View style={styles.catalogCopy}>
                          <Text style={styles.objectName}>{friendly(asset.id)}</Text>
                          <Text style={styles.objectMeta}>{friendly(asset.category)} · cost {asset.renderCost}</Text>
                        </View>
                        <Pressable
                          style={styles.addButton}
                          onPress={() => selected
                            ? execute({ type: 'replace', objectId: selected.id, assetId: asset.id })
                            : tryAdd(asset)}
                        ><Text style={styles.addButtonText}>{selected ? 'Replace' : 'Add'}</Text></Pressable>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </>
          )}

          {(message || conflicts.length > 0 || activeMoment) && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{activeMoment ? 'Home editing pauses until the active Moment ends.' : message}</Text>
              {conflicts.map((conflict) => <Text key={conflict} style={styles.conflictText}>• {conflict}</Text>)}
              {conflicts.length > 0 && (
                <View style={styles.conflictActions}>
                  <Pressable style={styles.noticeButton} onPress={() => useHomeStudioStore.getState().keepLocalResolution()}>
                    <Text style={styles.noticeButtonText}>Keep my replay</Text>
                  </Pressable>
                  <Pressable style={styles.noticeButton} onPress={() => void useHomeStudioStore.getState().usePartnerVersion()}>
                    <Text style={styles.noticeButtonText}>Use partner version</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 300, elevation: 70 },
  toolbar: { minHeight: 78, paddingTop: 18, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,250,241,0.97)', borderBottomWidth: 1, borderBottomColor: editorial.lineStrong },
  toolbarButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  toolbarButtonText: { color: editorial.clay, fontSize: 13, fontWeight: '800' },
  toolbarTitleWrap: { flex: 1, alignItems: 'center' },
  eyebrow: { color: editorial.inkSoft, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  toolbarTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 18, fontWeight: '800' },
  historyRow: { flexDirection: 'row', gap: 4 },
  iconButton: { width: 34, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  iconText: { color: editorial.ink, fontSize: 20, fontWeight: '800' },
  saveButton: { minWidth: 54, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.clay, paddingHorizontal: 10 },
  saveText: { color: editorial.onAccent, fontSize: 13, fontWeight: '900' },
  buttonDisabled: { opacity: 0.36 },
  areaBar: { backgroundColor: 'rgba(255,250,241,0.94)', borderBottomWidth: 1, borderBottomColor: editorial.line },
  areaContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 7 },
  areaChoice: { borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  areaChoiceSelected: { backgroundColor: editorial.clay, borderColor: editorial.clay },
  areaText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '800' },
  areaTextSelected: { color: editorial.onAccent },
  workArea: { flex: 1, justifyContent: 'flex-end' },
  sceneHint: { position: 'absolute', top: 12, alignSelf: 'center', maxWidth: 300, borderRadius: 14, backgroundColor: 'rgba(255,250,241,0.88)', paddingHorizontal: 12, paddingVertical: 7 },
  sceneHintText: { color: editorial.inkSoft, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  panel: { alignSelf: 'center', width: '100%', maxWidth: 500, height: '54%', minHeight: 330, backgroundColor: editorial.paperStrong, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: editorial.lineStrong, shadowColor: editorial.shadow, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 20, overflow: 'hidden' },
  sectionTabs: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 10, gap: 8 },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: editorial.paperTint },
  sectionTabSelected: { backgroundColor: editorial.clay },
  sectionTabText: { color: editorial.ink, fontSize: 12, fontWeight: '900' },
  trays: { paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  tray: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: editorial.line, backgroundColor: editorial.paper },
  traySelected: { borderColor: editorial.clay, backgroundColor: 'rgba(177,103,76,0.12)' },
  trayText: { color: editorial.inkSoft, fontSize: 10, fontWeight: '800' },
  trayTextSelected: { color: editorial.clay },
  panelScroll: { flex: 1 },
  panelContent: { paddingHorizontal: 14, paddingBottom: 90, gap: 7 },
  panelTitle: { color: editorial.ink, fontSize: 14, fontWeight: '900' },
  selectionCard: { borderRadius: 18, padding: 12, gap: 8, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong },
  expansionCard: { borderRadius: 18, padding: 12, gap: 8, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tierButton: { minHeight: 34, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  tierButtonSelected: { backgroundColor: editorial.clay, borderColor: editorial.clay },
  tierButtonText: { color: editorial.inkSoft, fontSize: 9, fontWeight: '900' },
  tierButtonTextSelected: { color: editorial.onAccent },
  selectionHeader: { flexDirection: 'row', alignItems: 'center' },
  selectionCopy: { flex: 1 },
  selectionMeta: { color: editorial.inkSoft, fontSize: 10, marginTop: 2 },
  clearSelection: { color: editorial.clay, fontSize: 11, fontWeight: '800' },
  surfaceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  surfaceChip: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: editorial.paperTint },
  surfaceChipSelected: { borderWidth: 1, borderColor: editorial.sage },
  surfaceText: { color: editorial.inkSoft, fontSize: 8, fontWeight: '800' },
  nudgeGrid: { alignSelf: 'center', minWidth: 132, borderRadius: 16, padding: 6, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  dragLabel: { color: editorial.inkSoft, fontSize: 8, fontWeight: '800', textAlign: 'center', marginBottom: 3 },
  nudgeRow: { flexDirection: 'row', justifyContent: 'center' },
  nudge: { width: 38, height: 30, margin: 2, borderRadius: 9, backgroundColor: editorial.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: editorial.line },
  nudgeSpacer: { width: 42 },
  actionRow: { flexDirection: 'row', gap: 6 },
  miniAction: { flex: 1, minHeight: 34, borderRadius: 10, backgroundColor: editorial.paperTint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: editorial.line },
  miniActionText: { color: editorial.ink, fontSize: 9, fontWeight: '900' },
  storeAction: { backgroundColor: 'rgba(167,66,50,0.08)' },
  storeActionText: { color: editorial.danger, fontSize: 9, fontWeight: '900' },
  paletteBlock: { gap: 4 },
  paletteLabel: { color: editorial.inkSoft, fontSize: 8, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  paletteRow: { gap: 6, paddingRight: 6 },
  variantRow: { flexDirection: 'row', gap: 6 },
  paletteChoice: { minWidth: 82, minHeight: 34, paddingHorizontal: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  paletteChoiceSelected: { borderColor: editorial.clay, backgroundColor: 'rgba(177,103,76,0.10)' },
  paletteSwatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(76,54,45,0.18)' },
  paletteChoiceText: { color: editorial.ink, fontSize: 8, fontWeight: '800' },
  listHeading: { color: editorial.clay, fontSize: 9, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase', marginTop: 7 },
  objectRow: { minHeight: 46, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.line },
  objectRowSelected: { borderColor: editorial.clay, backgroundColor: 'rgba(177,103,76,0.10)' },
  objectName: { color: editorial.ink, fontSize: 12, fontWeight: '800' },
  objectNameSelected: { color: editorial.clay },
  objectMeta: { color: editorial.inkSoft, fontSize: 9, marginTop: 2 },
  emptyText: { color: editorial.inkSoft, fontSize: 11, paddingVertical: 12, textAlign: 'center' },
  catalogRow: { minHeight: 50, borderRadius: 14, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.line },
  catalogCopy: { flex: 1 },
  addButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: editorial.clay },
  addButtonText: { color: editorial.onAccent, fontSize: 9, fontWeight: '900' },
  notice: { position: 'absolute', left: 12, right: 12, bottom: 10, borderRadius: 14, padding: 9, backgroundColor: editorial.ink, gap: 3 },
  noticeText: { color: editorial.onAccent, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  conflictText: { color: editorial.paperTint, fontSize: 9, lineHeight: 12 },
  conflictActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  noticeButton: { flex: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  noticeButtonText: { color: editorial.onAccent, fontSize: 8, fontWeight: '900' },
  diagnostics: { padding: 14, paddingBottom: 80, gap: 9 },
  diagnosticLine: { color: editorial.inkSoft, fontSize: 11, lineHeight: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  settingCopy: { flex: 1 },
  settingTitle: { color: editorial.ink, fontSize: 12, fontWeight: '800' },
  settingHint: { color: editorial.inkSoft, fontSize: 9, lineHeight: 13, marginTop: 2 },
  secondaryAction: { minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.line },
  secondaryActionText: { color: editorial.clay, fontSize: 11, fontWeight: '900' },
  issueCard: { borderRadius: 12, padding: 9, backgroundColor: 'rgba(167,66,50,0.08)', borderWidth: 1, borderColor: 'rgba(167,66,50,0.20)' },
  issueTitle: { color: editorial.danger, fontSize: 9, fontWeight: '900' },
  issueText: { color: editorial.ink, fontSize: 10, lineHeight: 14, marginTop: 2 },
});
