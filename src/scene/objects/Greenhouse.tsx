import { getGreenhouseBayCount } from '@/memories/greenhouseModel';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

const CELL = 0.26;
const BAY_WIDTH = 7;
const DEPTH = 10;

function greenhouseWidth(bayCount: number) {
  return bayCount * BAY_WIDTH + 1;
}

function addMemoryTile(v: Vox, memoryIndex: number) {
  const bay = Math.floor(memoryIndex / 4);
  const slot = memoryIndex % 4;
  const x = bay * BAY_WIDTH + 2 + (slot % 2) * 3;
  const z = slot < 2 ? 1 : 8;
  const frame = memoryIndex % 2 === 0 ? '#bb6347' : '#9d6b43';
  const picture = memoryIndex % 3 === 0 ? '#d7a5a1' : memoryIndex % 3 === 1 ? '#efc675' : '#91ab78';
  v.box(x, 3, z, 2, 3, 1, frame);
  v.box(x, 4, z + (z === 1 ? 1 : -1), 2, 1, 1, picture);
  v.set(x, 2, z, '#d79362');
  v.set(x, 1, z, '#6b7f43');
}

function buildGreenhouse(v: Vox, bayCount: number, memoryCount: number) {
  const width = greenhouseWidth(bayCount);
  const frame = '#9d563c';
  const frameLight = '#c3764e';
  const glass = '#c4ddd0';
  const glassLight = '#deead8';

  v.box(0, -1, 0, width, 1, DEPTH, '#6a4534');
  v.box(0, 0, 0, width, 1, DEPTH, '#b96748');
  v.box(1, 1, 1, width - 2, 1, DEPTH - 2, '#7d8c50');
  v.box(1, 1, 4, width - 2, 1, 2, '#d6b28d');

  for (let bay = 0; bay <= bayCount; bay += 1) {
    const x = bay * BAY_WIDTH;
    v.box(x, 1, 0, 1, 8, 1, frame);
    v.box(x, 1, DEPTH - 1, 1, 8, 1, frameLight);
  }
  v.box(0, 8, 0, width, 1, 1, frame);
  v.box(0, 8, DEPTH - 1, width, 1, 1, frameLight);
  v.box(0, 4, 0, width, 1, 1, frame);
  v.box(0, 4, DEPTH - 1, width, 1, 1, frameLight);

  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < DEPTH; z += 1) {
      if (z === 4 || z === 5) continue;
      const roofY = 8 + Math.min(z, DEPTH - 1 - z);
      v.set(x, roofY, z, (x + z) % 3 === 0 ? glassLight : glass);
    }
  }
  v.box(0, 12, 4, width, 1, 2, frameLight);

  v.box(0, 1, 0, 1, 8, DEPTH, frame);
  v.box(width - 1, 1, 0, 1, 8, DEPTH, frameLight);
  for (let z = 1; z < DEPTH - 1; z += 2) {
    v.set(0, 5, z, glass);
    v.set(width - 1, 5, z, glassLight);
  }

  const doorX = Math.max(1, Math.floor(width / 2) - 1);
  v.box(doorX, 1, DEPTH - 1, 3, 7, 1, '#7f4937');
  v.remove(doorX + 1, 2, DEPTH - 1, 1, 5, 1);
  v.set(doorX + 2, 4, DEPTH, '#e9bd72');

  for (let index = 0; index < memoryCount; index += 1) addMemoryTile(v, index);
}

function GlassPanels({ bayCount }: { bayCount: number }) {
  return (
    <>
      {Array.from({ length: bayCount }, (_, bay) => {
        const x = (bay * BAY_WIDTH + BAY_WIDTH / 2) * CELL;
        return (
          <mesh key={bay} position={[x, 1.18, (DEPTH - 0.92) * CELL]}>
            <boxGeometry args={[(BAY_WIDTH - 1.3) * CELL, 1.42, 0.025]} />
            <meshBasicMaterial color="#d7eee0" transparent opacity={0.13} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

export function Greenhouse({ memoryCount }: { memoryCount: number }) {
  const bayCount = getGreenhouseBayCount(memoryCount);
  const width = greenhouseWidth(bayCount);
  const offset: [number, number, number] = [-(width * CELL) / 2, 0, -(DEPTH * CELL) / 2];

  return (
    <group position={offset}>
      <VoxMesh
        key={`${bayCount}-${memoryCount}`}
        build={(voxels) => buildGreenhouse(voxels, bayCount, memoryCount)}
        scale={CELL}
      />
      <GlassPanels bayCount={bayCount} />
    </group>
  );
}
