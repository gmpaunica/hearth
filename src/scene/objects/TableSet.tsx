import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';

// Table local grid: 6 x 6 top, pedestal base.
function buildTable(v: Vox) {
  v.box(2, 0, 2, 2, 3, 2, room.woodDark);
  v.box(0, 3, 0, 6, 1, 6, room.tableWood);
  v.remove(0, 3, 0); v.remove(5, 3, 0); v.remove(0, 3, 5); v.remove(5, 3, 5);
  // Vase with a pink flower.
  v.set(2, 4, 2, '#b06a3f');
  v.set(2, 5, 2, '#d96a8a');
}

// Chair local grid: 4 x 4 seat; backrest on the +z side.
function buildChair(v: Vox) {
  v.box(0, 1, 0, 4, 1, 4, room.tableWood);
  // Legs.
  v.set(0, 0, 0, room.woodDark);
  v.set(3, 0, 0, room.woodDark);
  v.set(0, 0, 3, room.woodDark);
  v.set(3, 0, 3, room.woodDark);
  // Backrest posts + rail.
  v.box(0, 2, 3, 1, 2, 1, room.woodDark);
  v.box(3, 2, 3, 1, 2, 1, room.woodDark);
  v.box(0, 4, 3, 4, 1, 1, room.tableWood);
}

/** Round-ish table with two chairs facing each other across it. */
export function TableSet({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group>
      <VoxMesh build={buildTable} scale={0.25} position={[x, y, z]} />
      {/* Front chair (faces the table, backrest toward camera) */}
      <VoxMesh build={buildChair} scale={0.25} position={[x + 0.25, y, z + 1.7]} />
      {/* Back chair (rotated 180°, so its backrest faces the wall) */}
      <VoxMesh
        build={buildChair}
        scale={0.25}
        position={[x + 1.25, y, z - 0.7]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}
