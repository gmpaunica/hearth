import { PlatformFx } from '../PlatformFx';
import { BEDROOM_OFFSET, S, buildCornerShell } from '../shell';
import { VoxMesh } from '../VoxMesh';
import { Vox } from '../voxel';

function buildBedroomShell(v: Vox) {
  buildCornerShell(v, -10, 9, -10, 8);
  for (let x = -10; x <= 9; x++) {
    for (let z = -10; z <= 8; z++) {
      const border = x === -10 || x === 9 || z === -10 || z === 8;
      v.set(x, -1, z, border ? '#925d56' : (x + z) % 2 === 0 ? '#c8897e' : '#bb7d73');
    }
  }
  v.box(-11, -3, -11, 21, 2, 20, '#54352c');
  v.box(-11, 0, -11, 21, 15, 1, '#efd9c7');
  v.box(-11, 0, -11, 1, 15, 19, '#e4c2b0');
  v.remove(-11, 0, 8, 1, 15, 1);
  v.box(-10, 0, -10, 20, 2, 1, '#985c53');
  v.box(-10, 15, -11, 20, 2, 2, '#9c503f');
  v.box(-11, 15, -10, 2, 2, 18, '#8f493b');
  for (let x = -10; x <= 9; x += 4) v.box(x, 17, -11, 3, 1, 2, '#b8624b');

  v.remove(-8, 6, -11, 6, 7, 1);
  v.box(-9, 5, -11, 8, 1, 2, '#84503b');
  v.box(-9, 13, -11, 8, 1, 2, '#9a6046');
  v.box(-9, 6, -11, 1, 7, 2, '#84503b');
  v.box(-2, 6, -11, 1, 7, 2, '#84503b');
  v.box(-5, 6, -11, 1, 7, 2, '#985e42');
  v.box(-8, 9, -11, 6, 1, 2, '#985e42');
}

function buildNookRug(v: Vox) {
  v.box(0, 0, 0, 12, 1, 9, '#f0d6c4');
  for (let x = 1; x < 11; x++) for (let z = 1; z < 8; z++) {
    const stripe = (x + Math.floor(z / 2)) % 4 === 0;
    v.set(x, 0, z, stripe ? '#b97877' : (z % 3 === 0 ? '#ddafa3' : '#ead0bd'));
  }
  for (const [x, z] of [[0, 0], [11, 0], [0, 8], [11, 8]]) v.remove(x, 0, z);
}

export function Bedroom() {
  return (
    <group position={[...BEDROOM_OFFSET]}>
      <VoxMesh build={buildBedroomShell} scale={S} />
      <mesh position={[-1.37, 2.35, -2.79]}>
        <planeGeometry args={[1.45, 1.7]} />
        <meshBasicMaterial color="#ffd89a" toneMapped={false} />
      </mesh>
      <VoxMesh build={buildNookRug} scale={S} meshScale={[1, 0.22, 1]} position={[-1.25, 0, -0.75]} />
      <PlatformFx x0={-2.75} x1={2.5} z0={-2.75} z1={2.25} showFrontEdge={false} />
    </group>
  );
}
