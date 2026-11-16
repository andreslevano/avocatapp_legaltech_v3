// Precios v4 credit grants for the Stripe webhook. Pure (no Firebase) so it is unit-tested from the
// app repo (tests/unit/credit-grants.node.spec.ts), which also checks this table against the
// catalogue in src/lib/pricing.ts (functions can't import from src/).
//
// Legacy paths are NOT handled here and stay as they were: Autoservicio subscriptions without a
// planId (100 credits per cycle) and the €10 "credito_topup" purchase.

export const V4_MONTHLY_CREDITS: Record<string, number> = {
  estudiante: 120,
  particular: 60,
  abogado: 600,
  'empresa-inicial': 2000,
  'empresa-negocio': 8000,
};
export const V4_PLAN_TIERS: Record<string, string> = {
  'empresa-inicial': 'EmpresaInicial',
  'empresa-negocio': 'EmpresaNegocio',
};
export const PACK_CREDITS = 30;

export interface Grant {
  credits: number;
  tipo: 'grant_subscription' | 'grant_pack';
  descripcion: string;
}

/** Credits for one billing period of a v4 subscription. Annual pays 12 months at once (TODO: monthly). */
export function subscriptionGrant(meta: Record<string, string | undefined> | null | undefined, reason: 'activation' | 'renewal'): Grant | null {
  const planId = meta?.planId;
  if (!planId || !(planId in V4_MONTHLY_CREDITS)) return null;
  const months = meta?.interval === 'annual' ? 12 : 1;
  const credits = V4_MONTHLY_CREDITS[planId] * months;
  return {
    credits,
    tipo: 'grant_subscription',
    descripcion: `${reason === 'activation' ? 'Activación' : 'Renovación'} plan ${planId}${months > 1 ? ' (anual, 12 meses)' : ''}`,
  };
}

/** Fields written on users/{uid} when a v4 subscription activates (plan stays the legacy value). */
export function subscriptionProfile(meta: Record<string, string | undefined>): Record<string, string | null> {
  return {
    planTier: V4_PLAN_TIERS[meta.planId ?? ''] ?? null,
    billingPlanId: meta.planId ?? null,
    billingCountry: meta.country ?? null,
    billingInterval: meta.interval ?? null,
  };
}

export function packGrant(meta: Record<string, string | undefined> | null | undefined): Grant | null {
  if (meta?.kind !== 'pack' || meta.planId !== 'pack30') return null;
  return { credits: PACK_CREDITS, tipo: 'grant_pack', descripcion: `Pack de ${PACK_CREDITS} créditos` };
}
