// Legacy pricing exports, now derived from the Precios v4 catalogue (src/lib/pricing.ts) — new code
// reads pricing.ts directly. Firestore stores the legacy plan names
// (`UserPlan`): 'Abogados' | 'Autoservicio' | 'Estudiantes' — never change those values.
import { SUBSCRIPTION_PRICE_IDS } from './subscription-prices';
import { planById, PRICES, TRIAL_DAYS } from './pricing';

export type PlanId = 'abogados' | 'particulares' | 'estudiantes';
export type { StoredPlan } from './pricing';
import type { StoredPlan } from './pricing';

export interface PlanDef {
  id: PlanId;
  stored: StoredPlan;
  name: string;
  /** Spain, monthly. B2C plans: IVA included; Abogado: IVA not included (see taxIncluded). */
  price: number;
  unit: '/mes' | '/escrito';
  taxIncluded: boolean;
  forWho: string;
  features: string[];
  cta: string;
  ctaHref: string;
  fine: string;
  featured: boolean;
  /** Legacy Stripe price (existing subscribers / old checkout). New checkout: /api/checkout + env ids. */
  stripePriceId: string | null;
}

// Precios v4: derived from the catalogue (src/lib/pricing.ts), Spain, monthly billing.
const es = (id: Parameters<typeof planById>[0]) => ({ plan: planById(id), price: PRICES.ES[id].monthly });
const ABO = es('abogado'), PAR = es('particular'), EST = es('estudiante');

export const PLANS: Record<PlanId, PlanDef> = {
  abogados: {
    id: 'abogados', stored: 'Abogados', name: ABO.plan.name, price: ABO.price, unit: '/mes', taxIncluded: false,
    forWho: ABO.plan.forWho, features: ABO.plan.features,
    cta: `Probar ${TRIAL_DAYS} días gratis`, ctaHref: '/signup?plan=abogado',
    fine: `IVA no incluido. ${TRIAL_DAYS} días gratis. Cancela cuando quieras.`,
    featured: true, stripePriceId: SUBSCRIPTION_PRICE_IDS.Abogados,
  },
  particulares: {
    id: 'particulares', stored: 'Autoservicio', name: PAR.plan.name, price: PAR.price, unit: '/mes', taxIncluded: true,
    forWho: PAR.plan.forWho, features: PAR.plan.features,
    cta: 'Empezar', ctaHref: '/signup?plan=particular',
    fine: 'IVA incluido. Cancela cuando quieras.',
    featured: false, stripePriceId: null,
  },
  estudiantes: {
    id: 'estudiantes', stored: 'Estudiantes', name: EST.plan.name, price: EST.price, unit: '/mes', taxIncluded: true,
    forWho: EST.plan.forWho, features: EST.plan.features,
    cta: 'Empezar a practicar', ctaHref: '/signup?plan=estudiante',
    fine: 'IVA incluido. Con email universitario verificado.',
    featured: false, stripePriceId: null,
  },
};

export const PLAN_ORDER: PlanId[] = ['abogados', 'particulares', 'estudiantes'];

/**
 * Legacy Autoservicio subscription (100 créditos/mes, old price). Precios v4: no longer sold to new signups
 * (D7); kept so existing subscribers' renewals (webhook: 100 credits per cycle) keep working.
 */
export const PARTICULARES_LEGACY_BUNDLE = {
  price: 50,
  unit: '/mes' as const,
  credits: 100,
  stripePriceId: SUBSCRIPTION_PRICE_IDS.Autoservicio,
};

export const SALES_CONTACT = { label: 'Hablar con ventas', href: '/contacto', prompt: '¿Necesitas un plan para tu empresa?' };

/** Where each plan lands after signup / onboarding (single map). */
export const PLAN_DASHBOARDS: Record<StoredPlan, string> = {
  Abogados: '/panel',
  Estudiantes: '/agent',
  Autoservicio: '/agent',
};

/** `?plan=` values accepted by signup: v4 ids plus the legacy ones (Empresa plans are stored as Abogados). */
export function planFromParam(param: string | null | undefined): StoredPlan | undefined {
  switch ((param ?? '').toLowerCase()) {
    case 'abogados': case 'abogado':
    case 'empresa': case 'empresa-inicial': case 'empresa-negocio': case 'empresa-medida': return 'Abogados';
    case 'particulares': case 'particular': case 'autoservicio': return 'Autoservicio';
    case 'estudiantes': case 'estudiante': return 'Estudiantes';
    default: return undefined;
  }
}

export function planByStored(stored: StoredPlan): PlanDef {
  return Object.values(PLANS).find(p => p.stored === stored)!;
}

/** "69 €", "6,90 €" — Spanish format, space before the euro sign (Spain only; see pricing.formatPrice). */
export function formatEuro(amount: number): string {
  const n = Number.isInteger(amount)
    ? amount.toLocaleString('es-ES')
    : amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n} €`;
}

export function priceLabel(p: Pick<PlanDef, 'price' | 'unit'>): string {
  return `${formatEuro(p.price)}${p.unit}`;
}
