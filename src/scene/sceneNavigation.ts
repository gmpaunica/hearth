export interface GroundPoint {
  x: number;
  z: number;
}

export interface SceneCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface WalkableZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const AVATAR_RADIUS = 0.24;
const GRID = 0.3;
const WORLD_MIN_X = -15.7;
const WORLD_MAX_X = 7.2;
const WORLD_MIN_Z = -9.2;
const WORLD_MAX_Z = 7.7;

// Overlapping rectangles describe the three floors and their fixed sockets.
// The bedroom connector crosses only the shared-wall arch; the garden
// connector follows the wooden path across the gap.
export const WALKABLE_ZONES: readonly WalkableZone[] = [
  { minX: -4.05, maxX: 5.05, minZ: -4.05, maxZ: 4.05 },
  { minX: -4.65, maxX: -3.95, minZ: 2.75, maxZ: 3.5 },
  { minX: -15.26, maxX: -4.49, minZ: -3.26, maxZ: 7.26 },
  { minX: 2.95, maxX: 4.05, minZ: -4.72, maxZ: -3.95 },
  { minX: 2.49, maxX: 6.51, minZ: -8.51, maxZ: -4.49 },
] as const;

// Conservative ground-plane AABBs. Low furniture is still solid for route
// planning, and compound pieces such as the dining set use one enclosing box.
export const SCENE_COLLIDERS: readonly SceneCollider[] = [
  { id: 'living.fireplace', minX: -3.45, maxX: -0.95, minZ: -4.08, maxZ: -2.6 },
  { id: 'living.sofa', minX: -0.4, maxX: 2.35, minZ: -3.95, maxZ: -2.7 },
  { id: 'living.table-and-chairs', minX: -0.35, maxX: 0.85, minZ: -0.65, maxZ: 2.65 },
  { id: 'living.bookshelf', minX: -4.18, maxX: -3.78, minZ: -2.35, maxZ: -1.15 },
  { id: 'living.daily-easel', minX: -4.3, maxX: -4.04, minZ: -0.24, maxZ: 1.08 },
  { id: 'living.rest-nook', minX: -3.15, maxX: -1.87, minZ: 3.2, maxZ: 3.84 },
  { id: 'living.plant', minX: 4.13, maxX: 4.72, minZ: 0.58, maxZ: 1.17 },
  { id: 'garden.arch-lower', minX: -4.5, maxX: -4, minZ: 2.25, maxZ: 2.75 },
  { id: 'garden.arch-upper', minX: -4.5, maxX: -4, minZ: 3.5, maxZ: 4 },
  { id: 'garden.cherry-tree', minX: -14.84, maxX: -11.61, minZ: -2.87, maxZ: -0.83 },
  { id: 'garden.koi-pond', minX: -9.2, maxX: -5.63, minZ: 4.55, maxZ: 6.86 },
  { id: 'garden.lantern-left', minX: -10.7, maxX: -10.07, minZ: 1.7, maxZ: 2.33 },
  { id: 'garden.lantern-right', minX: -7, maxX: -6.37, minZ: 1.8, maxZ: 2.43 },
  { id: 'garden.bench', minX: -12.8, maxX: -12.05, minZ: 3.6, maxZ: 5.1 },
  { id: 'bedroom.bed', minX: 3.62, maxX: 5.38, minZ: -8.72, maxZ: -6.5 },
  { id: 'bedroom.nightstand-left', minX: 2.45, maxX: 3.18, minZ: -8.5, maxZ: -7.95 },
  { id: 'bedroom.wardrobe', minX: 5.7, maxX: 6.5, minZ: -8.75, maxZ: -8.15 },
] as const;

function inZone(point: GroundPoint) {
  return WALKABLE_ZONES.some(
    (zone) =>
      point.x >= zone.minX &&
      point.x <= zone.maxX &&
      point.z >= zone.minZ &&
      point.z <= zone.maxZ,
  );
}

function pointInCollider(point: GroundPoint, collider: SceneCollider, padding = AVATAR_RADIUS) {
  return (
    point.x >= collider.minX - padding &&
    point.x <= collider.maxX + padding &&
    point.z >= collider.minZ - padding &&
    point.z <= collider.maxZ + padding
  );
}

function segmentIntersectsCollider(
  from: GroundPoint,
  to: GroundPoint,
  collider: SceneCollider,
  padding = AVATAR_RADIUS,
) {
  let enter = 0;
  let exit = 1;
  const axes = [
    { start: from.x, delta: to.x - from.x, min: collider.minX - padding, max: collider.maxX + padding },
    { start: from.z, delta: to.z - from.z, min: collider.minZ - padding, max: collider.maxZ + padding },
  ];

  for (const axis of axes) {
    if (Math.abs(axis.delta) < 1e-9) {
      if (axis.start < axis.min || axis.start > axis.max) return false;
      continue;
    }
    const t1 = (axis.min - axis.start) / axis.delta;
    const t2 = (axis.max - axis.start) / axis.delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    if (enter > exit) return false;
  }
  return true;
}

export function pointHitsCollider(point: GroundPoint, padding = AVATAR_RADIUS) {
  return SCENE_COLLIDERS.find((collider) => pointInCollider(point, collider, padding)) ?? null;
}

export function isWalkable(point: GroundPoint) {
  return inZone(point) && pointHitsCollider(point) === null;
}

const AMBIENT_BOUNDS = {
  minX: -3.65,
  maxX: 4.65,
  minZ: -3.65,
  maxZ: 3.65,
} as const;

