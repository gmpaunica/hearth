import { memo } from 'react';
import { View } from 'react-native';

import { GRID, PALETTE } from '@/state/drawingStore';

// One row of pixels. Memoised on its string, so painting a pixel only
// re-renders the one row that changed (keeps the bigger grid smooth).
const Row = memo(function Row({ row, cell, y }: { row: string; cell: number; y: number }) {
  const cells = [];
  for (let x = 0; x < row.length; x++) {
    const ch = row[x];
    if (!ch || ch === '.') continue;
    const color = PALETTE[Number(ch)];
    if (!color) continue;
    cells.push(
      <View
        key={x}
        style={{
          position: 'absolute',
          left: x * cell,
          top: y * cell,
          width: cell + 0.6,
          height: cell + 0.6,
          backgroundColor: color,
        }}
      />,
    );
  }
  return <>{cells}</>;
});

/** Read-only render of a GRID×GRID drawing string as coloured pixels. */
export function PixelArt({ grid, size }: { grid: string; size: number }) {
  const cell = size / GRID;
  const rows = [];
  for (let y = 0; y < GRID; y++) {
    rows.push(<Row key={y} row={grid.slice(y * GRID, (y + 1) * GRID)} cell={cell} y={y} />);
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#1c140e',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      {rows}
    </View>
  );
}
