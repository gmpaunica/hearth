import { type ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';

import { drawingFallback } from '@/state/drawingCodec';
import { PALETTE, useDrawingStore } from '@/state/drawingStore';
import { VoxMesh } from '../VoxMesh';
import { Vox, voxelMaterial } from '../voxel';

const WOOD = '#8a5a33';
const WOOD_DARK = '#5f3925';
const WOOD_LIGHT = '#b57945';
const LINER = '#d4a65d';
const S = 0.125;
const FW = 16;

// A layered gallery frame that hangs on the wall, facing the camera (+z).
function buildFrame(v: Vox) {
  // Dark backing and a warm mat give even sparse daily drawings presence.
  v.box(0, 0, 0, FW, FW, 1, WOOD_DARK);
  v.box(1, 1, 1, FW - 2, FW - 2, 1, '#f2e5cf');

  // Alternating moulding catches the deterministic directional shading.
  v.box(0, 0, 1, FW, 1, 1, WOOD_DARK);
  v.box(0, FW - 1, 1, FW, 1, 1, WOOD_LIGHT);
  v.box(0, 0, 1, 1, FW, 1, WOOD_DARK);
  v.box(FW - 1, 0, 1, 1, FW, 1, WOOD);
  for (let i = 1; i < FW - 1; i++) {
    v.set(i, 0, 2, i % 2 === 0 ? WOOD : WOOD_LIGHT);
    v.set(i, FW - 1, 2, i % 2 === 0 ? WOOD_LIGHT : WOOD);
  }

  // Golden liner and four brass pins frame the inset picture area.
  for (let i = 1; i < FW - 1; i++) {
    v.set(i, 1, 2, LINER);
    v.set(i, FW - 2, 2, LINER);
    v.set(1, i, 2, LINER);
    v.set(FW - 2, i, 2, LINER);
  }
  for (const [x, y] of [
    [0, 0],
    [FW - 1, 0],
    [0, FW - 1],
    [FW - 1, FW - 1],
  ] as const) {
    v.set(x, y, 2, '#e4bf75');
  }

  // A tiny heart crest echoes the home's collected keepsakes.
  v.set(FW / 2 - 1, FW, 1, '#c96b5b');
  v.set(FW / 2, FW, 1, '#c96b5b');
  v.set(FW / 2 - 1, FW + 1, 1, WOOD_LIGHT);
}

function usePictureGeometry(grid: string | null) {
  return useMemo(() => {
    if (!grid) return null;
    const raster = drawingFallback(grid);
    const v = new Vox();
    let any = false;
    for (let i = 0; i < raster.width * raster.height; i++) {
      const ch = raster.pixels[i];
      if (!ch || ch === '.') continue;
      const color = PALETTE[Number(ch)];
      if (!color) continue;
      any = true;
      v.set(i % raster.width, raster.height - 1 - Math.floor(i / raster.width), 0, color);
    }
    // Leave a two-voxel mat around the drawing inside the layered frame.
    return any ? v.build(((FW - 4) * S) / raster.width, 0) : null;
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
          position={[2 * S, 2 * S, 2.02 * S]}
        />
      )}
    </group>
  );
}
