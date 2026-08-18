import { FIREPLACE_NEEDS, type FireplaceNeedId } from '@/copy';

// Fireplace needs are attached to the existing signal through the response
// event stream. This keeps F1 backwards-compatible with the installed preview
// runtime and current Supabase schema. The prefix makes these detail events
// impossible to confuse with a partner's human-readable response.
const FIREPLACE_NEED_PREFIX = '__hearth_fireplace_need_v1__:';
const validNeeds = new Set<string>(FIREPLACE_NEEDS.map((need) => need.id));

export function encodeFireplaceNeed(need: FireplaceNeedId): string {
  return `${FIREPLACE_NEED_PREFIX}${need}`;
}

export function decodeFireplaceNeed(choice: string): FireplaceNeedId | null {
  if (!choice.startsWith(FIREPLACE_NEED_PREFIX)) return null;
  const need = choice.slice(FIREPLACE_NEED_PREFIX.length);
  return validNeeds.has(need) ? (need as FireplaceNeedId) : null;
}
