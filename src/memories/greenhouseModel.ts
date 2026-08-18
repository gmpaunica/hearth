export const MEMORIES_PER_GREENHOUSE_BAY = 4;
export const MAX_GREENHOUSE_PREVIEW_MEMORIES = 12;

export type GreenhouseMediaKind = 'image' | 'video';

/**
 * UI-ready memory shape for the future media-backed collection. Prototype
 * entries never contain a media URI and are intentionally not persisted.
 */
export interface GreenhouseMemory {
  id: string;
  kind: GreenhouseMediaKind;
  caption: string;
  capturedAt: string;
  mediaUri?: string;
  prototype: boolean;
}

export function getGreenhouseBayCount(memoryCount: number) {
  const safeCount = Number.isFinite(memoryCount) ? Math.max(0, Math.floor(memoryCount)) : 0;
  return Math.max(1, Math.ceil(safeCount / MEMORIES_PER_GREENHOUSE_BAY));
}

export function getGreenhouseCapacity(memoryCount: number) {
  return getGreenhouseBayCount(memoryCount) * MEMORIES_PER_GREENHOUSE_BAY;
}

export function createGreenhousePreviewMemory(index: number): GreenhouseMemory {
  const number = Math.max(1, Math.floor(index) + 1);
  return {
    id: `greenhouse-preview-${number}`,
    kind: number % 3 === 0 ? 'video' : 'image',
    caption: `Memory space ${number}`,
    capturedAt: '',
    prototype: true,
  };
}
