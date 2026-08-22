import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

import { useAvatarStore } from '@/state/avatarStore';
import { useHomeStore } from '@/state/homeStore';
import { useHomeStudioStore } from '@/state/homeStudioStore';
import { HOME_ASSET_REGISTRY } from '@/home/catalog';
import { appearanceToAvatarColors } from '@/state/avatarAppearance';
import { Atmosphere } from './Atmosphere';
import { HOME_CAMERA_FRAME, camState, publishFocusedRoom } from './cameraState';
import { Avatar } from './Avatar';
import { HOME_ART_RESOLUTION, PixelPass } from './PixelPass';
import { HomeObjectRenderer } from './HomeObjectRenderer';
import { Rain } from './Rain';
import { ReconcileHeart } from './ReconcileHeart';
import { WorldAnchorProjector } from './WorldAnchorProjector';
import { MomentSceneDetails } from './MomentSceneDetails';
import { Room } from './Room';
import { FireGlowDecal } from './rooms/LivingRoom';
import { Sparkles } from './Sparkles';
import { clampCameraOffset, nearestRoom, ROOM_STOPS, type RoomId } from './roomNavigation';
import { FireplaceOutcomes } from './objects/FireplaceOutcomes';

// Frame the floor slightly above screen centre so the detailed home occupies
// the visual field beneath the quiet header instead of sitting low in empty sky.
const LOOK_AT_Y = 0.2;

