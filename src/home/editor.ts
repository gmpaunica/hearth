import { HOME_ASSET_REGISTRY } from './catalog';
import type {
  HomeBounds,
  HomeObjectSnapshot,
  HomeOperation,
  HomeRoomSnapshot,
  HomeSnapshot,
  HomeSurface,
} from './types';

export interface HomeValidationIssue {
  code: string;
  message: string;
  objectIds: string[];
  blocking: true;
}

const REQUIRED_ROLES = [
  'fireplace', 'conversation_seating', 'shared_table', 'rest_location',
  'romantic_rest_location', 'drawing_portal', 'media_portal', 'garden_portal',
] as const;

export const HOME_SCENE_BUDGET = 480;
export const HOME_GRID = 0.25;

export function cloneHomeSnapshot(snapshot: HomeSnapshot): HomeSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as HomeSnapshot;
}

export function createHomeObjectId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function snapHomeCoordinate(value: number) {
  return Math.round(value / HOME_GRID) * HOME_GRID;
}

function descendants(snapshot: HomeSnapshot, objectId: string) {
  const ids = new Set([objectId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of snapshot.objects) {
      if (object.parentObjectId && ids.has(object.parentObjectId) && !ids.has(object.id)) {
        ids.add(object.id);
        changed = true;
      }
    }
  }
  return ids;
}

function objectSize(object: HomeObjectSnapshot) {
  const definition = HOME_ASSET_REGISTRY.get(object.assetId);
  if (!definition) return { width: 0.75, depth: 0.75 };
  const swapped = object.rotation % 2 === 1;
  return {
    width: swapped ? definition.footprint.depth : definition.footprint.width,
    depth: swapped ? definition.footprint.width : definition.footprint.depth,
  };
}

function objectBounds(object: HomeObjectSnapshot): HomeBounds {
  const { width, depth } = objectSize(object);
  return {
    minX: object.position[0] - width / 2,
    maxX: object.position[0] + width / 2,
    minZ: object.position[2] - depth / 2,
    maxZ: object.position[2] + depth / 2,
  };
}

function overlaps(a: HomeBounds, b: HomeBounds, clearance = 0) {
  return a.maxX + clearance > b.minX
    && a.minX - clearance < b.maxX
    && a.maxZ + clearance > b.minZ
    && a.minZ - clearance < b.maxZ;
}

function inside(inner: HomeBounds, outer: HomeBounds) {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX
    && inner.minZ >= outer.minZ && inner.maxZ <= outer.maxZ;
}

function roomFor(snapshot: HomeSnapshot, roomId: string | null) {
  return snapshot.rooms.find((room) => room.id === roomId);
}

function requireObject(snapshot: HomeSnapshot, id: string) {
  const object = snapshot.objects.find((candidate) => candidate.id === id);
  if (!object) throw new Error('That object is no longer part of this home.');
  return object;
}

