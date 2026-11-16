// Webhook credit grants (functions/src/credit-grants.ts) must match the pricing catalogue.
import { test, expect } from '@playwright/test';
import { packGrant, PACK_CREDITS, subscriptionGrant, subscriptionProfile, V4_MONTHLY_CREDITS, V4_PLAN_TIERS } from '../../functions/src/credit-grants';
import { PACK_CREDITS as CATALOGUE_PACK, PRICING_PLANS } from '@/lib/pricing';

test('grant table = catalogue (credits per plan, tiers, pack)', () => {
  for (const p of PRICING_PLANS) {
    if (p.creditsPerMonth === null) { expect(V4_MONTHLY_CREDITS[p.id]).toBeUndefined(); continue; }
    expect(V4_MONTHLY_CREDITS[p.id], p.id).toBe(p.creditsPerMonth);
    expect(V4_PLAN_TIERS[p.id] ?? null, p.id).toBe(p.planTier);
  }
  expect(PACK_CREDITS).toBe(CATALOGUE_PACK);
});

test('subscription grants: v4 only (legacy metadata → null), annual = 12 months', () => {
  expect(subscriptionGrant({ planId: 'particular', interval: 'monthly' }, 'activation')).toMatchObject({ credits: 60, tipo: 'grant_subscription' });
  expect(subscriptionGrant({ planId: 'abogado', interval: 'annual' }, 'renewal')!.credits).toBe(7200);
  expect(subscriptionGrant({ planType: 'Autoservicio', userId: 'u' }, 'activation')).toBeNull();   // legacy 100-credit path
  expect(subscriptionGrant({ planId: 'empresa-medida' }, 'activation')).toBeNull();
  expect(subscriptionGrant(null, 'renewal')).toBeNull();
  expect(subscriptionProfile({ planId: 'empresa-negocio', country: 'ES', interval: 'monthly' }))
    .toEqual({ planTier: 'EmpresaNegocio', billingPlanId: 'empresa-negocio', billingCountry: 'ES', billingInterval: 'monthly' });
  expect(subscriptionProfile({ planId: 'abogado' }).planTier).toBeNull();
});

test('pack grant only for v4 pack metadata (legacy credito_topup untouched)', () => {
  expect(packGrant({ kind: 'pack', planId: 'pack30' })).toMatchObject({ credits: 30, tipo: 'grant_pack' });
  expect(packGrant({ documentType: 'credito_topup' })).toBeNull();
  expect(packGrant(undefined)).toBeNull();
});
