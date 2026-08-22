import type {
  HomeObjectSnapshot,
  HomeReservedRouteSnapshot,
  HomeRoomSnapshot,
  HomeSnapshot,
  ResolvedWalkableZone,
  WorldCapabilities,
} from './types';
import { HOME_CATALOG_VERSION } from './catalog';

export const COTTAGE_V2_LAYOUT_ID = 'cottage-v2' as const;

export const COTTAGE_V2_ROOM_MASKS = {
  living: {
    compact: { minX: -4.75, maxX: 4.25, minZ: -4.5, maxZ: 3.75 },
    standard: { minX: -4.75, maxX: 5.25, minZ: -4.5, maxZ: 4.25 },
    large: { minX: -5.75, maxX: 6.25, minZ: -5.5, maxZ: 5.25 },
  },
  bedroom: {
    compact: { minX: 2.25, maxX: 6.5, minZ: -9.25, maxZ: -4.25 },
    standard: { minX: 1.75, maxX: 7, minZ: -9.75, maxZ: -4.25 },
    large: { minX: 1.25, maxX: 7.75, minZ: -10.75, maxZ: -4.25 },
  },
  'future-room': {
    compact: { minX: 5, maxX: 9, minZ: -1.5, maxZ: 2.5 },
    standard: { minX: 5, maxX: 10, minZ: -2.5, maxZ: 3.5 },
    large: { minX: 5, maxX: 11, minZ: -3.5, maxZ: 4.5 },
  },
} as const;

export const COTTAGE_V2_GARDEN_MASKS = {
  courtyard: { sizeTier: 'compact', bounds: { minX: -8.75, maxX: -4, minZ: 0, maxZ: 5 } },
  standard: { sizeTier: 'standard', bounds: { minX: -11.75, maxX: -4, minZ: -2, maxZ: 6 } },
  large: { sizeTier: 'large', bounds: { minX: -15.75, maxX: -4, minZ: -3.75, maxZ: 7.75 } },
  grand: { sizeTier: 'large', bounds: { minX: -18.75, maxX: -4, minZ: -5.75, maxZ: 9.75 } },
} as const;

export const COTTAGE_V2_ROOMS: readonly HomeRoomSnapshot[] = [
  { id: 'fallback-room-living', moduleId: 'living', socketId: 'hub', sizeTier: 'standard', bounds: { minX: -4.75, maxX: 5.25, minZ: -4.5, maxZ: 4.25 }, finish: {} },
  { id: 'fallback-room-bedroom', moduleId: 'bedroom', socketId: 'bedroom-north', sizeTier: 'standard', bounds: { minX: 1.75, maxX: 7, minZ: -9.75, maxZ: -4.25 }, finish: {} },
  { id: 'fallback-room-garden', moduleId: 'garden', socketId: 'garden-west', sizeTier: 'large', bounds: { minX: -15.75, maxX: -4, minZ: -3.75, maxZ: 7.75 }, finish: {} },
];

export const COTTAGE_V2_CAMERA_STOPS = {
  garden: { id: 'garden', x: -10, z: 2 },
  living: { id: 'living', x: 0, z: 0 },
  bedroom: { id: 'bedroom', x: 4.5, z: -6.5 },
} as const;

export const COTTAGE_V2_WALKABLE_ZONES: readonly ResolvedWalkableZone[] = [
  { id: 'living-floor', roomId: 'fallback-room-living', minX: -4.05, maxX: 5.05, minZ: -4.05, maxZ: 4.05 },
  { id: 'garden-socket', roomId: 'fallback-room-living', minX: -4.65, maxX: -3.95, minZ: 2.75, maxZ: 3.5 },
  { id: 'garden-floor', roomId: 'fallback-room-garden', minX: -15.26, maxX: -4.49, minZ: -3.26, maxZ: 7.26 },
  { id: 'bedroom-socket', roomId: 'fallback-room-living', minX: 2.95, maxX: 4.05, minZ: -4.72, maxZ: -3.95 },
  { id: 'bedroom-floor', roomId: 'fallback-room-bedroom', minX: 2.49, maxX: 6.51, minZ: -8.51, maxZ: -4.49 },
];

