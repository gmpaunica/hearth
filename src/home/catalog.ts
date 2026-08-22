import type { HomeAssetDefinition, HomeCoupleRig } from './types';

export const HOME_CATALOG_VERSION = 'home-catalog-v2';

const allRotations = [0, 1, 2, 3] as const;

const FOUNDATION_COUPLE_RIGS: Readonly<Record<string, HomeCoupleRig>> = {
  'core-fireplace': {
    a: { x: 0.65, z: 1.5, rotY: Math.PI - 0.45, seatY: 0.1, approach: { x: 0.65, z: 1.9 }, egress: { x: 0.65, z: 1.9, rotY: 0 } },
    b: { x: 1.65, z: 1.5, rotY: Math.PI + 0.45, seatY: 0.1, approach: { x: 1.65, z: 1.9 }, egress: { x: 1.65, z: 1.9, rotY: 0 } },
  },
  'cottage-sofa': {
    a: { x: 0.65, z: 1.13, rotY: 0, seatY: 0.5, approach: { x: 0.65, z: 1.67 }, egress: { x: 0.65, z: 1.67, rotY: 0 } },
    b: { x: 1.4, z: 1.13, rotY: 0, seatY: 0.5, approach: { x: 1.55, z: 1.67 }, egress: { x: 1.55, z: 1.67, rotY: 0 } },
  },
  'shared-table': {
    a: { x: 0.6, z: 1.7, rotY: Math.PI, seatY: 0.4, approach: { x: 1.55, z: 1.7 }, egress: { x: 1.55, z: 1.7, rotY: Math.PI / 2 } },
    b: { x: 0.6, z: -0.75, rotY: 0, seatY: 0.4, approach: { x: 1.55, z: -0.75 }, egress: { x: 1.55, z: -0.75, rotY: Math.PI / 2 } },
  },
  'rest-nook': {
    a: { x: 0.28, z: 0.32, rotY: Math.PI, seatY: 0.2, approach: { x: 0.28, z: -0.45 }, egress: { x: 0.28, z: -0.45, rotY: 0 } },
    b: { x: 1.12, z: 0.32, rotY: Math.PI, seatY: 0.2, approach: { x: 1.12, z: -0.45 }, egress: { x: 1.12, z: -0.45, rotY: 0 } },
  },
  'romantic-daybed': {
    a: { x: 0.455, z: 1.55, rotY: 0.28, seatY: 0.75, approach: { x: 0.275, z: 2.7 }, egress: { x: 0.275, z: 2.7, rotY: 0 } },
    b: { x: 1.295, z: 1.55, rotY: -0.28, seatY: 0.75, approach: { x: 1.455, z: 2.7 }, egress: { x: 1.455, z: 2.7, rotY: 0 } },
  },
  'garden-bench': {
    a: { x: 0.4, z: 0.33, rotY: Math.PI / 2, seatY: 0.5, approach: { x: 1.15, z: 0.33 }, egress: { x: 1.15, z: 0.33, rotY: Math.PI / 2 } },
    b: { x: 0.4, z: 1.17, rotY: Math.PI / 2, seatY: 0.5, approach: { x: 1.15, z: 1.17 }, egress: { x: 1.15, z: 1.17, rotY: Math.PI / 2 } },
  },
  'garden-threshold': {
    a: { x: -0.75, z: 0.05, rotY: -Math.PI / 2, seatY: 0 },
    b: { x: -0.75, z: 0.65, rotY: -Math.PI / 2, seatY: 0 },
  },
};

function asset(
  definition: Omit<HomeAssetDefinition, 'revision' | 'catalogVersion' | 'rotations'> & {
    rotations?: HomeAssetDefinition['rotations'];
  },
): HomeAssetDefinition {
  return {
    revision: 1,
    catalogVersion: HOME_CATALOG_VERSION,
    rotations: allRotations,
    ...definition,
    functional: {
      ...definition.functional,
      coupleRig: definition.functional.coupleRig ?? FOUNDATION_COUPLE_RIGS[definition.id],
    },
  };
}

interface IndoorAssetOptions {
  rooms?: HomeAssetDefinition['compatibleRooms'];
  surfaces?: HomeAssetDefinition['compatibleSurfaces'];
  sockets?: HomeAssetDefinition['attachmentSockets'];
  day?: number;
  renderCost?: number;
  walkable?: boolean;
}