/** Apply one command without mutating the authoritative or prior draft snapshot. */
export function applyHomeOperation(snapshot: HomeSnapshot, operation: HomeOperation): HomeSnapshot {
  const next = cloneHomeSnapshot(snapshot);
  switch (operation.type) {
    case 'add': {
      const definition = HOME_ASSET_REGISTRY.get(operation.assetId);
      if (!definition) throw new Error('That catalog piece is unavailable.');
      if (!roomFor(next, operation.roomId)) throw new Error('Choose an available room first.');
      next.objects.push({
        id: operation.objectId,
        roomId: operation.roomId,
        assetId: operation.assetId,
        assetRevision: definition.revision,
        placementState: 'placed',
        surface: operation.surface,
        position: operation.position,
        rotation: operation.rotation,
        style: operation.style ?? {},
        parentObjectId: operation.parentObjectId ?? null,
        attachmentSocket: operation.attachmentSocket ?? null,
      });
      break;
    }
    case 'move': {
      const object = requireObject(next, operation.objectId);
      const delta = operation.position.map((value, index) => value - object.position[index]) as [number, number, number];
      const family = descendants(next, object.id);
      for (const member of next.objects.filter((candidate) => family.has(candidate.id))) {
        member.position = member.id === object.id
          ? operation.position
          : member.position.map((value, index) => value + delta[index]) as [number, number, number];
        member.roomId = operation.roomId;
        member.placementState = 'placed';
        if (member.id === object.id) {
          member.surface = operation.surface;
          if (operation.parentObjectId !== undefined) member.parentObjectId = operation.parentObjectId;
          if (operation.attachmentSocket !== undefined) member.attachmentSocket = operation.attachmentSocket;
        }
      }
      break;
    }
    case 'rotate':
      requireObject(next, operation.objectId).rotation = operation.rotation;
      break;
    case 'restyle': {
      const object = requireObject(next, operation.objectId);
      object.style = { ...object.style, ...operation.style };
      break;
    }
    case 'attach': {
      const object = requireObject(next, operation.objectId);
      requireObject(next, operation.parentObjectId);
      object.parentObjectId = operation.parentObjectId;
      object.attachmentSocket = operation.socket;
      break;
    }
    case 'store': {
      const family = descendants(next, operation.objectId);
      if (!family.size) throw new Error('That object is no longer part of this home.');
      for (const object of next.objects.filter((candidate) => family.has(candidate.id))) {
        object.placementState = 'stored';
        object.roomId = null;
      }
      break;
    }
    case 'replace': {
      const object = requireObject(next, operation.objectId);
      const replacement = HOME_ASSET_REGISTRY.get(operation.assetId);
      if (!replacement) throw new Error('That replacement is unavailable.');
      object.assetId = replacement.id;
      object.assetRevision = replacement.revision;
      object.style = operation.style ?? {};
      break;
    }
    case 'resize': {
      const room = roomFor(next, operation.roomId);
      if (!room) throw new Error('That room is no longer available.');
      room.sizeTier = operation.sizeTier;
      room.bounds = operation.bounds;
      if (room.moduleId === 'garden' && operation.gardenTier) {
        next.gardenTier = operation.gardenTier;
      }
      const needsSpot = new Set<string>();
      for (const root of next.objects.filter((object) =>
        object.roomId === room.id && object.placementState === 'placed' && !object.parentObjectId)) {
        const family = descendants(next, root.id);
        if (next.objects.some((object) => family.has(object.id)
          && !inside(objectBounds(object), room.bounds))) {
          for (const objectId of family) needsSpot.add(objectId);
        }
      }
      for (const object of next.objects) {
        if (needsSpot.has(object.id)) object.placementState = 'needs_spot';
      }
      break;
    }
    case 'change_terrain':
    case 'change_finish':
      next.finishes = { ...next.finishes, [operation.target]: operation.value };
      break;
    case 'attach_module': {
      if (next.rooms.some((room) => room.socketId === operation.socketId)) {
        throw new Error('That cottage socket is already occupied.');
      }
      next.rooms.push({
        id: operation.roomId,
        moduleId: operation.moduleId,
        socketId: operation.socketId,
        sizeTier: operation.sizeTier,
        bounds: operation.bounds,
        finish: {},
      });
      break;
    }
  }
  return next;
}

function issue(code: string, message: string, objectIds: string[] = []): HomeValidationIssue {
  return { code, message, objectIds, blocking: true };
}

