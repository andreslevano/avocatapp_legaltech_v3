// Precios v4 catalogue (src/lib/pricing.ts).
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import {
  allStripeEnvNames, COMPARISON, COUNTRY_ORDER, creditEquivalents, effectiveStatus, estimate, formatPrice, LADDER,
  localize, packPricePerCredit, PRICES, pricePerCredit, PRICING_PLANS, pricingPlanFromParam, SIGNATURE, taxLine,
} from '@/lib/pricing';
import { PLANS, planFromParam } from '@/lib/plans';

test('annual = 10 × monthly on every plan and country (a Medida: contract)', () => {
  for (const c of COUNTRY_ORDER) for (const id of LADDER) {
    const p = PRICES[c][id];
    if (id === 'empresa-medida') { expect(p.annual).toBeNull(); expect(p.from).toBe(true); continue; }
    expect(p.annual).toBeCloseTo(p.monthly * 10, 6);
  }
});

test('price per credit falls along the paid ladder; the pack is the dearest (Estudiante: student exception)', () => {
  // D1 says "falls at every step"; with the D5 prices Estudiante is the cheapest per credit everywhere
  // (student pricing), so it is excluded here and reported. Net of tax for B2C, net for B2B.
  for (const c of COUNTRY_ORDER) {
    const ladder = (['particular', 'abogado', 'empresa-inicial', 'empresa-negocio'] as const).map(id => pricePerCredit(id, c)!);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i], `${c} step ${i}`).toBeLessThan(ladder[i - 1]);
    const pack = packPricePerCredit(c);
    for (const id of LADDER) { const ppc = pricePerCredit(id, c); if (ppc !== null) expect(pack, `${c} pack vs ${id}`).toBeGreaterThan(ppc); }
  }
});

test('monthly signature sends never decrease along the ladder', () => {
  const sends = LADDER.map(id => SIGNATURE.contractSends.includes(id) ? Infinity : SIGNATURE.monthlySends[id] ?? 0);
  for (let i = 1; i < sends.length; i++) expect(sends[i]).toBeGreaterThanOrEqual(sends[i - 1]);
  expect(SIGNATURE.monthlySends.estudiante).toBeNull();
});

test('locale formatting per country (round prices, local currency, never USD)', () => {
  expect(formatPrice('ES', 6.9)).toBe('6,90 €');
  expect(formatPrice('ES', 1790)).toBe('1.790 €');
  expect(formatPrice('ES', 69)).toBe('69 €');
  expect(formatPrice('CL', 104990)).toBe('$104.990');
  expect(formatPrice('MX', 1790)).toBe('$1,790');
  expect(formatPrice('CO', 309000)).toMatch(/^\$\s?309\.000$/);
  expect(formatPrice('PE', 14.9)).toMatch(/^S\/\s?14[.,]90$/);
  for (const c of COUNTRY_ORDER) expect(formatPrice(c, 1000)).not.toMatch(/USD|US\$/);
  expect(taxLine('ES', false)).toBe('IVA incluido');
  expect(taxLine('PE', true)).toBe('IGV no incluido');
});

test('every comparison row has a value for every plan; statuses resolve with the Firma flag', () => {
  for (const g of COMPARISON) for (const r of g.rows) for (const id of LADDER) expect(r.values[id], `${g.id}/${r.id}/${id}`).toBeDefined();
  expect(effectiveStatus('signature', false)).toBe('soon');
  expect(effectiveStatus('signature', true)).toBe('live');
  expect(effectiveStatus('pilot', true)).toBe('pilot');
});

test('estimator: deterministic recommendation', () => {
  expect(estimate({ consultas: 20, documentos: 5, analisis: 2, personas: 1 })).toMatchObject({ credits: 45, planId: 'particular' });
  expect(estimate({ consultas: 200, documentos: 60, analisis: 20, personas: 1 })).toMatchObject({ credits: 480, planId: 'abogado' });
  expect(estimate({ consultas: 900, documentos: 0, analisis: 0, personas: 1 }).planId).toBe('empresa-inicial');
  expect(estimate({ consultas: 10, documentos: 0, analisis: 0, personas: 2 }).planId).toBe('empresa-inicial');
  expect(estimate({ consultas: 10, documentos: 0, analisis: 0, personas: 5 }).planId).toBe('empresa-negocio');
  expect(estimate({ consultas: 10, documentos: 0, analisis: 0, personas: 30 }).planId).toBe('empresa-medida');
  expect(estimate({ consultas: 50, documentos: 10, analisis: 0, personas: 1, estudiante: true }).planId).toBe('estudiante');
  expect(estimate({ consultas: -5, documentos: NaN, analisis: 1e12, personas: 0 }).credits).toBe(500_000);
  expect(creditEquivalents(600)).toEqual({ consultas: 600, documentos: 200 });
});