/** Pick a safe living-room destination so idle avatars can pause anywhere. */
export function randomLivingPoint(
  random: () => number = Math.random,
  awayFrom?: GroundPoint,
  minDistance = 1,
): GroundPoint {
  for (let attempt = 0; attempt < 32; attempt++) {
    const point = {
      x: AMBIENT_BOUNDS.minX + random() * (AMBIENT_BOUNDS.maxX - AMBIENT_BOUNDS.minX),
      z: AMBIENT_BOUNDS.minZ + random() * (AMBIENT_BOUNDS.maxZ - AMBIENT_BOUNDS.minZ),
    };
    if (awayFrom && Math.hypot(point.x - awayFrom.x, point.z - awayFrom.z) < minDistance) {
      continue;
    }
    if (isWalkable(point)) return point;
  }
  return awayFrom && isWalkable(awayFrom) ? awayFrom : { x: 1.6, z: 2.8 };
}

const gridPoint = (ix: number, iz: number): GroundPoint => ({
  x: WORLD_MIN_X + ix * GRID,
  z: WORLD_MIN_Z + iz * GRID,
});
const gridIndex = (point: GroundPoint) => ({
  ix: Math.round((point.x - WORLD_MIN_X) / GRID),
  iz: Math.round((point.z - WORLD_MIN_Z) / GRID),
});
const keyFor = (ix: number, iz: number) => `${ix},${iz}`;
const snapToGrid = (point: GroundPoint) => {
  const { ix, iz } = gridIndex(point);
  return gridPoint(ix, iz);
};

export function nearestWalkablePoint(point: GroundPoint) {
  const snappedPoint = snapToGrid(point);
  if (isWalkable(point) && isWalkable(snappedPoint)) return snappedPoint;
  let best: GroundPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let radius = GRID; radius <= 1.8; radius += GRID) {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const candidate = {
        x: point.x + Math.cos(angle) * radius,
        z: point.z + Math.sin(angle) * radius,
      };
      const snapped = snapToGrid(candidate);
      const distance = Math.hypot(snapped.x - point.x, snapped.z - point.z);
      if (distance < bestDistance && isWalkable(candidate) && isWalkable(snapped)) {
        best = snapped;
        bestDistance = distance;
      }
    }
    if (best) return best;
  }
  return point;
}

function lineIsWalkable(from: GroundPoint, to: GroundPoint) {
  if (SCENE_COLLIDERS.some((collider) => segmentIntersectsCollider(from, to, collider))) {
    return false;
  }
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance / 0.08));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!inZone({
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
    })) return false;
  }
  return true;
}

function simplify(points: GroundPoint[]) {
  if (points.length < 3) return points;
  const result = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (next > anchor + 1 && !lineIsWalkable(points[anchor], points[next])) next--;
    result.push(points[next]);
    anchor = next;
  }
  return result;
}

/**
 * Grid A* over the room and passage rectangles. Start/end points inside a seat
 * or bed are connected through their nearest open approach point.
 */
export function planPath(start: GroundPoint, goal: GroundPoint): GroundPoint[] {
  const startOpen = nearestWalkablePoint(start);
  const goalOpen = nearestWalkablePoint(goal);
  const startGrid = gridIndex(startOpen);
  const goalGrid = gridIndex(goalOpen);
  const startKey = keyFor(startGrid.ix, startGrid.iz);
  const goalKey = keyFor(goalGrid.ix, goalGrid.iz);
  const frontier: { ix: number; iz: number; score: number }[] = [
    { ...startGrid, score: 0 },
  ];
  const cameFrom = new Map<string, string>();
  const costs = new Map<string, number>([[startKey, 0]]);
  const positions = new Map<string, { ix: number; iz: number }>([[startKey, startGrid]]);
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ] as const;

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.score - b.score);
    const current = frontier.shift()!;
    const currentKey = keyFor(current.ix, current.iz);
    if (currentKey === goalKey) break;

    for (const [dx, dz] of directions) {
      const ix = current.ix + dx;
      const iz = current.iz + dz;
      const next = gridPoint(ix, iz);
      if (
        next.x < WORLD_MIN_X || next.x > WORLD_MAX_X ||
        next.z < WORLD_MIN_Z || next.z > WORLD_MAX_Z ||
        !isWalkable(next)
      ) continue;
      if (dx !== 0 && dz !== 0) {
        if (!isWalkable(gridPoint(current.ix + dx, current.iz))) continue;
        if (!isWalkable(gridPoint(current.ix, current.iz + dz))) continue;
      }
      const nextKey = keyFor(ix, iz);
      const cost = (costs.get(currentKey) ?? 0) + (dx === 0 || dz === 0 ? 1 : Math.SQRT2);
      if (cost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(nextKey, cost);
      cameFrom.set(nextKey, currentKey);
      positions.set(nextKey, { ix, iz });
      const heuristic = Math.hypot(goalGrid.ix - ix, goalGrid.iz - iz);
      frontier.push({ ix, iz, score: cost + heuristic });
    }
  }

  // An unreachable destination must never degrade into a straight-line walk
  // through walls or furniture. Stay at the nearest safe point instead.
  if (!costs.has(goalKey)) return [startOpen];
  const reversed: GroundPoint[] = [goalOpen];
  let cursor = goalKey;
  while (cursor !== startKey) {
    cursor = cameFrom.get(cursor)!;
    const position = positions.get(cursor)!;
    reversed.push(gridPoint(position.ix, position.iz));
  }
  reversed.reverse();
  const route = simplify([startOpen, ...reversed.slice(1)]);
  if (Math.hypot(goal.x - goalOpen.x, goal.z - goalOpen.z) > 0.05) route.push(goal);
  return route;
}

export function segmentHitsCollider(
  from: GroundPoint,
  to: GroundPoint,
  padding = AVATAR_RADIUS,
) {
  return SCENE_COLLIDERS.find(
    (collider) => segmentIntersectsCollider(from, to, collider, padding),
  ) ?? null;
}