export function validateHomeDraft(snapshot: HomeSnapshot): HomeValidationIssue[] {
  const issues: HomeValidationIssue[] = [];
  const placed = snapshot.objects.filter((object) => object.placementState === 'placed');

  for (const object of placed) {
    const definition = HOME_ASSET_REGISTRY.get(object.assetId);
    const room = roomFor(snapshot, object.roomId);
    if (!definition) {
      issues.push(issue('unknown_asset', `${object.assetId} needs a new spot or migration.`, [object.id]));
      continue;
    }
    if (!room || !definition.compatibleRooms.includes(room.moduleId)) {
      issues.push(issue('room_incompatible', `${definition.id} does not fit this room.`, [object.id]));
    }
    if (!definition.compatibleSurfaces.includes(object.surface)) {
      issues.push(issue('surface_incompatible', `${definition.id} needs a compatible surface.`, [object.id]));
    }
    if (!definition.rotations.includes(object.rotation)) {
      issues.push(issue('rotation_incompatible', `${definition.id} cannot use that rotation.`, [object.id]));
    }
    if (room && !inside(objectBounds(object), room.bounds)) {
      issues.push(issue('outside_bounds', `${definition.id} is outside the ${room.moduleId} mask.`, [object.id]));
    }
  }

  for (let firstIndex = 0; firstIndex < placed.length; firstIndex += 1) {
    const first = placed[firstIndex];
    if (first.parentObjectId) continue;
    const firstDefinition = HOME_ASSET_REGISTRY.get(first.assetId);
    if (!firstDefinition) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < placed.length; secondIndex += 1) {
      const second = placed[secondIndex];
      if (second.parentObjectId || second.roomId !== first.roomId) continue;
      const secondDefinition = HOME_ASSET_REGISTRY.get(second.assetId);
      if (!secondDefinition) continue;
      const firstWalkable = firstDefinition.progression.walkable === true;
      const secondWalkable = secondDefinition.progression.walkable === true;
      if (firstWalkable !== secondWalkable) continue;
      if ((first.surface === 'wall') !== (second.surface === 'wall')) continue;
      const clearance = Math.max(firstDefinition.collisionClearance, secondDefinition.collisionClearance);
      if (overlaps(objectBounds(first), objectBounds(second), clearance)) {
        issues.push(issue('collision', `${firstDefinition.id} overlaps ${secondDefinition.id}.`, [first.id, second.id]));
      }
    }
  }

  for (const object of placed) {
    const definition = HOME_ASSET_REGISTRY.get(object.assetId);
    if (!definition || definition.routeEndpoint || object.parentObjectId || object.surface === 'wall'
      || definition.progression.walkable === true) continue;
    for (const route of snapshot.reservedRoutes.filter((candidate) => candidate.roomId === object.roomId)) {
      if (overlaps(objectBounds(object), route)) {
        issues.push(issue('route_blocked', `${definition.id} blocks ${route.key}.`, [object.id]));
      }
    }
  }

  const gardenPaths = placed.filter((object) =>
    HOME_ASSET_REGISTRY.get(object.assetId)?.progression.path_connector === true);
  if (gardenPaths.length) {
    const gardenRoom = snapshot.rooms.find((candidate) => candidate.moduleId === 'garden');
    const entry = gardenRoom ? gardenPaths.filter((path) =>
      objectBounds(path).maxX >= gardenRoom.bounds.maxX - 0.35) : [];
    const connected = new Set(entry.map((path) => path.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const path of gardenPaths) {
        if (connected.has(path.id)) continue;
        const bounds = objectBounds(path);
        if (gardenPaths.some((candidate) => connected.has(candidate.id)
          && overlaps(bounds, objectBounds(candidate), 0.4))) {
          connected.add(path.id);
          changed = true;
        }
      }
    }
    const disconnected = gardenPaths.filter((path) => !connected.has(path.id));
    if (disconnected.length) {
      issues.push(issue(
        'path_disconnected',
        'Garden paths must form one route from the house threshold.',
        disconnected.map((path) => path.id),
      ));
    }
  }

  for (const tree of placed.filter((object) =>
    HOME_ASSET_REGISTRY.get(object.assetId)?.progression.large_tree === true)) {
    const definition = HOME_ASSET_REGISTRY.get(tree.assetId);
    const canopy = definition?.footprint.canopy;
    if (!canopy) continue;
    const canopyBounds = {
      minX: tree.position[0] - canopy / 2,
      maxX: tree.position[0] + canopy / 2,
      minZ: tree.position[2] - canopy / 2,
      maxZ: tree.position[2] + canopy / 2,
    };
    const hiddenRoutes = snapshot.reservedRoutes.filter((route) =>
      route.roomId === tree.roomId && overlaps(canopyBounds, route));
    if (hiddenRoutes.length) {
      issues.push(issue(
        'canopy_occlusion',
        `${definition.id} hides a protected garden sightline.`,
        [tree.id],
      ));
    }
  }

  for (const role of REQUIRED_ROLES) {
    if (!placed.some((object) => HOME_ASSET_REGISTRY.get(object.assetId)?.functional.role === role)) {
      issues.push(issue('required_role', `The home still needs a ${role.replaceAll('_', ' ')}.`));
    }
  }

  for (const object of snapshot.objects.filter((candidate) => candidate.parentObjectId)) {
    const parent = snapshot.objects.find((candidate) => candidate.id === object.parentObjectId);
    const parentDefinition = parent && HOME_ASSET_REGISTRY.get(parent.assetId);
    if (!parent || !object.attachmentSocket
      || !parentDefinition?.attachmentSockets.includes(object.attachmentSocket)) {
      issues.push(issue('attachment_invalid', `${object.assetId} has an invalid attachment.`, [object.id]));
      continue;
    }
    if (object.placementState !== parent.placementState
      || (object.placementState === 'placed' && object.roomId !== parent.roomId)) {
      issues.push(issue('attachment_placement', `${object.assetId} must stay with its parent.`, [object.id, parent.id]));
    }
    const family = descendants(snapshot, object.id);
    if (family.has(parent.id)) issues.push(issue('attachment_cycle', 'Attachments cannot form a loop.', [object.id, parent.id]));
    const siblings = snapshot.objects.filter((candidate) => candidate.id !== object.id
      && candidate.parentObjectId === parent.id
      && candidate.attachmentSocket === object.attachmentSocket);
    if (siblings.length) issues.push(issue('attachment_occupied', `${object.attachmentSocket} is already occupied.`, [object.id, ...siblings.map((sibling) => sibling.id)]));
  }

  const renderCost = placed.reduce(
    (total, object) => total + (HOME_ASSET_REGISTRY.get(object.assetId)?.renderCost ?? 2),
    0,
  );
  if (renderCost > HOME_SCENE_BUDGET) {
    issues.push(issue('scene_budget', `Scene cost ${renderCost} exceeds ${HOME_SCENE_BUDGET}.`));
  }

  const majorWater = placed.filter((object) => {
    const definition = HOME_ASSET_REGISTRY.get(object.assetId);
    return definition?.category === 'water' && definition.progression.major_water === true;
  });
  const waterLimit = snapshot.gardenTier === 'grand' ? 2
    : snapshot.gardenTier === 'courtyard' ? 0 : 1;
  if (majorWater.length > waterLimit) {
    issues.push(issue('water_limit', `This garden supports ${waterLimit} major water feature${waterLimit === 1 ? '' : 's'}.`, majorWater.map((object) => object.id)));
  }

  return issues;
}

