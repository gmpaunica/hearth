import { room } from '@/theme/hearth';
import { VoxMesh } from '../VoxMesh';
import type { Vox } from '../voxel';
import { DailyRecordPlayer } from './MediaConsole';

// Table local grid: 6 x 6 top, stepped pedestal base.
function buildTable(v: Vox) {
  const trim = '#6a4025';
  const woodLight = '#b67a45';

  // Broad pedestal foot and a shadow apron make the small table feel stable.
  v.box(1, 0, 1, 4, 1, 4, trim);
  v.remove(1, 0, 1);
  v.remove(4, 0, 1);
  v.remove(1, 0, 4);
  v.remove(4, 0, 4);
  v.box(2, 0, 2, 2, 3, 2, room.woodDark);
  v.box(1, 2, 1, 4, 1, 4, room.woodDark);
  v.remove(1, 2, 1);
  v.remove(4, 2, 1);
  v.remove(1, 2, 4);
  v.remove(4, 2, 4);

  v.box(0, 3, 0, 6, 1, 6, room.tableWood);
  v.remove(0, 3, 0);
  v.remove(5, 3, 0);
  v.remove(0, 3, 5);
  v.remove(5, 3, 5);

  // Dark rim and lighter inset all stay at the original table height.
  for (let i = 1; i < 5; i++) {
    v.set(i, 3, 0, trim);
    v.set(i, 3, 5, trim);
    v.set(0, 3, i, trim);
    v.set(5, 3, i, trim);
  }
  v.box(1, 3, 1, 4, 1, 4, woodLight);
  v.box(2, 3, 1, 2, 1, 4, '#c28a51');

  // Two place settings and shared mugs keep the conversation destination clear.
  // The old pink centerpiece is intentionally gone; the daily record player
  // now owns the middle of the table.
  v.box(1, 4, 1, 2, 1, 1, '#f1dfc2');
  v.box(3, 4, 4, 2, 1, 1, '#ead4b4');
  v.set(1, 4, 2, '#9a6850');
  v.set(4, 4, 3, '#7f9369');
}

// Chair local grid: 4 x 4 seat; backrest on the +z side.
function buildChair(v: Vox) {
  const trim = '#6a4025';
  const cushion = '#b9ad84';

  v.box(0, 1, 0, 4, 1, 4, room.tableWood);
  // The inset colors existing seat cells, preserving the 0.4-unit seat height.
  v.box(1, 1, 0, 2, 1, 3, cushion);
  v.set(1, 1, 2, '#a59b75');
  v.box(0, 1, 0, 4, 1, 1, '#aa7040');

  for (const [x, z] of [[0, 0], [3, 0], [0, 3], [3, 3]] as const) {
    v.set(x, 0, z, trim);
  }

  // Tall ladder back with lighter crest and a small central diamond motif.
  v.box(0, 2, 3, 1, 4, 1, room.woodDark);
  v.box(3, 2, 3, 1, 4, 1, room.woodDark);
  v.box(0, 3, 3, 4, 1, 1, room.tableWood);
  v.box(0, 5, 3, 4, 1, 1, '#b67a45');
  v.set(1, 4, 3, '#d7a965');
  v.set(2, 4, 3, '#c98b50');
}

/** Round-ish table with two chairs facing each other across it. */
export function TableSet({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  const s = 0.2;
  return (
    <group>
      <VoxMesh build={buildTable} scale={s} position={[x, y, z]} />
      <DailyRecordPlayer position={[x + 0.3, y + 0.82, z + 0.32]} />
      {/* Front chair faces the table, backrest toward camera. */}
      <VoxMesh build={buildChair} scale={s} position={[x + 0.2, y, z + 1.35]} />
      {/* Back chair rotates 180 degrees so its backrest faces the wall. */}
      <VoxMesh
        build={buildChair}
        scale={s}
        position={[x + 1.0, y, z - 0.35]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}
