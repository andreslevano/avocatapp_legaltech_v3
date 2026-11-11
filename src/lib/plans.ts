// Single pricing source (DS v4 — design-system/v4/components/PlanCard.md). Home, product pages,
// signup and the navbar read prices ONLY from here. Firestore stores the legacy plan names
// (`UserPlan`): 'Abogados' | 'Autoservicio' | 'Estudiantes' — never change those values.
import { SUBSCRIPTION_PRICE_IDS } from './subscription-prices';

export type PlanId = 'abogados' | 'particulares' | 'estudiantes';
export type StoredPlan = 'Abogados' | 'Autoservicio' | 'Estudiantes';

export interface PlanDef {
  id: PlanId;
  stored: StoredPlan;
  name: string;
  /** Amount in euros, IVA included. */
  price: number;
  unit: '/mes' | '/escrito';
  forWho: string;
  features: string[];
  cta: string;
  ctaHref: string;
  fine: string;
  featured: boolean;
  stripePriceId: string | null;
}

export const PLANS: Record<PlanId, PlanDef> = {
  abogados: {
    id: 'abogados',
    stored: 'Abogados',
    name: 'Abogados',
    price: 75,
    unit: '/mes',
    forWho: 'Despachos y abogados en ejercicio.',
    features: ['Agente IA con contexto de cada caso', 'Casos, plazos y clientes', 'Repositorio de documentos', 'Panel de indicadores'],
    cta: 'Probar 14 días gratis',
    ctaHref: '/signup?plan=abogados',
    // TODO(ds-v4): confirm the Stripe price has a 14-day trial; signup sends Abogados to checkout (card required).
    fine: '14 días gratis. Cancela cuando quieras.',
    featured: true,
    stripePriceId: SUBSCRIPTION_PRICE_IDS.Abogados,
  },
  particulares: {
    id: 'particulares',
    stored: 'Autoservicio',
    name: 'Particulares',
    price: 10,
    unit: '/escrito',
    forWho: 'Reclama sin abogado cuando la ley lo permite.',
    features: ['Reclamación de cantidad (España)', 'Acción de tutela (Colombia)', 'Lenguaje claro, paso a paso', 'Descarga en Word y PDF'],
    cta: 'Crear mi escrito',
    ctaHref: '/signup?plan=particulares',
    fine: 'Pago único por escrito. Sin suscripción.',
    featured: false,
    // TODO(ds-v4): no per-document Stripe price id found in the code (ReclamacionProcess uses the placeholder
    // 'price_reclamacion_cantidades'). Signup still uses the legacy 50 €/mes subscription price —
    // see PARTICULARES_LEGACY_BUNDLE below.
    stripePriceId: null,
  },
  estudiantes: {
    id: 'estudiantes',
    stored: 'Estudiantes',
    name: 'Estudiantes',
    price: 3,
    unit: '/escrito',
    forWho: 'Grado y máster en Derecho.',
    features: ['Tutor socrático', 'Plantillas comentadas', '8 áreas del Derecho'],
    cta: 'Empezar a practicar',
    ctaHref: '/signup?plan=estudiantes',
    fine: 'Pago único por escrito.',
    featured: false,
    // TODO(ds-v4): no Stripe price id for Estudiantes in the code.
    stripePriceId: null,
  },
};

export const PLAN_ORDER: PlanId[] = ['abogados', 'particulares', 'estudiantes'];

/**
 * The 50 €/mes · 100 créditos bundle is no longer advertised on public pages (DS v4 default), but its
 * Stripe path is untouched: signup still opens this subscription checkout for Particulares.
 * TODO(ds-v4): business decision — retire it (and switch signup to pay-per-document) or keep it as an
 * in-app "Bono Particulares". Until then signup shows this price so users see what they will be charged.
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

/** `?plan=` values accepted by signup: v4 ids plus the legacy ones. */
export function planFromParam(param: string | null | undefined): StoredPlan | undefined {
  switch ((param ?? '').toLowerCase()) {
    case 'abogados': case 'abogado': return 'Abogados';
    case 'particulares': case 'particular': case 'autoservicio': return 'Autoservicio';
    case 'estudiantes': case 'estudiante': return 'Estudiantes';
    default: return undefined;
  }
}

export function planByStored(stored: StoredPlan): PlanDef {
  return Object.values(PLANS).find(p => p.stored === stored)!;
}

/** "75 €", "3,50 €" — Spanish format, space before the euro sign. */
export function formatEuro(amount: number): string {
  const n = Number.isInteger(amount)
    ? amount.toLocaleString('es-ES')
    : amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n} €`;
}

export function priceLabel(p: Pick<PlanDef, 'price' | 'unit'>): string {
  return `${formatEuro(p.price)}${p.unit}`;
}
