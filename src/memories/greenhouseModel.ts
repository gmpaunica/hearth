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

export function findBayForHomeDate(memories: GreenhouseMemory[], homeDate: string | null | undefined) {
  if (!homeDate) return 0;
  const index = memories.findIndex((memory) => memory.home_date === homeDate);
  return index < 0 ? 0 : Math.floor(index / MEMORIES_PER_GREENHOUSE_BAY);
}

export function greenhouseBayDateRange(memories: GreenhouseMemory[], bayIndex: number) {
  const bay = memoriesForBay(memories, bayIndex);
  if (bay.length === 0) return null;
  return { newest: bay[0].home_date, oldest: bay.at(-1)!.home_date };
}
