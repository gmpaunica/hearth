export const MOMENT_SHEET_FLICK_VELOCITY = 650;
export const MOMENT_SHEET_PROJECTION_SECONDS = 0.18;

export function clampMomentSheetY(value: number, expandedY: number, dockedY: number): number {
  'worklet';
  return Math.max(expandedY, Math.min(dockedY, value));
}

export function momentSheetProgress(value: number, expandedY: number, dockedY: number): number {
  'worklet';
  return Math.max(0, Math.min(1, (dockedY - value) / Math.max(1, dockedY - expandedY)));
}

/** Fast directional flicks win. Otherwise, settle from the projected position
 * relative to the midpoint between the two measured snap points. */
export function resolveMomentSheetExpanded(
  value: number,
  velocityY: number,
  expandedY: number,
  dockedY: number,
): boolean {
  'worklet';
  if (velocityY < -MOMENT_SHEET_FLICK_VELOCITY) return true;
  if (velocityY > MOMENT_SHEET_FLICK_VELOCITY) return false;
  const projected = clampMomentSheetY(
    value + velocityY * MOMENT_SHEET_PROJECTION_SECONDS,
    expandedY,
    dockedY,
  );
  return projected < (expandedY + dockedY) / 2;
}
