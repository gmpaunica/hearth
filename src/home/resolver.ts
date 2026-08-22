import { HOME_ASSET_REGISTRY, UNKNOWN_HOME_ASSET } from './catalog';
import { COTTAGE_V2_CAMERA_STOPS, COTTAGE_V2_WALKABLE_ZONES } from './layouts';
import type {
  HomeAssetDefinition,
  HomeBounds,
  HomeCoupleRig,
  HomeRigPose,
  HomeSnapshot,
  ResolvedHomeObject,
  ResolvedHomeScene,
  ResolvedWalkableZone,
} from './types';

function rotatePoint(x: number, z: number, rotationY: number) {
  const cosine = Math.cos(rotationY);
  const sine = Math.sin(rotationY);
  return { x: x * cosine + z * sine, z: -x * sine + z * cosine };
}

function resolveRig(object: ResolvedHomeObject, rig: HomeCoupleRig): HomeCoupleRig {
  const resolvePose = (pose: HomeRigPose): HomeRigPose => {
    const point = rotatePoint(pose.x, pose.z, object.rotationY);
    const approachPoint = pose.approach
      ? rotatePoint(pose.approach.x, pose.approach.z, object.rotationY) : null;
    const egressPoint = pose.egress
      ? rotatePoint(pose.egress.x, pose.egress.z, object.rotationY) : null;
    return {
      x: object.position[0] + point.x,
      z: object.position[2] + point.z,
      rotY: pose.rotY + object.rotationY,
      seatY: pose.seatY,
      approach: approachPoint ? {
        x: object.position[0] + approachPoint.x,
        z: object.position[2] + approachPoint.z,
      } : undefined,
      egress: egressPoint && pose.egress ? {
        x: object.position[0] + egressPoint.x,
        z: object.position[2] + egressPoint.z,
        rotY: pose.egress.rotY + object.rotationY,
      } : undefined,
    };
  };
  return { a: resolvePose(rig.a), b: resolvePose(rig.b) };
}

function shiftRig(rig: HomeCoupleRig, x: number, z: number): HomeCoupleRig {
  const shiftPose = (pose: HomeRigPose): HomeRigPose => ({
    ...pose,
    x: pose.x + x,
    z: pose.z + z,
    approach: pose.approach ? { x: pose.approach.x + x, z: pose.approach.z + z } : undefined,
    egress: pose.egress ? { ...pose.egress, x: pose.egress.x + x, z: pose.egress.z + z } : undefined,
  });
  return { a: shiftPose(rig.a), b: shiftPose(rig.b) };
}

function rotatedBounds(
  definition: HomeAssetDefinition,
  object: ResolvedHomeObject,
): HomeBounds {
  const authored = definition.collisionBounds;
  if (authored) {
    // Foundation renderers use their original asymmetric origin at rotation 0.
    // New editor-native assets use centered footprint bounds below.
    if (object.rotation === 0) return {
      minX: object.position[0] + authored.minX,
      maxX: object.position[0] + authored.maxX,
      minZ: object.position[2] + authored.minZ,
      maxZ: object.position[2] + authored.maxZ,
    };
  }
  const swap = object.rotation % 2 === 1;
  const width = swap ? definition.footprint.depth : definition.footprint.width;
  const depth = swap ? definition.footprint.width : definition.footprint.depth;
  return {
    minX: object.position[0] - width / 2,
    maxX: object.position[0] + width / 2,
    minZ: object.position[2] - depth / 2,
    maxZ: object.position[2] + depth / 2,
  };
}

function walkableZones(snapshot: HomeSnapshot): ResolvedWalkableZone[] {
  const roomKinds = new Set(snapshot.rooms.map((room) => room.moduleId));
  return COTTAGE_V2_WALKABLE_ZONES
    .filter((zone) => {
      if (zone.id.startsWith('bedroom')) return roomKinds.has('bedroom');
      if (zone.id.startsWith('garden')) return snapshot.gardenTier !== 'courtyard';
      return true;
    })
    .map((zone) => {
      const kind = zone.id.startsWith('bedroom') ? 'bedroom'
        : zone.id.startsWith('garden') ? 'garden' : 'living';
      const room = snapshot.rooms.find((candidate) => candidate.moduleId === kind);
      return { ...zone, roomId: room?.id ?? zone.roomId };
    });
}

/**
 * Resolve once, then let rendering, walking, cameras and overlays consume the
 * same immutable scene. Unknown catalog IDs deliberately survive as a small
 * placeholder so a retired content pack can never erase a couple's layout.
 */
