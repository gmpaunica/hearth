export interface DrawingPoint {
  x: number;
  y: number;
}

export interface PaintedStroke {
  pixels: string;
  lastPoint: DrawingPoint | null;
}

/** Paint one frame's queued touch samples in a single raster/store update. */
export function paintRasterStroke(
  pixels: string,
  width: number,
  height: number,
  from: DrawingPoint | null,
  points: DrawingPoint[],
  cell: string,
  radius: number,
): PaintedStroke {
  if (points.length === 0 || pixels.length !== width * height) {
    return { pixels, lastPoint: from };
  }

  const next = pixels.split('');
  const brush = Math.max(0.5, radius);
  const reach = Math.ceil(brush);
  let cursor = from ?? points[0];

  const dab = (centerX: number, centerY: number) => {
    const roundedX = Math.round(centerX);
    const roundedY = Math.round(centerY);
    for (let offsetY = -reach; offsetY <= reach; offsetY++) {
      for (let offsetX = -reach; offsetX <= reach; offsetX++) {
        if (offsetX * offsetX + offsetY * offsetY > brush * brush) continue;
        const x = roundedX + offsetX;
        const y = roundedY + offsetY;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        next[y * width + x] = cell;
      }
    }
  };

  for (const point of points) {
    const deltaX = point.x - cursor.x;
    const deltaY = point.y - cursor.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(deltaX, deltaY) * 2));
    for (let step = 0; step <= steps; step++) {
      const progress = step / steps;
      dab(cursor.x + deltaX * progress, cursor.y + deltaY * progress);
    }
    cursor = point;
  }

  return { pixels: next.join(''), lastPoint: cursor };
}
