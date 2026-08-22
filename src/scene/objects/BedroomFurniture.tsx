import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

function buildBedsideTable(v: Vox) {
  v.box(0, 0, 0, 4, 3, 3, '#754830');
  v.box(-1, 3, -1, 6, 1, 5, '#9b6041');
  v.box(1, 1, 3, 2, 1, 1, '#c58d63');
  v.box(1, 4, 1, 2, 2, 2, '#e6c8aa');
  v.set(1, 6, 1, '#ffc977');
}

function buildPaneledWardrobe(v: Vox) {
  v.box(0, 0, 0, 5, 11, 4, '#75472f');
  v.box(-1, 11, -1, 7, 1, 6, '#955a3b');
  v.box(1, 1, 4, 1, 8, 1, '#9e6549');
  v.box(3, 1, 4, 1, 8, 1, '#9e6549');
  v.box(2, 1, 4, 1, 8, 1, '#5f3b2d');
  v.set(1, 5, 5, '#dfb26e');
  v.set(3, 5, 5, '#dfb26e');
  v.box(0, 0, 4, 5, 1, 1, '#5e392b');
}

export function BedsideTable({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildBedsideTable} scale={0.18} position={position} />;
}

export function PaneledWardrobe({ position }: { position: [number, number, number] }) {
  return <VoxMesh build={buildPaneledWardrobe} scale={0.2} position={position} />;
}

