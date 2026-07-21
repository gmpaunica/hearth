import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { avatarPresets } from '@/theme/hearth';
import { Atmosphere } from './Atmosphere';
import { Avatar } from './Avatar';
import { PixelPass } from './PixelPass';
import { Rain } from './Rain';
import { Room } from './Room';
import { Sparkles } from './Sparkles';
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { Fireplace } from './objects/Fireplace';
import { Plant } from './objects/Plant';
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
    cam.position.set(12, 9.8, 12);
    cam.lookAt(LOOK_AT);
  });
  return null;
}

/** Everything inside the Canvas: the shared voxel home. */
export function HomeScene() {
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <Room />
      <Fireplace position={[-2.6, 0, -3.25]} />
      <Sofa position={[0.5, 0, -3.25]} />
      <TableSet position={[0.6, 0, 0.6]} />
      <Bench position={[-3.0, 0, 0.15]} />
      <Bookshelf position={[-3.0, 0, -1.55]} />
      {/* Palm blades reach ~0.9 units — keep pots clear of walls/floor edge. */}
      <Plant position={[-0.45, 0, -2.8]} phase={0} scale={0.9} />
      <Plant position={[2.4, 0, 2.1]} phase={2.1} scale={0.9} />
      <Plant position={[-2.7, 0, 2.4]} phase={4.2} scale={0.8} />
      <Rain />
      <Sparkles />
      <Avatar avatar="a" colors={avatarPresets.a} />
      <Avatar avatar="b" colors={avatarPresets.b} />
      <PixelPass />
    </>
  );
}
