import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { applyHomeEdit, fetchHomeSnapshot } from '@/home/api';
import {
  applyHomeOperation,
  cloneHomeSnapshot,
  createHomeObjectId,
  findOpenPlacement,
  validateHomeDraft,
  type HomeValidationIssue,
} from '@/home/editor';
import { HOME_ASSET_REGISTRY } from '@/home/catalog';
import { LEGACY_COTTAGE_V2_SNAPSHOT } from '@/home/layouts';
import type { HomeOperation, HomeSnapshot } from '@/home/types';
import { useAuthStore } from './authStore';
import { useHomeStore } from './homeStore';

export type HomeStudioTray =
  | 'build'
  | 'furnish'
  | 'decorate'
  | 'garden'
  | 'stored'
  | 'needs_spot';

export type HomeStudioMode = 'developer' | 'decorate';

interface DraftHistoryEntry {
  snapshot: HomeSnapshot;
  operations: HomeOperation[];
}

interface PersistedHomeDraft {
  baseRevision: number;
  catalogVersion: string;
  operations: HomeOperation[];
  pendingRequestId: string | null;
  mode: HomeStudioMode;
}

export interface HomePlacementGhost {
  objectId: string;
  assetId: string;
  position: [number, number, number];
  rotation: 0 | 1 | 2 | 3;
  valid: boolean;
}

interface HomeStudioState {
  isOpen: boolean;
  mode: HomeStudioMode;
  baseSnapshot: HomeSnapshot | null;
  draftSnapshot: HomeSnapshot | null;
  operations: HomeOperation[];
  undoStack: DraftHistoryEntry[];
  redoStack: DraftHistoryEntry[];
  selectedRoomId: string | null;
  selectedObjectId: string | null;
  tray: HomeStudioTray;
  issues: HomeValidationIssue[];
  conflictMessages: string[];
  message: string | null;
  saving: boolean;
  pendingRequestId: string | null;
  simulateFrozen: boolean;
  placementGhost: HomePlacementGhost | null;

  open: (mode?: HomeStudioMode) => Promise<void>;
  cancel: () => Promise<void>;
  execute: (operation: HomeOperation) => void;
  undo: () => void;
  redo: () => void;
  setTray: (tray: HomeStudioTray) => void;
  selectRoom: (roomId: string) => void;
  selectObject: (objectId: string | null) => void;
  save: () => Promise<boolean>;
  keepLocalResolution: () => void;
  usePartnerVersion: () => Promise<void>;
  resetToFoundation: () => void;
  setSimulateFrozen: (frozen: boolean) => void;
  setPlacementGhost: (ghost: HomePlacementGhost | null) => void;
  setMessage: (message: string | null) => void;
}

const draftKey = () => {
  const coupleId = useAuthStore.getState().couple?.id;
  return coupleId ? `@hearth/home-studio-draft/${coupleId}` : null;
};

const replay = (base: HomeSnapshot, operations: readonly HomeOperation[]) => {
  let snapshot = cloneHomeSnapshot(base);
  const failures: string[] = [];
  const replayed: HomeOperation[] = [];
  for (const operation of operations) {
    try {
      snapshot = applyHomeOperation(snapshot, operation);
      replayed.push(operation);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'A draft command is no longer compatible.');
    }
  }
  return { snapshot, operations: replayed, failures };
};

const changed = (before: unknown, after: unknown) => JSON.stringify(before) !== JSON.stringify(after);

