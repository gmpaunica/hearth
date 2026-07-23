import { useMemo } from 'react';
import * as THREE from 'three';

import { GRID, PALETTE, useDrawingStore } from '@/state/drawingStore';
import { VoxMesh } from '../VoxMesh';
import { Vox, voxelMaterial } from '../voxel';

const WOOD = '#8a5a33';
const WOOD_DARK = '#6e4526';

// A-frame stand + a board to hold the picture. Built in local space; the
// wrapping group handles world position + facing.
function buildEasel(v: Vox) {
  v.box(0, 0, 0, 1, 14, 1, WOOD); // front-left leg
  v.box(6, 0, 0, 1, 14, 1, WOOD); // front-right leg
  v.box(3, 0, -3, 1, 13, 1, WOOD_DARK); // back leg
  v.box(0, 6, 0, 7, 1, 1, WOOD_DARK); // ledge
  v.box(-1, 7, 0, 9, 9, 1, '#efe6d6'); // board
  // Frame edging around the board.
  v.box(-1, 7, 1, 9, 1, 1, WOOD);
  v.box(-1, 15, 1, 9, 1, 1, WOOD);
  v.box(-1, 7, 1, 1, 9, 1, WOOD);
  v.box(7, 7, 1, 1, 9, 1, WOOD);
}

function usePictureGeometry(grid: string | null) {
  return useMemo(() => {
    if (!grid) return null;
    const v = new Vox();
    let any = false;
    for (let i = 0; i < GRID * GRID; i++) {
      const ch = grid[i];
      if (!ch || ch === '.') continue;
      const color = PALETTE[Number(ch)];
      if (!color) continue;
      any = true;
      v.set(i % GRID, GRID - 1 - Math.floor(i / GRID), 0, color);
    }
    return any ? v.build(1, 0) : null;
  }, [grid]);
}

/**
 * The daily-drawing easel. Faces the isometric camera; shows the partner's
 * drawing (as flat voxels) on the board, or an empty canvas if none today.
 */
export function Easel({ position }: { position: [number, number, number] }) {
  const partnerGrid = useDrawingStore((s) => s.partnerGrid);
  const picture = usePictureGeometry(partnerGrid);

  return (
    <group position={position} rotation={[0, Math.PI / 4, 0]}>
      <VoxMesh build={buildEasel} scale={0.09} />
      {picture && (
        <mesh
          geometry={picture}
          material={voxelMaterial}
          position={[0.0, 0.66, 0.19]}
          scale={[0.045, 0.045, 0.045]}
        />
      )}
    </group>
  );
}