export function resolveHomeScene(snapshot: HomeSnapshot): ResolvedHomeScene {
  const diagnostics: string[] = [];
  const objects = snapshot.objects.map<ResolvedHomeObject>((object) => {
    const registered = HOME_ASSET_REGISTRY.get(object.assetId);
    const placeholder = !registered || object.retired === true;
    const definition = registered ?? UNKNOWN_HOME_ASSET;
    if (placeholder) diagnostics.push(`Unresolved asset ${object.assetId} (${object.id})`);
    const offset = definition.renderOffset ?? [0, 0, 0];
    return {
      ...object,
      definition,
      renderPosition: [
        object.position[0] + offset[0],
        object.position[1] + offset[1],
        object.position[2] + offset[2],
      ],
      rotationY: object.rotation * Math.PI / 2,
      placeholder,
    };
  });
  const placed = objects.filter((object) => object.placementState === 'placed');
  const roles: ResolvedHomeScene['roles'] = {};
  const overlayAnchors: Record<string, [number, number, number]> = {};
  const interactionSpots: Record<string, HomeCoupleRig> = {
    idle: {
      a: { x: -1.45, z: 1.45, rotY: 0.35, seatY: 0 },
      b: { x: 1.75, z: 1.35, rotY: -0.25, seatY: 0 },
    },
  };
  for (const object of placed) {
    const role = object.definition.functional.role;
    if (role && !roles[role]) roles[role] = object;
    const anchor = object.definition.functional.uiAnchor;
    const rotatedAnchor = anchor ? rotatePoint(anchor[0], anchor[2], object.rotationY) : null;
    overlayAnchors[object.id] = anchor && rotatedAnchor
      ? [object.position[0] + rotatedAnchor.x, object.position[1] + anchor[1], object.position[2] + rotatedAnchor.z]
      : [object.position[0], object.position[1] + object.definition.footprint.height, object.position[2]];
    const rig = object.definition.functional.coupleRig;
    if (rig) {
      const spotId = role === 'fireplace' ? 'fireplace'
        : role === 'conversation_seating' ? 'sofa'
          : role === 'shared_table' ? 'table'
            : role === 'rest_location' ? 'rest'
              : role === 'romantic_rest_location' ? 'romantic'
                : role === 'garden_portal' ? 'garden_arch'
                  : object.definition.functional.interactionRig === 'garden-couple' ? 'garden'
                    : null;
      if (spotId && !interactionSpots[spotId]) {
        const resolvedRig = resolveRig(object, rig);
        interactionSpots[spotId] = spotId === 'garden_arch' && snapshot.gardenTier === 'courtyard'
          ? shiftRig(resolvedRig, 1.4, 0)
          : resolvedRig;
      }
    }
  }
  if (!interactionSpots.garden && interactionSpots.garden_arch) {
    interactionSpots.garden = interactionSpots.garden_arch;
  }
  const rooms = snapshot.rooms.map((room) => {
    const stop = room.moduleId === 'living' ? COTTAGE_V2_CAMERA_STOPS.living
      : room.moduleId === 'bedroom' ? COTTAGE_V2_CAMERA_STOPS.bedroom
        : room.moduleId === 'garden' && snapshot.gardenTier !== 'courtyard'
          ? COTTAGE_V2_CAMERA_STOPS.garden : null;
    return { ...room, cameraStop: stop };
  });
  const cameraStops: ResolvedHomeScene['cameraStops'] = {};
  for (const room of rooms) if (room.cameraStop) cameraStops[room.cameraStop.id] = room.cameraStop;

  return {
    snapshotRevision: snapshot.revision,
    layoutId: snapshot.layoutId,
    catalogVersion: snapshot.catalogVersion,
    gardenTier: snapshot.gardenTier,
    rooms,
    objects,
    colliders: placed
      .filter((object) => object.parentObjectId === null)
      .filter((object) => object.surface !== 'wall' && object.definition.progression.walkable !== true)
      .filter((object) => !['DailyMediaConsole', 'GardenThreshold'].includes(object.definition.renderer))
      .map((object) => ({
        id: `${object.definition.category}.${object.id}`,
        objectId: object.id,
        ...rotatedBounds(object.definition, object),
      })),
    walkableZones: walkableZones(snapshot),
    reservedRoutes: snapshot.reservedRoutes,
    roles,
    cameraStops,
    overlayAnchors,
    interactionSpots,
    capabilities: snapshot.capabilities,
    diagnostics,
  };
}
