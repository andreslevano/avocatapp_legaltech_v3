import { test, expect } from '@playwright/test';
import { parseCheckout, sessionPlan } from '@/lib/checkout';

const env = {
  STRIPE_PRICE_ABOGADO_ES_M: 'price_abo_m', STRIPE_PRICE_PARTICULAR_ES_Y: 'price_par_y',
  STRIPE_PRICE_EMPRESA_NEGOCIO_ES_M: 'price_neg', STRIPE_PRICE_PACK30_ES: 'price_pack', STRIPE_PRICE_ESTUDIANTE_ES_M: 'bogus',
};

test('parseCheckout validates item, country and interval; never accepts a price id', () => {
  expect(parseCheckout({ item: 'abogado', country: 'es', interval: 'monthly' })).toEqual({ item: 'abogado', country: 'ES', interval: 'monthly' });
  expect(parseCheckout({ item: 'pack30', country: 'CL' })).toEqual({ item: 'pack30', country: 'CL', interval: 'monthly' });
  expect(parseCheckout({ item: 'price_123', country: 'ES' })).toBeNull();
  expect(parseCheckout({ item: 'abogado', country: 'US' })).toBeNull();
});

test('sessionPlan: env ids only; trial for Abogado; Empresa tier; pack; legacy-compatible metadata', () => {
  const abo = sessionPlan({ item: 'abogado', country: 'ES', interval: 'monthly' }, 'u1', env)!;
  expect(abo).toMatchObject({ mode: 'subscription', priceId: 'price_abo_m', trialDays: 14 });
  expect(abo.metadata).toMatchObject({ userId: 'u1', planType: 'Abogados', planId: 'abogado', planTier: '', credits: '600' });
  expect(sessionPlan({ item: 'abogado', country: 'ES', interval: 'annual' }, 'u1', env)).toBeNull();
  expect(sessionPlan({ item: 'particular', country: 'ES', interval: 'annual' }, 'u1', env)!.metadata).toMatchObject({ planType: 'Autoservicio', credits: '60' });
  expect(sessionPlan({ item: 'empresa-negocio', country: 'ES', interval: 'monthly' }, 'u1', env)!.metadata)
    .toMatchObject({ planType: 'Abogados', planTier: 'EmpresaNegocio', credits: '8000' });
  expect(sessionPlan({ item: 'empresa-medida', country: 'ES', interval: 'monthly' }, 'u1', env)).toBeNull();
  expect(sessionPlan({ item: 'estudiante', country: 'ES', interval: 'monthly' }, 'u1', env)).toBeNull();   // not a price_ id
  expect(sessionPlan({ item: 'abogado', country: 'CL', interval: 'monthly' }, 'u1', env)).toBeNull();
  expect(sessionPlan({ item: 'pack30', country: 'ES', interval: 'monthly' }, 'u1', env)).toMatchObject({
    mode: 'payment', priceId: 'price_pack', metadata: { kind: 'pack', credits: '30', userId: 'u1' },
  });
});