function touchedConflictMessages(
  previousBase: HomeSnapshot,
  latest: HomeSnapshot,
  operations: readonly HomeOperation[],
) {
  const messages = new Set<string>();
  for (const operation of operations) {
    if ('objectId' in operation) {
      const before = previousBase.objects.find((object) => object.id === operation.objectId);
      const after = latest.objects.find((object) => object.id === operation.objectId);
      if (before && changed(before, after)) messages.add(`${before.assetId} was also changed by your partner.`);
      if (before && !after) messages.add(`${before.assetId} is no longer available.`);
    }
    if ('roomId' in operation && operation.type === 'resize') {
      const before = previousBase.rooms.find((room) => room.id === operation.roomId);
      const after = latest.rooms.find((room) => room.id === operation.roomId);
      if (before && changed(before, after)) messages.add(`${before.moduleId} was also resized by your partner.`);
    }
    if (operation.type === 'change_finish' || operation.type === 'change_terrain') {
      if (changed(previousBase.finishes[operation.target], latest.finishes[operation.target])) {
        messages.add(`${operation.target} was also restyled by your partner.`);
      }
    }
    if (operation.type === 'attach_module'
      && latest.rooms.some((room) => room.socketId === operation.socketId)
      && !previousBase.rooms.some((room) => room.socketId === operation.socketId)) {
      messages.add(`${operation.socketId} was filled by your partner.`);
    }
  }
  return [...messages];
}

async function persistDraft(state: Pick<
  HomeStudioState,
  'baseSnapshot' | 'operations' | 'pendingRequestId' | 'mode'
>) {
  const key = draftKey();
  if (!key || !state.baseSnapshot) return;
  const persisted: PersistedHomeDraft = {
    baseRevision: state.baseSnapshot.revision,
    catalogVersion: state.baseSnapshot.catalogVersion,
    operations: state.operations,
    pendingRequestId: state.pendingRequestId,
    mode: state.mode,
  };
  await AsyncStorage.setItem(key, JSON.stringify(persisted));
}

async function clearPersistedDraft() {
  const key = draftKey();
  if (key) await AsyncStorage.removeItem(key);
}

function validationFor(snapshot: HomeSnapshot, simulateFrozen: boolean) {
  const issues = validateHomeDraft(snapshot);
  if (simulateFrozen) {
    issues.unshift({
      code: 'frozen_simulation',
      message: 'Frozen-world simulation is on. Developer Save remains available for QA.',
      objectIds: [],
      blocking: true,
    });
  }
  return issues;
}

