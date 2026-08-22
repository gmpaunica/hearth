import type { ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { applyHomeOperation, snapHomeCoordinate, validateHomeDraft } from '@/home/editor';
import type { ResolvedHomeObject } from '@/home/types';
import { paletteColor } from '@/home/palettes';
import { type HomePlacementGhost, useHomeStudioStore } from '@/state/homeStudioStore';
import { Bed } from './objects/Bed';
import { BedsideTable, PaneledWardrobe } from './objects/BedroomFurniture';
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { DailyMediaConsole } from './objects/DailyMediaConsole';
import { Easel } from './objects/Easel';
import { Fireplace } from './objects/Fireplace';
import { GardenGreenhousePortal } from './objects/GardenGreenhousePortal';
import { Plant } from './objects/Plant';
import { RestNook } from './objects/RestNook';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';
import { IndoorCatalogObject } from './objects/IndoorCatalogObject';
import { BedroomCatalogObject } from './objects/BedroomCatalogObject';
import { GardenCatalogObject } from './objects/GardenCatalogObject';
import { BlossomTree, GardenLantern, GardenThreshold, KoiPond, RoseBush } from './rooms/Garden';

function UnknownAsset() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.65, 0.65, 0.65]} />
        <meshBasicMaterial color="#c28a76" wireframe />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshBasicMaterial color="#fff0d5" />
      </mesh>
    </group>
  );
}

function Renderer({ object }: { object: ResolvedHomeObject }) {
  if (object.placeholder) return <UnknownAsset />;
  switch (object.definition.renderer) {
    case 'Fireplace': return (
      <Fireplace
        position={[0, 0, 0]}
        tier={Number(object.definition.progression.tier ?? 1)}
        style={object.style}
      />
    );
    case 'Sofa': return <Sofa position={[0, 0, 0]} />;
    case 'TableSet': return <TableSet position={[0, 0, 0]} />;
    case 'RestNook': return <RestNook position={[0, 0, 0]} />;
    case 'Bed': return <Bed position={[0, 0, 0]} />;
    case 'Easel': return <Easel position={[0, 0, 0]} />;
    case 'DailyMediaConsole': return <DailyMediaConsole />;
    case 'GardenThreshold': return <GardenThreshold />;
    case 'Bookshelf': return <Bookshelf position={[0, 0, 0]} />;
    case 'Plant': return <Plant position={[0, 0, 0]} phase={object.id.length * 0.37} scale={0.4} />;
    case 'BedsideTable': return <BedsideTable position={[0, 0, 0]} />;
    case 'Wardrobe': return <PaneledWardrobe position={[0, 0, 0]} />;
    case 'KoiPond': return (
      <KoiPond
        position={[0, 0.02, 0]}
        waterColor={paletteColor(object.style, 'water', '#70aeb8')}
      />
    );
    case 'BlossomTree': return <BlossomTree position={[0, 0, 0]} />;
    case 'RoseBush': return <RoseBush position={[0, 0, 0]} />;
    case 'GardenLantern': return <GardenLantern position={[0, 0, 0]} />;
    case 'Bench': return <Bench position={[0, 0, 0]} />;
    case 'GardenGreenhousePortal': return (
      <GardenGreenhousePortal position={[0, 0, 0]} style={object.style} />
    );
    case 'IndoorCatalog': return <IndoorCatalogObject object={object} />;
    case 'BedroomCatalog': return <BedroomCatalogObject object={object} />;
    case 'GardenCatalog': return <GardenCatalogObject object={object} />;
    default: return <UnknownAsset />;
  }
}

