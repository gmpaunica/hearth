import type { ThreeEvent } from '@react-three/fiber';

import { requestMomentCameraFocus } from '@/scene/cameraState';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { room } from '@/theme/hearth';
import { EmberColumn, Fire } from '../Fire';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

/** Running-bond bricks with visible darker mortar joints. */
function brickAt(x: number, y: number): string {
  const offset = (y % 2) * 2;
  const gx = (((x + offset) % 3) + 3) % 3;
  if (gx === 2) return '#8e3d2c';
  return (Math.floor((x + offset) / 3) + y) % 2 === 0
    ? room.brick
    : room.brickDark;
}

// Local grid: 10 wide (x), 5 deep (z), body 10 high + chimney to 14.
function buildFireplace(v: Vox) {
  const stone = '#d7b98e';
  const stoneLight = '#ead1aa';
  const woodLight = '#a86b3b';

  // Brick body, mortar-jointed courses.
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 10; y++) {
      for (let z = 0; z < 3; z++) v.set(x, y, z, brickAt(x, y));
    }
  }

  // Firebox cavity with stepped arch corners and a deep charcoal interior.
  v.remove(1, 0, 1, 6, 5, 2);
  v.box(1, 4, 1, 1, 1, 2, brickAt(1, 4));
  v.box(6, 4, 1, 1, 1, 2, brickAt(6, 4));
  v.box(1, 0, 0, 6, 5, 1, room.fireplaceInner);

  // Pale stepped surround makes the opening legible without replacing the
  // warm running-bond brickwork.
  v.box(0, 0, 3, 1, 6, 1, stone);
  v.box(7, 0, 3, 1, 6, 1, '#c8a77d');
  v.box(1, 5, 3, 6, 1, 1, stoneLight);
  v.set(1, 4, 3, stone);
  v.set(6, 4, 3, stone);

  // Glowing coals and crossed dark logs on the cavity floor.
  v.set(2, 0, 1, room.ember);
  v.set(3, 0, 1, '#ffb95e');
  v.set(4, 0, 1, room.ember);
  v.set(5, 0, 1, '#e0763a');
  v.set(2, 0, 2, '#5a3c26');
  v.set(4, 0, 2, '#5a3c26');

  // Deep layered mantel with two block corbels underneath.
  v.box(0, 9, 0, 8, 1, 4, room.woodDark);
  v.box(0, 8, 2, 2, 1, 2, room.mantel);
  v.box(6, 8, 2, 2, 1, 2, room.mantel);
  v.box(-1, 10, 0, 10, 1, 4, room.mantel);
  v.box(-1, 10, 3, 10, 1, 1, woodLight);

  // Brick chimney breast continuing to the wall top.
  for (let x = 1; x < 7; x++) {
    for (let y = 11; y < 14; y++) {
      for (let z = 0; z < 3; z++) v.set(x, y, z, brickAt(x, y));
    }
  }

  // Charcoal hearth slab in front, edged with warm stone pixels.
  v.box(-1, 0, 3, 10, 1, 2, '#33291f');
  v.box(0, 0, 4, 8, 1, 1, '#5b4938');
  v.set(-1, 0, 3, stone);
  v.set(8, 0, 3, stone);

  // Candles, a bud vase, and a framed-heart tile. These are static decor, not
  // reconciliation-state artifacts.
  v.box(0, 11, 1, 1, 2, 1, room.frameWhite);
  v.set(0, 13, 1, room.ember);
  v.box(7, 11, 1, 1, 1, 1, '#e8d9c4');
  v.set(7, 12, 1, room.ember);
  v.set(2, 11, 1, '#a65e3e');
  v.set(2, 12, 1, '#da8e78');
  v.set(1, 12, 1, '#7d925d');
  v.box(3, 11, 3, 2, 3, 1, room.woodDark);
  v.set(3, 12, 4, '#f0d7b8');
  v.set(4, 12, 4, '#cf6657');

  // A few brighter face bricks provide restrained hand-built variation.
  for (const [x, y] of [[1, 7], [5, 8], [2, 12], [6, 6]] as const) {
    v.set(x, y, 3, '#ce6a4c');
  }
}

/** Brick voxel fireplace; `position` is the min-corner of its local grid. */
export function Fireplace({ position }: { position: [number, number, number] }) {
  const openHearth = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const scene = useSceneStore.getState();
    requestMomentCameraFocus('fireplace', scene.reduceMotion);
    useMomentsSurfaceStore.getState().openHearth();
  };

  return (
    <group position={position} onClick={openHearth}>
      {/* One generous raycast surface makes the whole fireplace selectable,
          including the empty firebox and gaps between voxel mantel pieces. */}
      <mesh position={[1, 1.75, 0.55]} onClick={openHearth}>
        <boxGeometry args={[3, 3.75, 1.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <VoxMesh build={buildFireplace} scale={0.25} />
      <Fire position={[1.0, 0.14, 0.42]} />
      <EmberColumn position={[1.0, 3.55, 0.38]} />
    </group>
  );
}