function indoorAsset(
  id: string,
  category: string,
  footprint: HomeAssetDefinition['footprint'],
  paletteSlots: HomeAssetDefinition['paletteSlots'],
  options: IndoorAssetOptions = {},
) {
  return asset({
    id,
    category,
    renderer: 'IndoorCatalog',
    footprint,
    compatibleRooms: options.rooms ?? ['living', 'bedroom'],
    compatibleSurfaces: options.surfaces ?? ['floor'],
    collisionClearance: options.walkable ? 0 : 0.05,
    paletteSlots,
    attachmentSockets: options.sockets ?? [],
    renderCost: options.renderCost ?? 5,
    progression: { day: options.day ?? 3, ...(options.walkable ? { walkable: true } : {}) },
    functional: {},
  });
}

/** The first complete indoor content pack: 31 new silhouettes plus potted-fern. */
export const INDOOR_HOME_ASSETS = [
  // Storage
  indoorAsset('cottage-wardrobe', 'storage', { width: 1.2, depth: 0.7, height: 2.2 }, ['wood', 'metal'], { day: 21, renderCost: 9 }),
  indoorAsset('paneled-armoire', 'storage', { width: 1.4, depth: 0.75, height: 2.25 }, ['wood', 'metal'], { day: 21, renderCost: 10 }),
  indoorAsset('clothes-rail', 'storage', { width: 1.35, depth: 0.55, height: 1.75 }, ['wood', 'metal', 'fabric'], { day: 21, renderCost: 7 }),
  indoorAsset('low-cubby', 'storage', { width: 1.4, depth: 0.55, height: 0.85 }, ['wood', 'fabric'], { day: 21, sockets: ['shelf-left', 'shelf-right'], renderCost: 7 }),
  indoorAsset('blanket-chest', 'storage', { width: 1.15, depth: 0.65, height: 0.65 }, ['wood', 'fabric', 'metal'], { day: 21, sockets: ['chest-top'], renderCost: 6 }),

  // Seating and small surfaces
  indoorAsset('reading-chair', 'seating', { width: 0.9, depth: 0.9, height: 1.15 }, ['wood', 'fabric'], { renderCost: 7 }),
  indoorAsset('rocking-chair', 'seating', { width: 0.9, depth: 1.05, height: 1.25 }, ['wood', 'fabric'], { renderCost: 8 }),
  indoorAsset('pouf', 'seating', { width: 0.7, depth: 0.7, height: 0.5 }, ['fabric'], { renderCost: 4 }),
  indoorAsset('side-table', 'surface', { width: 0.65, depth: 0.65, height: 0.72 }, ['wood', 'metal', 'stone'], { sockets: ['tabletop'], renderCost: 5 }),
  indoorAsset('narrow-bench', 'seating', { width: 1.35, depth: 0.55, height: 0.78 }, ['wood', 'fabric', 'metal'], { sockets: ['bench-top'], renderCost: 6 }),

  // Keepsakes
  indoorAsset('teddy-bear', 'keepsake', { width: 0.45, depth: 0.4, height: 0.6 }, ['fabric'], { surfaces: ['floor', 'shelf', 'table', 'bed'], renderCost: 4 }),
  indoorAsset('trophy-cup', 'keepsake', { width: 0.3, depth: 0.3, height: 0.5 }, ['metal', 'wood'], { surfaces: ['shelf', 'table', 'mantel'], renderCost: 3 }),
  indoorAsset('rosette', 'keepsake', { width: 0.35, depth: 0.12, height: 0.55 }, ['fabric', 'metal'], { surfaces: ['wall', 'shelf'], renderCost: 3 }),
  indoorAsset('couple-statuette', 'keepsake', { width: 0.4, depth: 0.3, height: 0.65 }, ['stone', 'metal'], { surfaces: ['shelf', 'table', 'mantel'], renderCost: 4 }),
  indoorAsset('animal-figurine', 'keepsake', { width: 0.4, depth: 0.28, height: 0.35 }, ['stone', 'wood'], { surfaces: ['shelf', 'table', 'mantel'], renderCost: 3 }),
  indoorAsset('snow-globe', 'keepsake', { width: 0.38, depth: 0.38, height: 0.5 }, ['glass', 'stone', 'metal'], { surfaces: ['shelf', 'table', 'mantel'], renderCost: 5 }),
  indoorAsset('travel-trunk', 'keepsake', { width: 1.05, depth: 0.65, height: 0.65 }, ['wood', 'fabric', 'metal'], { sockets: ['trunk-top'], renderCost: 6 }),
  indoorAsset('shell-jar', 'keepsake', { width: 0.32, depth: 0.32, height: 0.5 }, ['glass', 'stone'], { surfaces: ['shelf', 'table', 'mantel'], renderCost: 4 }),
  indoorAsset('book-stack', 'keepsake', { width: 0.48, depth: 0.36, height: 0.3 }, ['fabric', 'paper'], { surfaces: ['shelf', 'table', 'mantel', 'bed'], renderCost: 3 }),

  // Wall pieces
  indoorAsset('botanical-print', 'wall', { width: 0.85, depth: 0.12, height: 1.05 }, ['wood', 'foliage', 'paper'], { surfaces: ['wall'], renderCost: 4 }),
  indoorAsset('landscape-print', 'wall', { width: 1.15, depth: 0.12, height: 0.8 }, ['wood', 'wall', 'foliage'], { surfaces: ['wall'], renderCost: 5 }),
  indoorAsset('heart-print', 'wall', { width: 0.7, depth: 0.12, height: 0.85 }, ['wood', 'fabric', 'paper'], { surfaces: ['wall'], renderCost: 4 }),
  indoorAsset('memory-frame', 'wall', { width: 0.65, depth: 0.12, height: 0.75 }, ['wood', 'metal', 'paper'], { surfaces: ['wall'], renderCost: 4 }),
  indoorAsset('tall-mirror', 'wall', { width: 0.7, depth: 0.16, height: 1.75 }, ['wood', 'metal', 'glass'], { surfaces: ['wall'], renderCost: 6 }),

  // Lighting, textiles, and tabletop greenery
  indoorAsset('table-lamp', 'lighting', { width: 0.42, depth: 0.42, height: 0.72 }, ['metal', 'fabric'], { surfaces: ['table', 'shelf'], renderCost: 5 }),
  indoorAsset('floor-lamp', 'lighting', { width: 0.5, depth: 0.5, height: 1.75 }, ['metal', 'fabric', 'wood'], { renderCost: 6 }),
  indoorAsset('lantern', 'lighting', { width: 0.42, depth: 0.42, height: 0.62 }, ['metal', 'glass'], { surfaces: ['floor', 'table', 'shelf'], renderCost: 5 }),
  indoorAsset('round-rug', 'textile', { width: 1.8, depth: 1.8, height: 0.04 }, ['fabric'], { walkable: true, renderCost: 4 }),
  indoorAsset('runner', 'textile', { width: 0.8, depth: 2.3, height: 0.04 }, ['fabric'], { walkable: true, renderCost: 4 }),
  indoorAsset('cushion-basket', 'textile', { width: 0.65, depth: 0.6, height: 0.65 }, ['wood', 'fabric'], { renderCost: 5 }),
  indoorAsset('flower-vase', 'plant', { width: 0.38, depth: 0.38, height: 0.65 }, ['flower', 'foliage', 'stone'], { surfaces: ['table', 'shelf', 'mantel'], renderCost: 5 }),
] as const satisfies readonly HomeAssetDefinition[];

