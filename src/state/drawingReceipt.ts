export interface DrawingReceiptSource {
  id: string;
  updated_at: string;
}

/** A later edit is a new thing to check even when the database row id is reused. */
export function drawingFingerprint(row: DrawingReceiptSource): string {
  return `${row.id}:${row.updated_at}`;
}

export function drawingWasSeen(
  savedFingerprint: string | null,
  row: DrawingReceiptSource | null,
): boolean {
  return !row || savedFingerprint === drawingFingerprint(row);
}