export function surfaceForRoom(assetId: string, room: HomeRoomSnapshot): HomeSurface | null {
  const definition = HOME_ASSET_REGISTRY.get(assetId);
  if (!definition || !definition.compatibleRooms.includes(room.moduleId)) return null;
  if (room.moduleId === 'garden' && definition.compatibleSurfaces.includes('terrain')) return 'terrain';
  return definition.compatibleSurfaces[0] ?? null;
}

export function findOpenPlacement(
  snapshot: HomeSnapshot,
  assetId: string,
  roomId: string,
): { position: [number, number, number]; surface: HomeSurface; parentObjectId?: string; attachmentSocket?: string } | null {
  const room = roomFor(snapshot, roomId);
  const definition = HOME_ASSET_REGISTRY.get(assetId);
  if (!room || !definition) return null;
  const surface = surfaceForRoom(assetId, room);
  if (!surface) return null;
  const temporaryId = '__placement_candidate__';

  if (['shelf', 'table', 'mantel', 'bed'].includes(surface)) {
    const socketMatches = (socket: string) => surface === 'shelf' ? socket.includes('shelf')
      : surface === 'mantel' ? socket.includes('mantel')
        : surface === 'bed' ? socket.includes('bed')
          : socket.includes('table') || socket.endsWith('top');
    for (const parent of snapshot.objects.filter((object) =>
      object.roomId === roomId && object.placementState === 'placed' && !object.parentObjectId)) {
      const parentDefinition = HOME_ASSET_REGISTRY.get(parent.assetId);
      if (!parentDefinition) continue;
      const sockets = parentDefinition.attachmentSockets.filter(socketMatches);
      for (let index = 0; index < sockets.length; index += 1) {
        const socket = sockets[index];
        const occupied = snapshot.objects.some((object) =>
          object.parentObjectId === parent.id && object.attachmentSocket === socket);
        if (occupied) continue;
        const localX = (index - (sockets.length - 1) / 2) * 0.42;
        const angle = parent.rotation * Math.PI / 2;
        const position: [number, number, number] = [
          snapHomeCoordinate(parent.position[0] + localX * Math.cos(angle)),
          surface === 'shelf'
            ? Math.min(1.45, 0.45 + index * 0.42)
            : surface === 'mantel' ? 1.85
              : surface === 'bed' ? 0.72
                : Math.max(0.55, Math.min(1.15, parentDefinition.footprint.height)),
          snapHomeCoordinate(parent.position[2] - localX * Math.sin(angle)),
        ];
        const candidate = applyHomeOperation(snapshot, {
          type: 'add', objectId: temporaryId, roomId, assetId, surface, position,
          rotation: parent.rotation, parentObjectId: parent.id, attachmentSocket: socket,
        });
        const invalid = validateHomeDraft(candidate).some((problem) => problem.objectIds.includes(temporaryId));
        if (!invalid) return { position, surface, parentObjectId: parent.id, attachmentSocket: socket };
      }
    }
    return null;
  }

  if (surface === 'wall') {
    const z = snapHomeCoordinate(room.bounds.minZ + definition.footprint.depth / 2 + 0.05);
    for (let x = room.bounds.minX + definition.footprint.width / 2;
      x <= room.bounds.maxX - definition.footprint.width / 2; x += HOME_GRID) {
      const position: [number, number, number] = [snapHomeCoordinate(x), 0.5, z];
      const candidate = applyHomeOperation(snapshot, {
        type: 'add', objectId: temporaryId, roomId, assetId, surface, position, rotation: 0,
      });
      const invalid = validateHomeDraft(candidate).some((problem) => problem.objectIds.includes(temporaryId));
      if (!invalid) return { position, surface };
    }
    return null;
  }

  for (let z = room.bounds.minZ + 0.5; z <= room.bounds.maxZ - 0.5; z += HOME_GRID) {
    for (let x = room.bounds.minX + 0.5; x <= room.bounds.maxX - 0.5; x += HOME_GRID) {
      const position: [number, number, number] = [snapHomeCoordinate(x), 0, snapHomeCoordinate(z)];
      const candidate = applyHomeOperation(snapshot, {
        type: 'add', objectId: temporaryId, roomId, assetId, surface, position, rotation: 0,
      });
      const invalid = validateHomeDraft(candidate).some((problem) => problem.objectIds.includes(temporaryId));
      if (!invalid) return { position, surface };
    }
  }
  return null;
}