export const useHomeStudioStore = create<HomeStudioState>((set, get) => ({
  isOpen: false,
  mode: 'developer',
  baseSnapshot: null,
  draftSnapshot: null,
  operations: [],
  undoStack: [],
  redoStack: [],
  selectedRoomId: null,
  selectedObjectId: null,
  tray: 'furnish',
  issues: [],
  conflictMessages: [],
  message: null,
  saving: false,
  pendingRequestId: null,
  simulateFrozen: false,
  placementGhost: null,

  open: async (mode = 'developer') => {
    const authoritative = cloneHomeSnapshot(useHomeStore.getState().snapshot);
    let draft = authoritative;
    let operations: HomeOperation[] = [];
    let pendingRequestId: string | null = null;
    let message: string | null = null;
    const key = draftKey();
    if (key) {
      try {
        const raw = await AsyncStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) as PersistedHomeDraft : null;
        if (stored?.catalogVersion === authoritative.catalogVersion) {
          const replayed = replay(authoritative, stored.operations);
          draft = replayed.snapshot;
          operations = replayed.operations;
          pendingRequestId = stored.baseRevision === authoritative.revision && stored.mode === mode
            ? stored.pendingRequestId : null;
          message = replayed.failures.length
            ? `${replayed.failures.length} offline command${replayed.failures.length === 1 ? '' : 's'} need review.`
            : stored.operations.length ? 'Offline draft restored.' : null;
        }
      } catch {
        message = 'The saved offline draft could not be restored.';
      }
    }
    const selectedRoomId = draft.rooms.find((room) => room.moduleId === 'living')?.id
      ?? draft.rooms[0]?.id ?? null;
    set({
      isOpen: true,
      mode,
      baseSnapshot: authoritative,
      draftSnapshot: draft,
      operations,
      undoStack: [],
      redoStack: [],
      selectedRoomId,
      selectedObjectId: null,
      tray: 'furnish',
      issues: validationFor(draft, get().simulateFrozen),
      conflictMessages: [],
      message,
      saving: false,
      pendingRequestId,
      placementGhost: null,
    });
    useHomeStore.getState().previewSnapshot(draft);
  },

  cancel: async () => {
    await clearPersistedDraft();
    useHomeStore.getState().clearPreview();
    set({
      isOpen: false,
      baseSnapshot: null,
      draftSnapshot: null,
      operations: [],
      undoStack: [],
      redoStack: [],
      selectedObjectId: null,
      issues: [],
      conflictMessages: [],
      message: null,
      saving: false,
      pendingRequestId: null,
      placementGhost: null,
    });
  },

  execute: (operation) => {
    const state = get();
    if (!state.draftSnapshot || state.saving) return;
    if (state.pendingRequestId) {
      set({ message: 'Retry Save before making more changes; the previous request may have reached the server.' });
      return;
    }
    try {
      const next = applyHomeOperation(state.draftSnapshot, operation);
      const operations = [...state.operations, operation];
      const undoStack = [...state.undoStack, {
        snapshot: state.draftSnapshot,
        operations: state.operations,
      }].slice(-80);
      useHomeStore.getState().previewSnapshot(next);
      set({
        draftSnapshot: next,
        operations,
        undoStack,
        redoStack: [],
        selectedObjectId: 'objectId' in operation ? operation.objectId : state.selectedObjectId,
        issues: validationFor(next, state.simulateFrozen),
        message: null,
      });
      void persistDraft({ ...state, baseSnapshot: state.baseSnapshot, operations, pendingRequestId: null });
    } catch (error) {
      set({ message: error instanceof Error ? error.message : 'That edit could not be applied.' });
    }
  },

  undo: () => {
    const state = get();
    if (!state.draftSnapshot || !state.undoStack.length || state.pendingRequestId) return;
    const previous = state.undoStack.at(-1)!;
    const redoStack = [...state.redoStack, {
      snapshot: state.draftSnapshot,
      operations: state.operations,
    }];
    useHomeStore.getState().previewSnapshot(previous.snapshot);
    set({
      draftSnapshot: previous.snapshot,
      operations: previous.operations,
      undoStack: state.undoStack.slice(0, -1),
      redoStack,
      issues: validationFor(previous.snapshot, state.simulateFrozen),
      message: null,
    });
    void persistDraft({ ...state, operations: previous.operations, pendingRequestId: null });
  },

  redo: () => {
    const state = get();
    if (!state.draftSnapshot || !state.redoStack.length || state.pendingRequestId) return;
    const next = state.redoStack.at(-1)!;
    const undoStack = [...state.undoStack, {
      snapshot: state.draftSnapshot,
      operations: state.operations,
    }];
    useHomeStore.getState().previewSnapshot(next.snapshot);
    set({
      draftSnapshot: next.snapshot,
      operations: next.operations,
      undoStack,
      redoStack: state.redoStack.slice(0, -1),
      issues: validationFor(next.snapshot, state.simulateFrozen),
      message: null,
    });
    void persistDraft({ ...state, operations: next.operations, pendingRequestId: null });
  },

  setTray: (tray) => set({ tray }),
  selectRoom: (selectedRoomId) => set({ selectedRoomId, selectedObjectId: null }),
  selectObject: (selectedObjectId) => set({ selectedObjectId }),

  save: async () => {
    const state = get();
    if (!state.baseSnapshot || !state.draftSnapshot || state.saving) return false;
    if (state.conflictMessages.length) {
      set({ message: 'Resolve the partner conflict before saving.' });
      return false;
    }
    const blocking = validateHomeDraft(state.draftSnapshot);
    if (blocking.length) {
      set({ issues: validationFor(state.draftSnapshot, state.simulateFrozen), message: 'Fix the highlighted home rules before saving.' });
      return false;
    }
    if (!state.operations.length) {
      await get().cancel();
      return true;
    }
    set({ saving: true, message: null });
    try {
      // An uncertain request is retried with the same id before any refetch, so
      // a response lost after commit can be recovered without duplicating adds.
      if (state.pendingRequestId) {
        const retry = await applyHomeEdit(
          state.pendingRequestId,
          state.baseSnapshot.revision,
          state.baseSnapshot.catalogVersion,
          state.mode === 'developer'
            ? state.operations.map((operation) => ({ ...operation, developer: true }))
            : state.operations,
        );
        if (retry.ok) {
          useHomeStore.getState().ingestSnapshot(retry.snapshot);
          await clearPersistedDraft();
          useHomeStore.getState().clearPreview();
          set({ isOpen: false, saving: false, pendingRequestId: null, placementGhost: null });
          return true;
        }
      }

      const latest = await fetchHomeSnapshot();
      if (latest.revision !== state.baseSnapshot.revision) {
        const touched = touchedConflictMessages(state.baseSnapshot, latest, state.operations);
        const replayed = replay(latest, state.operations);
        const replayIssues = validateHomeDraft(replayed.snapshot);
        const conflictMessages = [...touched, ...replayed.failures, ...replayIssues.map((problem) => problem.message)];
        useHomeStore.getState().ingestSnapshot(latest);
        useHomeStore.getState().previewSnapshot(replayed.snapshot);
        set({
          baseSnapshot: latest,
          draftSnapshot: replayed.snapshot,
          operations: replayed.operations,
          undoStack: [],
          redoStack: [],
          issues: validationFor(replayed.snapshot, state.simulateFrozen),
          conflictMessages,
          pendingRequestId: null,
          saving: false,
          message: conflictMessages.length
            ? 'Your partner also changed this home. Choose which version to keep.'
            : 'Partner changes merged. Review the draft, then Save again.',
        });
        await persistDraft({ baseSnapshot: latest, operations: replayed.operations, pendingRequestId: null, mode: state.mode });
        return false;
      }

      const requestId = createHomeObjectId();
      set({ pendingRequestId: requestId });
      await persistDraft({ baseSnapshot: state.baseSnapshot, operations: state.operations, pendingRequestId: requestId, mode: state.mode });
      const result = await applyHomeEdit(
        requestId,
        state.baseSnapshot.revision,
        state.baseSnapshot.catalogVersion,
        state.mode === 'developer'
          ? state.operations.map((operation) => ({ ...operation, developer: true }))
          : state.operations,
      );
      if (result.ok) {
        useHomeStore.getState().ingestSnapshot(result.snapshot);
        await clearPersistedDraft();
        useHomeStore.getState().clearPreview();
        set({ isOpen: false, saving: false, pendingRequestId: null, placementGhost: null });
        return true;
      }

      const conflictSnapshot = result.snapshot ?? await fetchHomeSnapshot();
      const touched = touchedConflictMessages(state.baseSnapshot, conflictSnapshot, state.operations);
      const replayed = replay(conflictSnapshot, state.operations);
      useHomeStore.getState().ingestSnapshot(conflictSnapshot);
      useHomeStore.getState().previewSnapshot(replayed.snapshot);
      set({
        baseSnapshot: conflictSnapshot,
        draftSnapshot: replayed.snapshot,
        operations: replayed.operations,
        undoStack: [],
        redoStack: [],
        issues: validationFor(replayed.snapshot, state.simulateFrozen),
        conflictMessages: [...touched, ...replayed.failures],
        pendingRequestId: null,
        saving: false,
        message: result.code === 'catalog_version_mismatch'
          ? 'The catalog changed. Reopen Studio after this app updates.'
          : 'The latest home was fetched and your commands were replayed. Review before saving.',
      });
      await persistDraft({ baseSnapshot: conflictSnapshot, operations: replayed.operations, pendingRequestId: null, mode: state.mode });
      return false;
    } catch (error) {
      set({
        saving: false,
        message: `Draft kept offline. ${error instanceof Error ? error.message : 'Save needs a current server revision.'}`,
      });
      return false;
    }
  },

  keepLocalResolution: () => set({
    conflictMessages: [],
    message: 'Your replayed placement will be kept on the next Save.',
  }),

  usePartnerVersion: async () => {
    const latest = cloneHomeSnapshot(useHomeStore.getState().snapshot);
    useHomeStore.getState().previewSnapshot(latest);
    set({
      baseSnapshot: latest,
      draftSnapshot: latest,
      operations: [],
      undoStack: [],
      redoStack: [],
      issues: validationFor(latest, get().simulateFrozen),
      conflictMessages: [],
      pendingRequestId: null,
      message: 'Partner version loaded.',
    });
    await persistDraft({ baseSnapshot: latest, operations: [], pendingRequestId: null, mode: get().mode });
  },

  resetToFoundation: () => {
    const state = get();
    if (!state.draftSnapshot) return;
    let reset = cloneHomeSnapshot(state.draftSnapshot);
    const resetOperations: HomeOperation[] = [];
    for (const object of reset.objects.filter((candidate) => !candidate.parentObjectId)) {
      const operation: HomeOperation = { type: 'store', objectId: object.id };
      reset = applyHomeOperation(reset, operation);
      resetOperations.push(operation);
    }
    const bedroom = reset.rooms.find((candidate) => candidate.moduleId === 'bedroom');
    const living = reset.rooms.find((candidate) => candidate.moduleId === 'living');
    for (const template of LEGACY_COTTAGE_V2_SNAPSHOT.objects) {
      const templateRoom = LEGACY_COTTAGE_V2_SNAPSHOT.rooms.find((room) => room.id === template.roomId);
      const definition = HOME_ASSET_REGISTRY.get(template.assetId);
      if (!definition) continue;
      if (template.assetId === 'koi-pond-medium' && reset.gardenTier === 'courtyard') continue;
      if (definition.progression.large_tree === true
        && !['large', 'grand'].includes(reset.gardenTier)) continue;
      const room = template.assetId === 'romantic-daybed' && !bedroom
        ? living
        : reset.rooms.find((candidate) => candidate.moduleId === templateRoom?.moduleId);
      if (!room) continue;
      const preferredPosition: [number, number, number] = template.assetId === 'romantic-daybed' && !bedroom
        ? [2.75, 0, -1.6]
        : template.position;
      const preferredRotation = template.assetId === 'romantic-daybed' && !bedroom
        ? 1 as const
        : template.rotation;
      const objectId = createHomeObjectId();
      let operation: HomeOperation = {
        type: 'add',
        objectId,
        roomId: room.id,
        assetId: template.assetId,
        surface: room.moduleId === 'garden' ? 'terrain' : 'floor',
        position: preferredPosition,
        rotation: preferredRotation,
        style: template.style,
      };
      let candidate = applyHomeOperation(reset, operation);
      if (validateHomeDraft(candidate).some((problem) => problem.objectIds.includes(objectId))) {
        const open = findOpenPlacement(reset, template.assetId, room.id);
        if (!open) continue;
        operation = { ...operation, surface: open.surface, position: open.position };
        candidate = applyHomeOperation(reset, operation);
      }
      reset = candidate;
      resetOperations.push(operation);
    }
    const operations = [...state.operations, ...resetOperations];
    useHomeStore.getState().previewSnapshot(reset);
    set({
      draftSnapshot: reset,
      operations,
      undoStack: [...state.undoStack, { snapshot: state.draftSnapshot, operations: state.operations }],
      redoStack: [],
      selectedObjectId: null,
      issues: validationFor(reset, state.simulateFrozen),
      message: 'Foundation layout restored in this draft.',
    });
    void persistDraft({ baseSnapshot: state.baseSnapshot, operations, pendingRequestId: null, mode: state.mode });
  },

  setSimulateFrozen: (simulateFrozen) => {
    const draft = get().draftSnapshot;
    set({
      simulateFrozen,
      issues: draft ? validationFor(draft, simulateFrozen) : [],
      message: simulateFrozen ? 'Frozen-world simulation enabled.' : 'Frozen-world simulation disabled.',
    });
  },
  setPlacementGhost: (placementGhost) => set({ placementGhost }),
  setMessage: (message) => set({ message }),
}));