export const HOME_ASSETS = [
  asset({ id: 'core-fireplace', category: 'fireplace', renderer: 'Fireplace', footprint: { width: 2, depth: 1.1, height: 2.8 }, compatibleRooms: ['living'], compatibleSurfaces: ['floor'], collisionClearance: 0.1, paletteSlots: ['wood', 'stone', 'metal'], attachmentSockets: ['mantel-left', 'mantel-center', 'mantel-right'], renderCost: 18, progression: { day: 0, tier: 1 }, functional: { role: 'fireplace', signals: ['fireplace'], poses: ['floor-left', 'floor-right'], approach: [[-2.55, -1.95], [-1.55, -1.95]], exit: [[-2.55, -1.95], [-1.55, -1.95]], cameraTarget: [-2.6, 1.2, -3.6], reactionAnchor: [1, 2.3, 0.6], uiAnchor: [1, 2.9, 0.4], clickBounds: { width: 2.5, depth: 1.5, height: 3 }, effectSockets: ['fire', 'mantel', 'floor-glow'] }, routeEndpoint: true, collisionBounds: { minX: -0.25, maxX: 2.25, minZ: -0.23, maxZ: 1.25 } }),
  asset({ id: 'cottage-sofa', category: 'seating', renderer: 'Sofa', footprint: { width: 2.2, depth: 0.9, height: 1.15 }, compatibleRooms: ['living', 'bedroom'], compatibleSurfaces: ['floor'], collisionClearance: 0.1, paletteSlots: ['wood', 'fabric'], attachmentSockets: ['seat-left', 'seat-right'], renderCost: 10, progression: { day: 0 }, functional: { role: 'conversation_seating', signals: ['sofa'], poses: ['sit-left', 'sit-right'], approach: [[0.65, 1.67], [1.55, 1.67]], exit: [[0.65, 1.67], [1.55, 1.67]], cameraTarget: [1.1, 0.8, 0.6], reactionAnchor: [1.1, 1.8, 0.5], uiAnchor: [1.1, 2.1, 0.5], clickBounds: { width: 2.8, depth: 1.4, height: 1.5 }, effectSockets: ['seat-left', 'seat-right', 'center'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 2.75, minZ: 0, maxZ: 1.25 } }),
  asset({ id: 'shared-table', category: 'surface', renderer: 'TableSet', footprint: { width: 2.1, depth: 1.8, height: 1.1 }, compatibleRooms: ['living', 'garden'], compatibleSurfaces: ['floor'], collisionClearance: 0.15, paletteSlots: ['wood', 'fabric', 'metal'], attachmentSockets: ['table-north', 'table-south', 'table-east', 'table-west'], renderCost: 14, progression: { day: 0 }, functional: { role: 'shared_table', signals: ['table'], poses: ['sit-near', 'sit-far'], approach: [[1.55, 1.7], [1.55, -0.75]], exit: [[1.55, 1.7], [1.55, -0.75]], cameraTarget: [0.6, 0.7, 0.5], reactionAnchor: [0.6, 1.7, 0.5], uiAnchor: [0.6, 2, 0.5], clickBounds: { width: 2.4, depth: 3.2, height: 1.4 }, effectSockets: ['table-center', 'chair-near', 'chair-far'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 1.2, minZ: -1.15, maxZ: 2.15 } }),
  asset({ id: 'rest-nook', category: 'rest', renderer: 'RestNook', footprint: { width: 1.6, depth: 0.9, height: 1.2 }, compatibleRooms: ['living', 'bedroom', 'garden'], compatibleSurfaces: ['floor'], collisionClearance: 0.1, paletteSlots: ['wood', 'fabric'], attachmentSockets: ['cushion'], renderCost: 9, progression: { day: 0 }, functional: { role: 'rest_location', signals: ['rest'], poses: ['rest-left', 'rest-right'], approach: [[0.28, -0.45], [1.12, -0.45]], exit: [[0.28, -0.45], [1.12, -0.45]], cameraTarget: [0.7, 0.7, 0.3], reactionAnchor: [0.7, 1.5, 0.3], uiAnchor: [0.7, 1.9, 0.3], clickBounds: { width: 1.7, depth: 1.1, height: 1.4 }, effectSockets: ['cushion', 'left', 'right'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 1.28, minZ: 0, maxZ: 0.64 } }),
  asset({ id: 'romantic-daybed', category: 'bed', renderer: 'Bed', footprint: { width: 1.3, depth: 1.65, height: 1.3 }, compatibleRooms: ['living', 'bedroom'], compatibleSurfaces: ['floor'], collisionClearance: 0.15, paletteSlots: ['wood', 'fabric'], attachmentSockets: ['bed-left', 'bed-right', 'headboard'], renderCost: 13, progression: { day: 0, fallback: true }, functional: { role: 'romantic_rest_location', signals: ['romantic'], poses: ['lie-left', 'lie-right'], approach: [[0.28, 2.7], [1.46, 2.7]], exit: [[0.28, 2.7], [1.46, 2.7]], cameraTarget: [0.88, 1, 1.1], reactionAnchor: [0.88, 1.9, 1.1], uiAnchor: [0.88, 2.2, 1.1], clickBounds: { width: 1.9, depth: 2.4, height: 1.5 }, effectSockets: ['bed-left', 'bed-right', 'heart'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 1.76, minZ: 0.03, maxZ: 2.25 } }),
  asset({ id: 'drawing-easel', category: 'portal', renderer: 'Easel', footprint: { width: 0.75, depth: 0.75, height: 1.6 }, compatibleRooms: ['living', 'bedroom'], compatibleSurfaces: ['floor'], collisionClearance: 0.05, paletteSlots: ['wood', 'metal'], attachmentSockets: [], renderCost: 8, progression: { day: 0 }, functional: { role: 'drawing_portal', route: '/draw' }, routeEndpoint: true, renderOffset: [0, 1.2, 0], collisionBounds: { minX: -0.02, maxX: 0.24, minZ: -1.32, maxZ: 0 } }),
  asset({ id: 'daily-media-console', category: 'portal', renderer: 'DailyMediaConsole', footprint: { width: 0.65, depth: 0.55, height: 1.1 }, compatibleRooms: ['living', 'bedroom'], compatibleSurfaces: ['floor', 'table', 'shelf'], collisionClearance: 0.05, paletteSlots: ['wood', 'metal', 'fabric'], attachmentSockets: [], renderCost: 6, progression: { day: 0 }, functional: { role: 'media_portal', route: '/daily' }, routeEndpoint: true }),
  asset({ id: 'garden-threshold', category: 'portal', renderer: 'GardenThreshold', footprint: { width: 0.6, depth: 0.4, height: 2.4 }, compatibleRooms: ['living', 'garden'], compatibleSurfaces: ['floor', 'terrain'], collisionClearance: 0, paletteSlots: ['wood', 'foliage', 'flower'], attachmentSockets: [], renderCost: 6, progression: { day: 0 }, functional: { role: 'garden_portal', signals: ['garden'] }, routeEndpoint: true }),
  asset({ id: 'cottage-bookshelf', category: 'storage', renderer: 'Bookshelf', footprint: { width: 0.7, depth: 0.55, height: 1.9 }, compatibleRooms: ['living', 'bedroom'], compatibleSurfaces: ['floor'], collisionClearance: 0.05, paletteSlots: ['wood', 'metal'], attachmentSockets: ['shelf-1', 'shelf-2', 'shelf-3'], renderCost: 8, progression: { day: 14 }, functional: {}, collisionBounds: { minX: 0, maxX: 0.4, minZ: 0, maxZ: 1.2 } }),
  asset({ id: 'potted-fern', category: 'plant', renderer: 'Plant', footprint: { width: 0.55, depth: 0.55, height: 1.2 }, compatibleRooms: ['living', 'bedroom', 'garden'], compatibleSurfaces: ['floor', 'table', 'shelf'], collisionClearance: 0.05, paletteSlots: ['foliage', 'flower', 'stone'], attachmentSockets: [], renderCost: 4, progression: { day: 3 }, functional: {}, collisionBounds: { minX: -0.12, maxX: 0.47, minZ: -0.12, maxZ: 0.47 } }),
  asset({ id: 'bedside-table', category: 'surface', renderer: 'BedsideTable', footprint: { width: 0.75, depth: 0.65, height: 0.9 }, compatibleRooms: ['bedroom', 'living'], compatibleSurfaces: ['floor'], collisionClearance: 0.05, paletteSlots: ['wood', 'metal'], attachmentSockets: ['tabletop'], renderCost: 5, progression: { day: 21 }, functional: {}, collisionBounds: { minX: 0, maxX: 0.73, minZ: 0, maxZ: 0.55 } }),
  asset({ id: 'paneled-wardrobe', category: 'storage', renderer: 'Wardrobe', footprint: { width: 1.25, depth: 0.8, height: 2.35 }, compatibleRooms: ['bedroom', 'living'], compatibleSurfaces: ['floor'], collisionClearance: 0.1, paletteSlots: ['wood', 'metal'], attachmentSockets: [], renderCost: 9, progression: { day: 21 }, functional: {}, collisionBounds: { minX: 0, maxX: 0.8, minZ: 0, maxZ: 0.6 } }),
  asset({ id: 'koi-pond-medium', category: 'water', renderer: 'KoiPond', footprint: { width: 3.6, depth: 2.4, height: 0.45 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.25, paletteSlots: ['stone', 'foliage', 'water'], attachmentSockets: ['pond-edge-north', 'pond-edge-south'], renderCost: 28, progression: { day: 90, major_water: true }, functional: { interactionRig: 'pond-edge', poses: ['edge-left', 'edge-right'], approach: [[0.7, -0.55], [2.8, -0.55]], exit: [[0.7, -0.55], [2.8, -0.55]], cameraTarget: [1.8, 0.4, 1.2], reactionAnchor: [1.8, 1.4, 1.2], uiAnchor: [1.8, 1.8, 1.2], clickBounds: { width: 3.8, depth: 2.6, height: 0.8 }, effectSockets: ['water', 'fish', 'pond-edge-north', 'pond-edge-south'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 3.57, minZ: 0, maxZ: 2.31 } }),
  asset({ id: 'blossom-tree', category: 'tree', renderer: 'BlossomTree', footprint: { width: 1.1, depth: 1.1, height: 4.25, canopy: 4 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.65, paletteSlots: ['wood', 'foliage', 'flower'], attachmentSockets: [], renderCost: 20, progression: { day: 180, large_tree: true }, functional: {}, collisionBounds: { minX: -0.34, maxX: 2.89, minZ: -0.17, maxZ: 1.87 } }),
  asset({ id: 'rose-bush', category: 'plant', renderer: 'RoseBush', footprint: { width: 0.85, depth: 0.75, height: 0.7 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.08, paletteSlots: ['foliage', 'flower'], attachmentSockets: [], renderCost: 4, progression: { day: 30 }, functional: {} }),
  asset({ id: 'garden-lantern', category: 'lighting', renderer: 'GardenLantern', footprint: { width: 0.55, depth: 0.55, height: 1.45 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.05, paletteSlots: ['wood', 'metal'], attachmentSockets: [], renderCost: 5, progression: { day: 30 }, functional: {}, collisionBounds: { minX: 0, maxX: 0.63, minZ: 0, maxZ: 0.63 } }),
  asset({ id: 'garden-bench', category: 'seating', renderer: 'Bench', footprint: { width: 1.7, depth: 0.75, height: 1.1 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.12, paletteSlots: ['wood', 'metal', 'fabric'], attachmentSockets: ['seat-left', 'seat-right'], renderCost: 8, progression: { day: 30 }, functional: { interactionRig: 'garden-couple', poses: ['sit-left', 'sit-right'], approach: [[1.15, 0.33], [1.15, 1.17]], exit: [[1.15, 0.33], [1.15, 1.17]], cameraTarget: [0.4, 0.8, 0.75], reactionAnchor: [0.4, 1.7, 0.75], uiAnchor: [0.4, 2, 0.75], clickBounds: { width: 1, depth: 1.7, height: 1.3 }, effectSockets: ['seat-left', 'seat-right', 'center'] }, routeEndpoint: true, collisionBounds: { minX: 0, maxX: 0.75, minZ: 0, maxZ: 1.5 } }),
  asset({ id: 'greenhouse-portal', category: 'structure', renderer: 'GardenGreenhousePortal', footprint: { width: 1.35, depth: 1.05, height: 1.55 }, compatibleRooms: ['garden'], compatibleSurfaces: ['terrain'], collisionClearance: 0.1, paletteSlots: ['wood', 'metal', 'foliage'], attachmentSockets: [], renderCost: 12, progression: { day: 30 }, functional: { role: 'greenhouse_portal', route: '/greenhouse' }, routeEndpoint: true }),
  ...INDOOR_HOME_ASSETS,
] as const satisfies readonly HomeAssetDefinition[];

export const HOME_ASSET_REGISTRY: ReadonlyMap<string, HomeAssetDefinition> = new Map(
  HOME_ASSETS.map((definition) => [definition.id, definition]),
);

export const UNKNOWN_HOME_ASSET: HomeAssetDefinition = asset({
  id: '__unknown-home-asset__',
  category: 'placeholder',
  renderer: 'UnknownHomeAsset',
  footprint: { width: 0.75, depth: 0.75, height: 0.75 },
  compatibleRooms: ['living', 'bedroom', 'garden', 'future-room'],
  compatibleSurfaces: ['floor', 'wall', 'shelf', 'table', 'mantel', 'bed', 'terrain', 'border', 'path', 'water-feature'],
  collisionClearance: 0.05,
  paletteSlots: [],
  attachmentSockets: [],
  renderCost: 2,
  progression: {},
  functional: {},
});