test('Stripe env names: plan × country × interval + packs, never invented ids', () => {
  const env = allStripeEnvNames();
  expect(env).toHaveLength(5 * (5 * 2 + 1));
  expect(env.map(e => e.name)).toContain('STRIPE_PRICE_ABOGADO_ES_M');
  expect(env.map(e => e.name)).toContain('STRIPE_PRICE_PACK30_PE');
  expect(env.find(e => e.name === 'STRIPE_PRICE_EMPRESA_NEGOCIO_CL_Y')).toMatchObject({ amount: 2899900, currency: 'CLP', taxIncluded: false });
  expect(PRICING_PLANS.find(p => p.id === 'empresa-medida')!.stripeKey).toBeNull();
});

test('params and legacy plans.ts exports', () => {
  expect(pricingPlanFromParam('Particulares')).toBe('particular');
  expect(pricingPlanFromParam('negocio')).toBe('empresa-negocio');
  expect(planFromParam('empresa-negocio')).toBe('Abogados');
  expect(planFromParam('particular')).toBe('Autoservicio');
  expect(PLANS.abogados).toMatchObject({ price: 69, unit: '/mes', taxIncluded: false });
  expect(PLANS.particulares).toMatchObject({ price: 9.9, taxIncluded: true });
});

test('es-419 wording', () => {
  expect(localize('Para despachos y Despachos', 'CL')).toBe('Para estudios jurídicos y Estudios jurídicos');
  expect(localize('despacho', 'ES')).toBe('despacho');
});

test('no public string still advertises the old prices', () => {
  const root = resolve(__dirname, '../../src');
  const files: string[] = [];
  const walk = (d: string) => readdirSync(d).forEach(f => {
    const p = join(d, f);
    if (/ 2(\.|$)|\.disabled|e2e/.test(p)) return;
    if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|json)$/.test(f)) files.push(p);
  });
  ['app/(public)', 'components/landing', 'components/auth', 'components/pricing', 'components/layout', 'lib/pricing.ts', 'lib/plans.ts']
    .map(x => join(root, x)).forEach(p => { try { statSync(p).isDirectory() ? walk(p) : files.push(p); } catch { /* not created yet */ } });
  const bad = /10\s?€\s?\/\s?escrito|3\s?€\s?\/\s?escrito|\b75\s?€|€\s?75\b|€75|€\s?50\s?\/\s?mes|50\s?€\s?\/\s?mes/;
  const hits = files.filter(f => bad.test(readFileSync(f, 'utf8'))).map(f => f.replace(root, 'src'));
  expect(hits).toEqual([]);
});

test.describe('availability, CTA and country', () => {
  const { availabilityFrom, ctaFor, resolveCountryFrom } = require('@/lib/pricing') as typeof import('@/lib/pricing');
  const env = { STRIPE_PRICE_ABOGADO_ES_M: 'price_1', STRIPE_PRICE_PARTICULAR_ES_M: 'price_2', STRIPE_PRICE_PACK30_ES: 'price_3', STRIPE_PRICE_ESTUDIANTE_ES_Y: 'nope' };

  test('ids present → checkout; missing → waitlist / demo / sales', () => {
    const a = availabilityFrom(env);
    expect(a.plans.ES.abogado).toEqual({ monthly: true, annual: false });
    expect(a.plans.ES.estudiante).toEqual({ monthly: false, annual: false });   // not a price_ id
    expect(a.pack).toMatchObject({ ES: true, CL: false });
    expect(a.signatureLive).toBe(false);
    expect(availabilityFrom({ SIGNATURE_PROVIDER_LIVE: 'true' }).signatureLive).toBe(true);
    expect(ctaFor('abogado', 'ES', 'monthly', a)).toMatchObject({ kind: 'checkout', label: 'Probar 14 días gratis', href: '/signup?plan=abogado&pais=es&periodo=mensual' });
    expect(ctaFor('abogado', 'ES', 'annual', a).kind).toBe('waitlist');
    expect(ctaFor('abogado', 'CL', 'monthly', a)).toMatchObject({ kind: 'waitlist', label: 'Avísame cuando esté disponible' });
    expect(ctaFor('empresa-inicial', 'ES', 'monthly', a)).toMatchObject({ kind: 'contact', label: 'Solicitar demo' });
    expect(ctaFor('empresa-medida', 'ES', 'monthly', a)).toMatchObject({ kind: 'contact', label: 'Hablar con ventas' });
  });

  test('country resolution order', () => {
    expect(resolveCountryFrom({ param: 'cl', cookie: 'MX', headers: { 'cf-ipcountry': 'CO' } })).toBe('CL');
    expect(resolveCountryFrom({ param: 'us', cookie: 'mx' })).toBe('MX');
    expect(resolveCountryFrom({ headers: { 'cf-ipcountry': 'CO', 'accept-language': 'es-PE' } })).toBe('CO');
    expect(resolveCountryFrom({ headers: { 'accept-language': 'en-US,es-PE;q=0.8' } })).toBe('PE');
    expect(resolveCountryFrom({ headers: { 'accept-language': 'fr-FR' } })).toBe('ES');
    expect(resolveCountryFrom({})).toBe('ES');
  });
});
