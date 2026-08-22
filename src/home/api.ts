import { supabase } from '@/lib/supabase';
import type { HomeApplyResult, HomeOperation, HomeSnapshot } from './types';

export async function fetchHomeSnapshot(): Promise<HomeSnapshot> {
  const { data, error } = await supabase.rpc('get_home_snapshot');
  if (error) throw error;
  return data as HomeSnapshot;
}

export async function applyHomeEdit(
  requestId: string,
  expectedRevision: number,
  catalogVersion: string,
  operations: readonly HomeOperation[],
): Promise<HomeApplyResult> {
  const { data, error } = await supabase.rpc('apply_home_edit', {
    request_id: requestId,
    expected_revision: expectedRevision,
    catalog_version: catalogVersion,
    operations,
  });
  if (error) throw error;
  return data as unknown as HomeApplyResult;
}
