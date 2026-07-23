import { type ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';

import { GRID, PALETTE, useDrawingStore } from '@/state/drawingStore';
import { VoxMesh } from '../VoxMesh';
import { Vox, voxelMaterial } from '../voxel';

const WOOD = '#8a5a33';
const S = 0.11; // frame voxel size
const FW = 12; // frame width/height in voxels

// A flat framed canvas that hangs on the wall, facing the camera (+z).
function buildFrame(v: Vox) {
  v.box(1, 1, 0, FW - 2, FW - 2, 1, '#efe6d6'); // cream canvas backing
  v.box(0, 0, 1, FW, 1, 1, WOOD); // bottom rail
  v.box(0, FW - 1, 1, FW, 1, 1, WOOD); // top rail
  v.box(0, 0, 1, 1, FW, 1, WOOD); // left rail
  v.box(FW - 1, 0, 1, 1, FW, 1, WOOD); // right rail
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
    // Fit the GRID-wide picture into the (FW-2)-voxel canvas.
    return any ? v.build(((FW - 2) * S) / GRID, 0) : null;
  }, [grid]);
}

/**
 * The daily-drawing frame on the wall. Shows the partner's drawing (as flat
 * voxels) or a blank canvas. Tapping it opens the note panel. `position` is the
 * world min-corner of the frame.
 */
export function Easel({ position }: { position: [number, number, number] }) {
  const partnerGrid = useDrawingStore((s) => s.partnerGrid);
  const picture = usePictureGeometry(partnerGrid);

  const open = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useDrawingStore.getState().requestOpen();
  };

  return (
    <group position={position} onClick={open}>
      <VoxMesh build={buildFrame} scale={S} />
      {picture && (
        <mesh
          geometry={picture}
          material={voxelMaterial}
          position={[1 * S, 1 * S, 1.02 * S]}
        />
      )}
    </group>
  );
}
