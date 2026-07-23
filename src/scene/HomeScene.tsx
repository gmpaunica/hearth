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
import { Room } from './Room';
import { Sparkles } from './Sparkles';
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { Fireplace } from './objects/Fireplace';
import { Plant } from './objects/Plant';
import { RestNook } from './objects/RestNook';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';

const LOOK_AT = new THREE.Vector3(0, 1.45, 0);

/**
 * Fixed isometric camera (45° azimuth, ~30° elevation). Zoom is responsive
 * so the whole diorama — every seat included — always fits the screen.
 */
function CameraRig() {
  useFrame((state) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const zoom = Math.min(state.size.width / 8.2, state.size.height / 8.0);
    if (Math.abs(cam.zoom - zoom) > 0.5) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    camState.zoom = cam.zoom;
    // Apply the drag-pan offset to both the eye and the target so the view
    // angle is preserved and the home simply slides under the camera.
    const { offX, offZ } = camState;
    cam.position.set(12 + offX, 9.8, 12 + offZ);
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
      {components.has('sofa') && <Sofa position={[0.5, 0, -3.25]} />}
      {components.has('table') && <TableSet position={[0.6, 0, 0.6]} />}
      {components.has('bench') && <Bench position={[-3.0, 0, 0.15]} />}
      {components.has('bookshelf') && <Bookshelf position={[-3.0, 0, -1.55]} />}
      {/* Palm blades reach ~0.9 units — keep pots clear of walls/floor edge. */}
      {components.has('plants') && (
        <>
          <Plant position={[-0.45, 0, -2.8]} phase={0} scale={0.9} />
          <Plant position={[2.4, 0, 2.1]} phase={2.1} scale={0.9} />
          <Plant position={[-2.7, 0, 2.4]} phase={4.2} scale={0.8} />
        </>
      )}
      <Rain />
      <Sparkles />
      <Avatar avatar="a" colors={selfColors} />
      <Avatar avatar="b" colors={partnerColors} />
      <PixelPass />
    </>
  );
}
