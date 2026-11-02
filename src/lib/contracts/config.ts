// Contract intelligence (F0 + F3) — feature gate. Plan: docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md
// Pure module, client-safe.

export const CONTRACTS_PLAN = 'Abogados';   // single constant per feature (shared rules)
/** Preview allow-list while the feature is being tested. Empty = every Abogados user. */
export const CONTRACTS_PREVIEW_EMAILS: string[] = ['andres.levano@mobilityforwork.es'];

export function canUseContracts(plan: string | null | undefined, email: string | null | undefined): boolean {
  if (plan !== CONTRACTS_PLAN) return false;
  if (CONTRACTS_PREVIEW_EMAILS.length === 0) return true;
  return !!email && CONTRACTS_PREVIEW_EMAILS.includes(email.trim().toLowerCase());
}
