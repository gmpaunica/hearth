import { View } from 'react-native';

import { GRID, PALETTE } from '@/state/drawingStore';

/** Read-only render of a GRID×GRID drawing string as coloured pixels. */
export function PixelArt({ grid, size }: { grid: string; size: number }) {
  const cell = size / GRID;
  const pixels = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const ch = grid[i];
    if (!ch || ch === '.') continue;
    const color = PALETTE[Number(ch)];
    if (!color) continue;
    pixels.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: (i % GRID) * cell,
          top: Math.floor(i / GRID) * cell,
          width: cell + 0.5,
          height: cell + 0.5,
          backgroundColor: color,
        }}
      />,
    );
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
    >
      {pixels}
    </View>
  );
}