function PlacementGhost() {
  const ghost = useHomeStudioStore((state) => state.placementGhost);
  if (!ghost) return null;
  const definition = HOME_ASSET_REGISTRY.get(ghost.assetId);
  if (!definition) return null;
  const swapped = ghost.rotation % 2 === 1;
  const width = swapped ? definition.footprint.depth : definition.footprint.width;
  const depth = swapped ? definition.footprint.width : definition.footprint.depth;
  return (
    <mesh position={[ghost.position[0], ghost.position[1] + 0.045, ghost.position[2]]}>
      <boxGeometry args={[width, 0.09, depth]} />
      <meshBasicMaterial
        color={ghost.valid ? '#75b66f' : '#c95f56'}
        transparent
        opacity={0.58}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Fixed isometric camera (45° azimuth, ~30° elevation). The framing (centre +
 * how much world it spans) is published to camState by HomeScene so the default
 * view can widen once there are neighbouring rooms to reveal.
 */
function CameraRig() {
  useFrame((state, delta) => {
    const cam = state.camera as THREE.OrthographicCamera;
    // Eye stays a fixed diagonal offset from the target, so recentring on the
    // frame centre preserves the exact isometric angle. The drag-pan offset
    // slides both eye and target together so the home moves under the camera.
    if (!camState.dragging && camState.focusTarget) {
      camState.offX = THREE.MathUtils.damp(camState.offX, camState.focusTarget.x, 4.8, delta);
      camState.offZ = THREE.MathUtils.damp(camState.offZ, camState.focusTarget.z, 4.8, delta);
      if (Math.hypot(
        camState.offX - camState.focusTarget.x,
        camState.offZ - camState.focusTarget.z,
      ) < 0.025) {
        camState.offX = camState.focusTarget.x;
        camState.offZ = camState.focusTarget.z;
        camState.focusTarget = null;
      }
    } else if (!camState.dragging && (camState.velocityX !== 0 || camState.velocityZ !== 0)) {
      const next = clampCameraOffset(
        camState.offX + camState.velocityX * delta,
        camState.offZ + camState.velocityZ * delta,
        camState.zoomMul,
      );
      camState.offX = next.x;
      camState.offZ = next.z;
      const decay = Math.exp(-5.2 * delta);
      camState.velocityX *= decay;
      camState.velocityZ *= decay;
      if (Math.hypot(camState.velocityX, camState.velocityZ) < 0.015) {
        camState.velocityX = 0;
        camState.velocityZ = 0;
      }
    }
    const { offX, offZ, centerX, centerZ } = camState;
    const nearest = nearestRoom(offX, offZ);
    // Define the orthographic frustum directly in world units. Deriving zoom
    // from native surface pixels produced a narrower-than-requested view on the
    // phone, placing the garden corner on the bezel despite the nominal margin.
    const aspect = Math.max(state.size.width / Math.max(state.size.height, 1), 0.01);
    const frameAspect = camState.viewW / camState.viewH;
    const fittedW = aspect >= frameAspect ? camState.viewH * aspect : camState.viewW;
    const fittedH = aspect >= frameAspect ? camState.viewH : camState.viewW / aspect;
    const halfW = fittedW / 2;
    const halfH = fittedH / 2;
    const frustumChanged =
      Math.abs(cam.left + halfW) > 0.01 ||
      Math.abs(cam.right - halfW) > 0.01 ||
      Math.abs(cam.top - halfH) > 0.01 ||
      Math.abs(cam.bottom + halfH) > 0.01 ||
      Math.abs(cam.zoom - camState.zoomMul) > 0.001;
    if (frustumChanged) {
      cam.left = -halfW;
      cam.right = halfW;
      cam.top = halfH;
      cam.bottom = -halfH;
      cam.zoom = camState.zoomMul;
      cam.updateProjectionMatrix();
    }
    // Effective CSS pixels per world unit, used only to translate drag distance.
    camState.zoom = (state.size.width / fittedW) * camState.zoomMul;
    publishFocusedRoom(nearest.distance <= 3.1 ? nearest.stop.id : null);
    cam.position.set(12 + centerX + offX, 9.8, 12 + centerZ + offZ);
    cam.lookAt(centerX + offX, LOOK_AT_Y, centerZ + offZ);
  });
  return null;
}

/** Everything inside the Canvas: the shared voxel home. */
export function HomeScene({ initialRoom = 'living' }: { initialRoom?: RoomId }) {
  const scene = useHomeStore((state) => state.resolved);
  const avatarA = useAvatarStore((s) => s.appearances.a);
  const avatarB = useAvatarStore((s) => s.appearances.b);
  const fireplace = scene.roles.fireplace;

  // Scene identity is global, not device-relative: member A is always the red
  // A avatar and member B is always the green B avatar on both phones.
  // Keep the living room dominant while the neighbouring room shells peek at
  // the edges. Free pan and pinch remain available whether rooms are locked or
  // furnished, so progression stays visible from day one.
  useEffect(() => {
    const initialFocus = scene.cameraStops[initialRoom] ?? ROOM_STOPS[initialRoom];
    camState.offX = initialFocus.x;
    camState.offZ = initialFocus.z;
    camState.velocityX = 0;
    camState.velocityZ = 0;
    camState.focusTarget = null;
    camState.zoomMul = 1;
    camState.centerX = HOME_CAMERA_FRAME.centerX;
    camState.centerZ = HOME_CAMERA_FRAME.centerZ;
    // This fixed overview includes the complete rectangular garden at the
    // living-room position, so it cannot appear as a clipped triangle.
    camState.viewW = HOME_CAMERA_FRAME.viewW;
    camState.viewH = HOME_CAMERA_FRAME.viewH;
  }, [initialRoom, scene.cameraStops]);
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <Room />
      <PlacementGhost />
      {scene.objects
        .filter((object) => object.placementState === 'placed')
        .map((object) => <HomeObjectRenderer key={object.id} object={object} />)}
      {fireplace && (
        <>
          <FireplaceOutcomes position={fireplace.renderPosition} rotationY={fireplace.rotationY} />
          <FireGlowDecal position={fireplace.renderPosition} rotationY={fireplace.rotationY} />
        </>
      )}
      <Rain />
      <Sparkles />
      <MomentSceneDetails />
      <ReconcileHeart />
      <WorldAnchorProjector />
      <Avatar avatar="a" colors={appearanceToAvatarColors(avatarA)} />
      <Avatar avatar="b" colors={appearanceToAvatarColors(avatarB)} />
      <PixelPass resolution={HOME_ART_RESOLUTION} />
    </>
  );
}
