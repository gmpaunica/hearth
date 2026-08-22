export type HomeRotation = 0 | 1 | 2 | 3;
export type HomeRoomKind = 'living' | 'bedroom' | 'garden' | 'future-room';
export type HomeRoomSize = 'compact' | 'standard' | 'large';
export type GardenTier = 'courtyard' | 'standard' | 'large' | 'grand';
export type HomeSurface =
  | 'floor'
  | 'wall'
  | 'shelf'
  | 'table'
  | 'mantel'
  | 'bed'
  | 'terrain'
  | 'border'
  | 'path'
  | 'water-feature';
export type HomePlacementState = 'placed' | 'stored' | 'needs_spot';

export type HomeFunctionalRole =
  | 'fireplace'
  | 'conversation_seating'
  | 'shared_table'
  | 'rest_location'
  | 'romantic_rest_location'
  | 'drawing_portal'
  | 'media_portal'
  | 'garden_portal'
  | 'greenhouse_portal';

export interface HomeFootprint {
  width: number;
  depth: number;
  height: number;
  canopy?: number;
}

export interface HomeInteractionDefinition {
  role?: HomeFunctionalRole;
  signals?: string[];
  poses?: string[];
  approach?: [number, number][];
  exit?: [number, number][];
  cameraTarget?: [number, number, number];
  reactionAnchor?: [number, number, number];
  uiAnchor?: [number, number, number];
  clickBounds?: HomeFootprint;
  effectSockets?: string[];
  route?: string;
  interactionRig?: string;
  coupleRig?: HomeCoupleRig;
}

export interface HomeRigPose {
  /** Local ground-plane coordinates relative to the persisted object anchor. */
  x: number;
  z: number;
  rotY: number;
  seatY: number;
  approach?: { x: number; z: number };
  egress?: { x: number; z: number; rotY: number };
}

export interface HomeCoupleRig {
  a: HomeRigPose;
  b: HomeRigPose;
}

export interface HomeAssetDefinition {
  id: string;
  revision: number;
  catalogVersion: string;
  category: string;
  renderer: string;
  footprint: HomeFootprint;
  rotations: readonly HomeRotation[];
  compatibleRooms: readonly HomeRoomKind[];
  compatibleSurfaces: readonly HomeSurface[];
  collisionClearance: number;
  paletteSlots: readonly string[];
  attachmentSockets: readonly string[];
  renderCost: number;
  progression: Readonly<Record<string, string | number | boolean>>;
  functional: HomeInteractionDefinition;
  routeEndpoint?: boolean;
  /** Renderer-origin correction; persisted positions stay renderer-independent. */
  renderOffset?: readonly [number, number, number];
  /** Optional authored bounds for asymmetric voxel models. */
  collisionBounds?: Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
}

export interface HomeBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface HomeRoomSnapshot {
  id: string;
  moduleId: HomeRoomKind;
  socketId: string;
  sizeTier: HomeRoomSize;
  bounds: HomeBounds;
  finish: Record<string, unknown>;
}

export interface HomeReservedRouteSnapshot extends HomeBounds {
  id: string;
  roomId: string;
  key: string;
}

export interface HomeObjectSnapshot {
  id: string;
  roomId: string | null;
  assetId: string;
  assetRevision: number;
  placementState: HomePlacementState;
  surface: HomeSurface;
  position: [number, number, number];
  rotation: HomeRotation;
  style: Record<string, unknown>;
  parentObjectId: string | null;
  attachmentSocket: string | null;
  renderer?: string;
  retired?: boolean;
  unknown?: boolean;
}

export interface HomeKeepsakeSnapshot {
  id: string;
  sourceKind: string;
  sourceId: string;
  assetId: string;
  objectId: string | null;
  metadata: Record<string, unknown>;
  mintedAt: string;
}

export interface HomeUnlockSnapshot {
  id: string;
  source: string;
  unlockedAt: string;
}

