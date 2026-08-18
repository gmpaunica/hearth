import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { getGreenhouseBayCount } from '@/memories/greenhouseModel';
import { Atmosphere } from './Atmosphere';
import { HOME_ART_RESOLUTION, PixelPass } from './PixelPass';
import { Greenhouse } from './objects/Greenhouse';

function GreenhouseCamera({ bayCount }: { bayCount: number }) {
  useFrame((state) => {
    const camera = state.camera as THREE.OrthographicCamera;
    const aspect = Math.max(state.size.width / Math.max(1, state.size.height), 0.01);
    const frameWidth = 7.6 + Math.max(0, bayCount - 1) * 1.5;
    const frameHeight = 7.4;
    const frameAspect = frameWidth / frameHeight;
    const fittedWidth = aspect >= frameAspect ? frameHeight * aspect : frameWidth;
    const fittedHeight = aspect >= frameAspect ? frameHeight : frameWidth / aspect;
    camera.left = -fittedWidth / 2;
    camera.right = fittedWidth / 2;
    camera.top = fittedHeight / 2;
    camera.bottom = -fittedHeight / 2;
    camera.zoom = 1;
    camera.position.set(8.5, 7.2, 9.5);
    camera.lookAt(0, 1.15, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

export function GreenhouseScene({ memoryCount }: { memoryCount: number }) {
  const bayCount = getGreenhouseBayCount(memoryCount);
  return (
    <>
      <GreenhouseCamera bayCount={bayCount} />
      <Atmosphere />
      <Greenhouse memoryCount={memoryCount} />
      <PixelPass resolution={HOME_ART_RESOLUTION} />
    </>
  );
}