function validPlacement(
  object: ResolvedHomeObject,
  ghost: HomePlacementGhost,
  position: [number, number, number],
) {
  const draft = useHomeStudioStore.getState().draftSnapshot;
  if (!draft) return false;
  try {
    let candidate = draft;
    if (ghost.isNew) {
      candidate = applyHomeOperation(candidate, {
        type: 'add',
        objectId: ghost.objectId,
        roomId: ghost.roomId,
        assetId: ghost.assetId,
        surface: ghost.surface,
        position,
        rotation: ghost.rotation,
        style: ghost.style,
        parentObjectId: ghost.parentObjectId ?? undefined,
        attachmentSocket: ghost.attachmentSocket ?? undefined,
      });
    } else {
      if (object.rotation !== ghost.rotation) {
        candidate = applyHomeOperation(candidate, {
          type: 'rotate', objectId: object.id, rotation: ghost.rotation,
        });
      }
      candidate = applyHomeOperation(candidate, {
        type: 'move', objectId: object.id, roomId: ghost.roomId,
        surface: ghost.surface, position,
      });
    }
    return !validateHomeDraft(candidate)
      .some((problem) => problem.objectIds.includes(ghost.objectId));
  } catch {
    return false;
  }
}

export function HomeObjectRenderer({
  object,
  placement,
}: {
  object: ResolvedHomeObject;
  placement?: HomePlacementGhost | null;
}) {
  const dragOffset = useRef({ x: 0, z: 0 });
  const pointerId = useRef<number | null>(null);
  const offset = object.definition.renderOffset ?? [0, 0, 0];
  const renderPosition: [number, number, number] = placement
    ? [
        placement.position[0] + offset[0],
        placement.position[1] + offset[1],
        placement.position[2] + offset[2],
      ]
    : object.renderPosition;
  const rotationY = (placement?.rotation ?? object.rotation) * Math.PI / 2;

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    const studio = useHomeStudioStore.getState();
    if (!studio.isOpen || object.placementState !== 'placed') return;
    event.stopPropagation();
    studio.selectObject(placement?.isNew ? null : object.id);
    studio.setDraggingObject(object.id);
    studio.setMessage('Drag the piece, then tap the tick when it feels right.');
    const anchor = placement?.position ?? object.position;
    const point = event.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -anchor[1]),
      new THREE.Vector3(),
    );
    if (point) {
      dragOffset.current = { x: anchor[0] - point.x, z: anchor[2] - point.z };
    }
    pointerId.current = event.pointerId;
    (event.target as unknown as { setPointerCapture?: (id: number) => void })
      .setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    const studio = useHomeStudioStore.getState();
    if (studio.draggingObjectId !== object.id) return;
    event.stopPropagation();
    const current = studio.placementGhost?.objectId === object.id
      ? studio.placementGhost
      : {
          objectId: object.id,
          assetId: object.assetId,
          roomId: object.roomId ?? studio.selectedRoomId ?? '',
          surface: object.surface,
          position: [...object.position] as [number, number, number],
          rotation: object.rotation,
          style: object.style,
          parentObjectId: object.parentObjectId,
          attachmentSocket: object.attachmentSocket,
          isNew: false,
          valid: true,
        };
    const point = event.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -current.position[1]),
      new THREE.Vector3(),
    );
    if (!point) return;
    const position: [number, number, number] = [
      snapHomeCoordinate(point.x + dragOffset.current.x),
      current.position[1],
      snapHomeCoordinate(point.z + dragOffset.current.z),
    ];
    studio.setPlacementGhost({
      ...current,
      position,
      valid: validPlacement(object, current, position),
    });
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    const studio = useHomeStudioStore.getState();
    if (studio.draggingObjectId !== object.id) return;
    event.stopPropagation();
    studio.setDraggingObject(null);
    const captured = pointerId.current;
    if (captured != null) {
      (event.target as unknown as { releasePointerCapture?: (id: number) => void })
        .releasePointerCapture?.(captured);
    }
    pointerId.current = null;
    if (studio.placementGhost?.valid === false) {
      studio.setMessage('That red spot blocks a path, wall, or another piece.');
    }
  };

  return (
    <group
      position={renderPosition}
      rotation={[0, rotationY, 0]}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(event) => {
        if (!useHomeStudioStore.getState().isOpen) return;
        event.stopPropagation();
        if (!placement?.isNew) useHomeStudioStore.getState().selectObject(object.id);
      }}
    >
      <Renderer object={object} />
    </group>
  );
}
