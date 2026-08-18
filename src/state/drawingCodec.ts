export const FALLBACK_SIZE = 64;
export const PORTRAIT_WIDTH = 128;
export const PORTRAIT_HEIGHT = 160;
export const DRAWING_TITLE_MAX_LENGTH = 48;

const FALLBACK_LENGTH = FALLBACK_SIZE * FALLBACK_SIZE;
const PORTRAIT_LENGTH = PORTRAIT_WIDTH * PORTRAIT_HEIGHT;
const PORTRAIT_MARKER = '~hearth-drawing:v1:128x160~';
const TITLE_MARKER = '~title~';
const CELL_PATTERN = /^[.0-7]+$/;

export const EMPTY_FALLBACK_GRID = '.'.repeat(FALLBACK_LENGTH);
export const EMPTY_PORTRAIT_GRID = '.'.repeat(PORTRAIT_LENGTH);

export interface DrawingRaster {
  width: number;
  height: number;
  pixels: string;
}

function validCells(value: string, length: number): boolean {
  return value.length === length && CELL_PATTERN.test(value);
}

export function normalizeDrawingTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, DRAWING_TITLE_MAX_LENGTH);
}

/**
 * Fit the 4:5 portrait into the square legacy canvas, preserving the entire
 * drawing. Non-empty samples win so extra-fine marks survive downsampling.
 */
export function downsamplePortraitToFallback(pixels: string): string {
  if (!validCells(pixels, PORTRAIT_LENGTH)) return EMPTY_FALLBACK_GRID;

  const output = EMPTY_FALLBACK_GRID.split('');
  const fittedWidth = Math.round((FALLBACK_SIZE * PORTRAIT_WIDTH) / PORTRAIT_HEIGHT);
  const offsetX = Math.floor((FALLBACK_SIZE - fittedWidth) / 2);

  for (let targetY = 0; targetY < FALLBACK_SIZE; targetY++) {
    const sourceY0 = Math.floor((targetY * PORTRAIT_HEIGHT) / FALLBACK_SIZE);
    const sourceY1 = Math.max(
      sourceY0 + 1,
      Math.ceil(((targetY + 1) * PORTRAIT_HEIGHT) / FALLBACK_SIZE),
    );
    for (let fittedX = 0; fittedX < fittedWidth; fittedX++) {
      const sourceX0 = Math.floor((fittedX * PORTRAIT_WIDTH) / fittedWidth);
      const sourceX1 = Math.max(
        sourceX0 + 1,
        Math.ceil(((fittedX + 1) * PORTRAIT_WIDTH) / fittedWidth),
      );
      const counts = new Array<number>(8).fill(0);
      for (let sourceY = sourceY0; sourceY < sourceY1; sourceY++) {
        for (let sourceX = sourceX0; sourceX < sourceX1; sourceX++) {
          const cell = pixels[sourceY * PORTRAIT_WIDTH + sourceX];
          if (cell !== '.') counts[Number(cell)] += 1;
        }
      }
      let selected = -1;
      let selectedCount = 0;
      for (let color = 0; color < counts.length; color++) {
        if (counts[color] > selectedCount) {
          selected = color;
          selectedCount = counts[color];
        }
      }
      if (selected >= 0) {
        output[targetY * FALLBACK_SIZE + offsetX + fittedX] = String(selected);
      }
    }
  }
  return output.join('');
}

/**
 * New rows begin with a complete 64x64 grid. Clients that predate the marker
 * still render those first 4096 cells, while current clients read the portrait.
 */
export function encodeDrawingGrid(pixels: string, title = ''): string {
  if (!validCells(pixels, PORTRAIT_LENGTH)) {
    throw new Error('A drawing payload must be a 128x160 Hearth raster.');
  }
  const normalizedTitle = normalizeDrawingTitle(title);
  const titlePayload = normalizedTitle
    ? `${TITLE_MARKER}${encodeURIComponent(normalizedTitle)}`
    : '';
  return `${downsamplePortraitToFallback(pixels)}${PORTRAIT_MARKER}${pixels}${titlePayload}`;
}

/** Read versioned portrait rows plus the two square legacy formats. */
export function decodeDrawingGrid(value: string): DrawingRaster {
  const marker = value.slice(FALLBACK_LENGTH, FALLBACK_LENGTH + PORTRAIT_MARKER.length);
  if (marker === PORTRAIT_MARKER) {
    const portraitStart = FALLBACK_LENGTH + PORTRAIT_MARKER.length;
    const pixels = value.slice(portraitStart, portraitStart + PORTRAIT_LENGTH);
    if (validCells(pixels, PORTRAIT_LENGTH)) {
      return { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT, pixels };
    }
  }

  // The editor keeps its unsent working copy as the raw portrait raster. It
  // only gains the fallback and version marker when save() writes it to the
  // database, so PixelArt must recognize this in-memory shape as well.
  if (validCells(value, PORTRAIT_LENGTH)) {
    return { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT, pixels: value };
  }

  if (validCells(value, 32 * 32)) return { width: 32, height: 32, pixels: value };
  if (validCells(value, FALLBACK_LENGTH)) {
    return { width: FALLBACK_SIZE, height: FALLBACK_SIZE, pixels: value };
  }

  // A future payload can retain the same compatibility contract.
  const fallback = value.slice(0, FALLBACK_LENGTH);
  if (validCells(fallback, FALLBACK_LENGTH)) {
    return { width: FALLBACK_SIZE, height: FALLBACK_SIZE, pixels: fallback };
  }
  return {
    width: FALLBACK_SIZE,
    height: FALLBACK_SIZE,
    pixels: EMPTY_FALLBACK_GRID,
  };
}

/** Read an optional title appended to a versioned drawing payload. */
export function decodeDrawingTitle(value: string): string {
  const titleStart =
    FALLBACK_LENGTH + PORTRAIT_MARKER.length + PORTRAIT_LENGTH;
  if (!value.startsWith(PORTRAIT_MARKER, FALLBACK_LENGTH)) return '';
  if (!value.startsWith(TITLE_MARKER, titleStart)) return '';
  try {
    return normalizeDrawingTitle(
      decodeURIComponent(value.slice(titleStart + TITLE_MARKER.length)),
    );
  } catch {
    return '';
  }
}

export function drawingFallback(value: string): DrawingRaster {
  const raster = decodeDrawingGrid(value);
  if (raster.width !== PORTRAIT_WIDTH || raster.height !== PORTRAIT_HEIGHT) return raster;
  return {
    width: FALLBACK_SIZE,
    height: FALLBACK_SIZE,
    pixels: value.slice(0, FALLBACK_LENGTH),
  };
}
