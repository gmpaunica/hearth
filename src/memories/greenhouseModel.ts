import type { GreenhouseMemory } from '@/daily/model';

export const MEMORIES_PER_GREENHOUSE_BAY = 4;

export function getGreenhouseBayCount(memoryCount: number) {
  const safeCount = Number.isFinite(memoryCount) ? Math.max(0, Math.floor(memoryCount)) : 0;
  return Math.max(1, Math.ceil(safeCount / MEMORIES_PER_GREENHOUSE_BAY));
}

export function getGreenhouseCapacity(memoryCount: number) {
  return getGreenhouseBayCount(memoryCount) * MEMORIES_PER_GREENHOUSE_BAY;
}

export function memoriesForBay(memories: GreenhouseMemory[], bayIndex: number) {
  const safeBay = Math.max(0, Math.floor(bayIndex));
  const start = safeBay * MEMORIES_PER_GREENHOUSE_BAY;
  return memories.slice(start, start + MEMORIES_PER_GREENHOUSE_BAY);
}
