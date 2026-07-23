// Row shapes for the tables defined in supabase/schema.sql. Kept deliberately
// small — only the columns the client actually reads.
import type { SignalType } from '@/copy';

export interface Couple {
  id: string;
  invite_code: string;
  member_a: string;
  member_b: string | null;
  created_at: string;
}

export interface SignalRow {
  id: string;
  couple_id: string;
  from_user: string;
  type: SignalType;
  created_at: string;
  resolved_at: string | null;
}

export interface ResponseRow {
  id: string;
  signal_id: string;
  from_user: string;
  choice: string;
  created_at: string;
}

export interface DrawingRow {
  id: string;
  couple_id: string;
  from_user: string;
  day: string;
  grid: string;
  created_at: string;
  updated_at: string;
}
