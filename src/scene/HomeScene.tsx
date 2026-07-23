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
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { Easel } from './objects/Easel';
import { Fireplace } from './objects/Fireplace';
import { Plant } from './objects/Plant';
import { RestNook } from './objects/RestNook';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';

// The default view is centred on the living room; you pan (drag) to the other
// floating rooms in the cluster.
const LOOK_AT = new THREE.Vector3(0, 1.45, 0);

/**
 * Fixed isometric camera (45° azimuth, ~30° elevation). Zoom is responsive
 * so the whole diorama — every seat included — always fits the screen.
 */
function CameraRig() {
  useFrame((state) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const base = Math.min(state.size.width / 8.2, state.size.height / 8.0);
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
  const { components } = useHomeProgress();

  // Character colour is tied to *who you are*, not "self vs partner", so the
  // same person looks the same on both phones. member_a always wears preset a,
  // member_b preset b. Slot 'a' is always the local player's position.
  const userId = useAuthStore((s) => s.userId);
  const memberA = useAuthStore((s) => s.couple?.member_a ?? null);
  const iAmA = !!userId && userId === memberA;
  const selfColors = iAmA ? avatarPresets.a : avatarPresets.b;
  const partnerColors = iAmA ? avatarPresets.b : avatarPresets.a;
  // Pan reach widens once there are other rooms to scroll to; snug until then.
  const hasBedroom = components.has('bed');
  const hasGarden = components.has('garden');
  useEffect(() => {
    camState.limit = hasBedroom || hasGarden ? 7.6 : 1.8;
  }, [hasBedroom, hasGarden]);
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <Room />
      {components.has('fireplace') && <Fireplace position={[-2.6, 0, -3.25]} />}
      {/* Cosy reading couch on the right, paired with the sofa, clear of the table. */}
      {components.has('restnook') && <RestNook position={[3.0, 0, -1.5]} />}
      {/* Daily-drawing frame on the left wall above the bench (faces the room). */}
      {components.has('easel') && (
        <group position={[-3.28, 1.35, 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <Easel position={[0, 0, 0]} />
        </group>
      )}
      {components.has('sofa') && <Sofa position={[0.2, 0, -3.25]} />}
      {components.has('table') && <TableSet position={[0.6, 0, 0.6]} />}
      {components.has('bench') && <Bench position={[-3.0, 0, 0.15]} />}
      {components.has('bookshelf') && <Bookshelf position={[-3.0, 0, -1.55]} />}
      {/* Palm blades reach ~0.9 units — keep pots clear of walls/doors/edges. */}
      {components.has('plants') && (
        <>
          <Plant position={[-0.45, 0, -2.8]} phase={0} scale={0.9} />
          <Plant position={[2.9, 0, 1.4]} phase={2.1} scale={0.85} />
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
