import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

import { useAuthStore } from '@/state/authStore';
import { useHomeProgress } from '@/state/homeProgress';
import { avatarPresets } from '@/theme/hearth';
import { Atmosphere } from './Atmosphere';
import { camState } from './cameraState';
import { Avatar } from './Avatar';
import { PixelPass } from './PixelPass';
import { Rain } from './Rain';
import { ReconcileHeart } from './ReconcileHeart';
import { Room } from './Room';
import { Sparkles } from './Sparkles';
import { Bed } from './objects/Bed';
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { Easel } from './objects/Easel';
import { Fireplace } from './objects/Fireplace';
import { Plant } from './objects/Plant';
import { RestNook } from './objects/RestNook';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';

// Centre of the widened diorama (world x -3.5..5.25, z -3.5..3.75).
const LOOK_AT = new THREE.Vector3(0.7, 1.45, 0.0);

/**
 * Fixed isometric camera (45° azimuth, ~30° elevation). Zoom is responsive
 * so the whole diorama — every seat included — always fits the screen.
 */
function CameraRig() {
  useFrame((state) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const base = Math.min(state.size.width / 13.0, state.size.height / 9.5);
    const zoom = base * camState.zoomMul;
    if (Math.abs(cam.zoom - zoom) > 0.3) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    camState.zoom = cam.zoom;
    // Eye stays a fixed diagonal offset from the target, so recentring on
    // LOOK_AT preserves the exact isometric angle. The drag-pan offset slides
    // both eye and target together so the home just moves under the camera.
    const { offX, offZ } = camState;
    cam.position.set(12 + LOOK_AT.x + offX, 9.8, 12 + LOOK_AT.z + offZ);
    cam.lookAt(LOOK_AT.x + offX, LOOK_AT.y, LOOK_AT.z + offZ);
  });
  return null;
}

/** Everything inside the Canvas: the shared voxel home. */
export function HomeScene() {
  // The home fills in as the relationship grows (see homeProgress). Day 0 is
  // just the room and the fire; the rest arrives at milestones.
  const { components, stageIndex } = useHomeProgress();

  // Character colour is tied to *who you are*, not "self vs partner", so the
  // same person looks the same on both phones. member_a always wears preset a,
  // member_b preset b. Slot 'a' is always the local player's position.
  const userId = useAuthStore((s) => s.userId);
  const memberA = useAuthStore((s) => s.couple?.member_a ?? null);
  const iAmA = !!userId && userId === memberA;
  const selfColors = iAmA ? avatarPresets.a : avatarPresets.b;
  const partnerColors = iAmA ? avatarPresets.b : avatarPresets.a;
  // More unlocked → more to explore, so allow the view to roam a little further.
  useEffect(() => {
    camState.limit = 1.4 + Math.max(0, stageIndex) * 0.4;
  }, [stageIndex]);
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <Room />
      {components.has('fireplace') && <Fireplace position={[-2.6, 0, -3.25]} />}
      {components.has('restnook') && <RestNook position={[3.0, 0, 0.2]} />}
      {/* Daily-drawing frame now hangs on the new back-right wall above the bed
          (it used to overlap the window in the small house). */}
      {components.has('easel') && <Easel position={[3.66, 1.7, -3.22]} />}
      {components.has('sofa') && <Sofa position={[0.2, 0, -3.25]} />}
      {components.has('bed') && <Bed position={[3.45, 0, -3.35]} />}
      {components.has('table') && <TableSet position={[0.6, 0, 0.6]} />}
      {components.has('bench') && <Bench position={[-3.0, 0, 0.15]} />}
      {components.has('bookshelf') && <Bookshelf position={[-3.0, 0, -1.55]} />}
      {/* Palm blades reach ~0.9 units — keep pots clear of walls/floor edge. */}
      {components.has('plants') && (
        <>
          <Plant position={[-0.45, 0, -2.8]} phase={0} scale={0.9} />
          <Plant position={[4.6, 0, 1.7]} phase={2.1} scale={0.9} />
          <Plant position={[-2.7, 0, 2.4]} phase={4.2} scale={0.8} />
        </>
      )}
      <Rain />
      <Sparkles />
      <ReconcileHeart />
      <Avatar avatar="a" colors={selfColors} />
      <Avatar avatar="b" colors={partnerColors} />
      <PixelPass />
    </>
  );
}
