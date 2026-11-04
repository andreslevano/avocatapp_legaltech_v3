// Contract intelligence (F0 + F3) — feature gate. Plan: docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md
// Pure module, client-safe.

import { inPreview, type Identity } from '@/lib/preview';

export const CONTRACTS_PLAN = 'Abogados';   // single constant per feature (shared rules)
/** Preview allow-list while the feature is being tested. Empty = every Abogados user. */
export const CONTRACTS_PREVIEW_EMAILS: string[] = ['andres.levano@mobilityforwork.es'];

/** Plan + preview (named emails, or a verified email at a PREVIEW_DOMAINS organisation — src/lib/preview.ts). */
export function canUseContracts(plan: string | null | undefined, who: Identity): boolean {
  if (plan !== CONTRACTS_PLAN) return false;
  if (CONTRACTS_PREVIEW_EMAILS.length === 0) return true;
  return inPreview(who, CONTRACTS_PREVIEW_EMAILS);
}