export const COTTAGE_V2_RESERVED_ROUTES: readonly HomeReservedRouteSnapshot[] = [
  { id: 'fallback-route-living-garden', roomId: 'fallback-room-living', key: 'living-garden-door', minX: -4.75, maxX: -3.7, minZ: 1.9, maxZ: 2.45 },
  { id: 'fallback-route-living-bedroom', roomId: 'fallback-room-living', key: 'living-bedroom-door', minX: 4.55, maxX: 5.05, minZ: -4.5, maxZ: 2.45 },
  { id: 'fallback-route-garden-entry', roomId: 'fallback-room-garden', key: 'garden-entry', minX: -7.85, maxX: -4.25, minZ: 2.15, maxZ: 2.85 },
  { id: 'fallback-route-greenhouse-turn', roomId: 'fallback-room-garden', key: 'garden-greenhouse-turn', minX: -8.25, maxX: -7.75, minZ: 0.25, maxZ: 2.5 },
  { id: 'fallback-route-greenhouse', roomId: 'fallback-room-garden', key: 'garden-greenhouse-approach', minX: -13.75, maxX: -8, minZ: -0.1, maxZ: 0.6 },
  { id: 'fallback-route-bench', roomId: 'fallback-room-garden', key: 'garden-bench-approach', minX: -13.1, maxX: -12.5, minZ: 0.25, maxZ: 3.6 },
  { id: 'fallback-route-pond', roomId: 'fallback-room-garden', key: 'garden-pond-approach', minX: -9.3, maxX: -8, minZ: 2.4, maxZ: 3.35 },
];

const fullCapabilities: WorldCapabilities = {
  view: true,
  useCoreSignals: true,
  mutateHistoryMedia: true,
  edit: true,
  expand: true,
  earnUnlocks: true,
  blockedByMoment: false,
  frozen: false,
};

function object(
  id: string,
  roomId: string,
  assetId: string,
  position: [number, number, number],
  rotation: 0 | 1 | 2 | 3 = 0,
  surface: 'floor' | 'terrain' = roomId === 'fallback-room-garden' ? 'terrain' : 'floor',
): HomeObjectSnapshot {
  return {
    id,
    roomId,
    assetId,
    assetRevision: 1,
    placementState: 'placed',
    surface,
    position,
    rotation,
    style: {},
    parentObjectId: null,
    attachmentSocket: null,
  };
}

/**
 * Safe client fallback for the migration window. It exactly preserves the
 * expanded 1.0.4 scene until get_home_snapshot is available on the server.
 */
export const LEGACY_COTTAGE_V2_SNAPSHOT: HomeSnapshot = {
  paired: true,
  schemaVersion: 2,
  layoutId: COTTAGE_V2_LAYOUT_ID,
  catalogVersion: HOME_CATALOG_VERSION,
  revision: 0,
  pairedAt: null,
  gardenTier: 'large',
  finishes: {},
  rooms: [...COTTAGE_V2_ROOMS],
  reservedRoutes: [...COTTAGE_V2_RESERVED_ROUTES],
  objects: [
    object('fallback-fireplace', 'fallback-room-living', 'core-fireplace', [-3.2, 0, -3.85]),
    object('fallback-sofa', 'fallback-room-living', 'cottage-sofa', [-0.4, 0, -3.95]),
    object('fallback-table', 'fallback-room-living', 'shared-table', [-0.35, 0, 0.5]),
    object('fallback-rest', 'fallback-room-living', 'rest-nook', [-3.15, 0, 3.2]),
    object('fallback-easel', 'fallback-room-living', 'drawing-easel', [-4.28, 0, 1.08], 1),
    object('fallback-media', 'fallback-room-living', 'daily-media-console', [3.55, 0, 2.95]),
    object('fallback-bookshelf', 'fallback-room-living', 'cottage-bookshelf', [-4.18, 0, -2.35]),
    object('fallback-fern', 'fallback-room-living', 'potted-fern', [4.25, 0, 0.7]),
    object('fallback-bed', 'fallback-room-bedroom', 'romantic-daybed', [3.625, 0, -8.75]),
    object('fallback-bedside', 'fallback-room-bedroom', 'bedside-table', [2.45, 0, -8.5]),
    object('fallback-wardrobe', 'fallback-room-bedroom', 'paneled-wardrobe', [5.7, 0, -8.75]),
    object('fallback-threshold', 'fallback-room-garden', 'garden-threshold', [-4.45, 0, 2.5], 0, 'terrain'),
    object('fallback-pond', 'fallback-room-garden', 'koi-pond-medium', [-9.2, 0, 4.55], 0, 'terrain'),
    object('fallback-tree', 'fallback-room-garden', 'blossom-tree', [-14.5, 0, -2.7], 0, 'terrain'),
    object('fallback-rose-west', 'fallback-room-garden', 'rose-bush', [-14.7, 0, 5.2], 0, 'terrain'),
    object('fallback-rose-east', 'fallback-room-garden', 'rose-bush', [-5.8, 0, -2.2], 1, 'terrain'),
    object('fallback-lantern-west', 'fallback-room-garden', 'garden-lantern', [-10.7, 0, 1.7], 0, 'terrain'),
    object('fallback-lantern-east', 'fallback-room-garden', 'garden-lantern', [-7, 0, 1.8], 0, 'terrain'),
    object('fallback-bench', 'fallback-room-garden', 'garden-bench', [-12.8, 0, 3.6], 0, 'terrain'),
    object('fallback-greenhouse', 'fallback-room-garden', 'greenhouse-portal', [-13.75, 0, 0.25], 0, 'terrain'),
  ],
  keepsakes: [],
  unlocks: [],
  capabilities: fullCapabilities,
};