export interface WorldCapabilities {
  view: boolean;
  useCoreSignals: boolean;
  mutateHistoryMedia: boolean;
  edit: boolean;
  expand: boolean;
  earnUnlocks: boolean;
  blockedByMoment: boolean;
  frozen: boolean;
}

export interface HomeSnapshot {
  paired: boolean;
  schemaVersion: number;
  layoutId: 'cottage-v2';
  catalogVersion: string;
  revision: number;
  pairedAt: string | null;
  gardenTier: GardenTier;
  finishes: Record<string, unknown>;
  rooms: HomeRoomSnapshot[];
  reservedRoutes: HomeReservedRouteSnapshot[];
  objects: HomeObjectSnapshot[];
  keepsakes: HomeKeepsakeSnapshot[];
  unlocks: HomeUnlockSnapshot[];
  capabilities: WorldCapabilities;
}

export type HomeOperation =
  | { type: 'add'; objectId: string; roomId: string; assetId: string; surface: HomeSurface; position: [number, number, number]; rotation: HomeRotation; style?: Record<string, unknown>; parentObjectId?: string; attachmentSocket?: string }
  | { type: 'move'; objectId: string; roomId: string; surface: HomeSurface; position: [number, number, number]; parentObjectId?: string | null; attachmentSocket?: string | null }
  | { type: 'rotate'; objectId: string; rotation: HomeRotation }
  | { type: 'restyle'; objectId: string; style: Record<string, unknown> }
  | { type: 'attach'; objectId: string; parentObjectId: string; socket: string }
  | { type: 'store'; objectId: string }
  | { type: 'replace'; objectId: string; assetId: string; style?: Record<string, unknown> }
  | { type: 'resize'; roomId: string; sizeTier: HomeRoomSize; bounds: HomeBounds; gardenTier?: GardenTier }
  | { type: 'change_terrain'; target: string; value: unknown }
  | { type: 'change_finish'; target: string; value: unknown }
  | { type: 'attach_module'; roomId: string; moduleId: 'bedroom' | 'future-room'; socketId: 'bedroom-north' | 'future-east'; sizeTier: HomeRoomSize; bounds: HomeBounds };

export interface HomeApplySuccess {
  ok: true;
  revision: number;
  snapshot: HomeSnapshot;
}

export interface HomeApplyConflict {
  ok: false;
  code: 'revision_conflict' | 'catalog_version_mismatch';
  currentRevision: number;
  catalogVersion?: string;
  snapshot?: HomeSnapshot;
}

export type HomeApplyResult = HomeApplySuccess | HomeApplyConflict;

export interface ResolvedSceneCollider extends HomeBounds {
  id: string;
  objectId: string;
}

export interface ResolvedWalkableZone extends HomeBounds {
  id: string;
  roomId: string;
}

export interface ResolvedRoom {
  id: string;
  moduleId: HomeRoomKind;
  socketId: string;
  sizeTier: HomeRoomSize;
  bounds: HomeBounds;
  cameraStop: { id: 'living' | 'bedroom' | 'garden'; x: number; z: number } | null;
}

export interface ResolvedHomeObject extends HomeObjectSnapshot {
  definition: HomeAssetDefinition;
  renderPosition: [number, number, number];
  rotationY: number;
  placeholder: boolean;
}

export interface ResolvedHomeScene {
  snapshotRevision: number;
  layoutId: 'cottage-v2';
  catalogVersion: string;
  gardenTier: GardenTier;
  rooms: ResolvedRoom[];
  objects: ResolvedHomeObject[];
  colliders: ResolvedSceneCollider[];
  walkableZones: ResolvedWalkableZone[];
  reservedRoutes: HomeReservedRouteSnapshot[];
  roles: Partial<Record<HomeFunctionalRole, ResolvedHomeObject>>;
  cameraStops: Partial<Record<'living' | 'bedroom' | 'garden', { id: 'living' | 'bedroom' | 'garden'; x: number; z: number }>>;
  overlayAnchors: Record<string, [number, number, number]>;
  interactionSpots: Record<string, HomeCoupleRig>;
  capabilities: WorldCapabilities;
  diagnostics: string[];
}
