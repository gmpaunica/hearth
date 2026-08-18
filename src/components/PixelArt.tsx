import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { decodeDrawingGrid } from '@/state/drawingCodec';
import { PALETTE } from '@/state/drawingStore';

interface RowProps {
  row: string;
  cellWidth: number;
  cellHeight: number;
  y: number;
}

// Merge adjacent same-colour cells into rounded horizontal runs. Sparse rows
// stay cheap, while strokes read as continuous marks instead of tiled dots.
const Row = memo(function Row({ row, cellWidth, cellHeight, y }: RowProps) {
  const runs = [];
  for (let x = 0; x < row.length; ) {
    const cell = row[x];
    let end = x + 1;
    while (end < row.length && row[end] === cell) end += 1;
    const color = cell === '.' ? null : PALETTE[Number(cell)];
    if (color) {
      runs.push(
        <View
          key={x}
          style={{
            position: 'absolute',
            left: x * cellWidth,
            top: y * cellHeight,
            width: (end - x) * cellWidth + 0.5,
            height: cellHeight + 0.5,
            backgroundColor: color,
            borderRadius: Math.max(0.6, Math.min(cellWidth, cellHeight) * 0.48),
          }}
        />,
      );
    }
    x = end;
  }
  return <>{runs}</>;
});

interface PixelArtProps {
  grid: string;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

/** Render legacy square drawings or the versioned 4:5 portrait payload. */
export function PixelArt({
  grid,
  size,
  width,
  height,
  borderRadius = 17,
  backgroundColor = '#fff6e8',
}: PixelArtProps) {
  const raster = useMemo(() => decodeDrawingGrid(grid), [grid]);
  const displayWidth = width ?? size ?? 0;
  const displayHeight = height ?? size ?? displayWidth * (raster.height / raster.width);
  const cellWidth = displayWidth / raster.width;
  const cellHeight = displayHeight / raster.height;
  const rows = [];
  for (let y = 0; y < raster.height; y++) {
    rows.push(
      <Row
        key={y}
        row={raster.pixels.slice(y * raster.width, (y + 1) * raster.width)}
        cellWidth={cellWidth}
        cellHeight={cellHeight}
        y={y}
      />,
    );
  }
  return (
    <View
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundColor,
        borderRadius,
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      {rows}
    </View>
  );
}
