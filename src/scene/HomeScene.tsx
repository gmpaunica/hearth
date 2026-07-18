import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { avatarPresets } from '@/theme/hearth';
import { Atmosphere } from './Atmosphere';
import { Avatar } from './Avatar';
import { Rain } from './Rain';
import { Room } from './Room';
import { Sparkles } from './Sparkles';
import { Bench } from './objects/Bench';
import { Fireplace } from './objects/Fireplace';
import { Plant } from './objects/Plant';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';

const LOOK_AT = new THREE.Vector3();

/**
 * Responsive framing: phones (tall aspect) get a higher, wider-angle camera
 * so the whole room — every seat included — stays on screen; wide screens
 * get a closer, cozier 3/4 view. Plus a gentle idle drift.
 */
function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / state.size.height;
    const portrait = THREE.MathUtils.clamp((1 - aspect) * 1.75, 0, 1);

    const fov = 40 + portrait * 22;
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    cam.position.x = Math.sin(t * 0.09) * 0.16;
    cam.position.y = 5.0 + portrait * 3.1 + Math.sin(t * 0.12 + 1.3) * 0.07;
    cam.position.z = 8.4 + portrait * 1.5;
    LOOK_AT.set(0, 0.9 - portrait * 0.32, -0.6);
    cam.lookAt(LOOK_AT);
  });
  return null;
}

/** Everything inside the Canvas: the shared home. */
export function HomeScene() {
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <Room />
      <Fireplace position={[-1.1, 0, -0.2]} />
      <Sofa position={[2.25, 0, 0.15]} rotation={[0, -Math.PI / 2, 0]} />
      <TableSet position={[-0.9, 0, 2.0]} />
      <Bench position={[-2.42, 0, 3.1]} />
      <Plant position={[0.35, 0, -3.8]} phase={0} />
      <Plant position={[-2.35, 0, 4.05]} scale={1.2} phase={2.1} />
      <Plant position={[2.35, 0, 3.6]} scale={0.9} phase={4.4} />
      <Rain />
      <Sparkles />
      <Avatar avatar="a" colors={avatarPresets.a} />
      <Avatar avatar="b" colors={avatarPresets.b} />
    </>
  );
}
