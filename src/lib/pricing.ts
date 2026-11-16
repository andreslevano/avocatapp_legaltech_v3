// Precios v4 — the single pricing catalogue (data + pure helpers, no JSX). Read by /precios, the home
// summary, signup, the checkout route and the credits copy. src/lib/plans.ts derives the legacy
// exports from here. Credits are identical in every country; only the price changes (D1, D5).
// Firestore plan values stay 'Abogados' | 'Autoservicio' | 'Estudiantes'; Empresa subscribers are
// stored as plan 'Abogados' + planTier (decision B — see PlanTier).

export type CountryCode = 'ES' | 'CL' | 'MX' | 'CO' | 'PE';
export type Interval = 'monthly' | 'annual';
export type ProfileId = 'estudiante' | 'particular' | 'abogado' | 'empresa';
export type PricingPlanId = 'estudiante' | 'particular' | 'abogado' | 'empresa-inicial' | 'empresa-negocio' | 'empresa-medida';
export type StoredPlan = 'Abogados' | 'Autoservicio' | 'Estudiantes';
export type PlanTier = 'EmpresaInicial' | 'EmpresaNegocio' | 'EmpresaMedida';
/** live = Disponible · pilot = Piloto · soon = Próximamente · signature = Firma Avocat (SIGNATURE_PROVIDER_LIVE). */
export type FeatureStatus = 'live' | 'pilot' | 'soon' | 'signature';

// ── Countries (D5) ───────────────────────────────────────────────────────────

export interface Country {
  code: CountryCode;
  name: string;
  currency: 'EUR' | 'CLP' | 'MXN' | 'COP' | 'PEN';
  /** Intl locale for numbers and currency. */
  locale: string;
  /** Copy variant: es-ES for Spain, es-419 for Latin America. */
  lang: 'es-ES' | 'es-419';
  taxName: 'IVA' | 'IGV';
  /** Display only (price per credit net of tax for B2C). */
  taxRate: number;
  /** Prices with decimals (EUR, PEN) or whole units only (CLP, COP, MXN). */
  decimals: boolean;
}

export const COUNTRIES: Record<CountryCode, Country> = {
  ES: { code: 'ES', name: 'España', currency: 'EUR', locale: 'es-ES', lang: 'es-ES', taxName: 'IVA', taxRate: 0.21, decimals: true },
  CL: { code: 'CL', name: 'Chile', currency: 'CLP', locale: 'es-CL', lang: 'es-419', taxName: 'IVA', taxRate: 0.19, decimals: false },
  MX: { code: 'MX', name: 'México', currency: 'MXN', locale: 'es-MX', lang: 'es-419', taxName: 'IVA', taxRate: 0.16, decimals: false },
  CO: { code: 'CO', name: 'Colombia', currency: 'COP', locale: 'es-CO', lang: 'es-419', taxName: 'IVA', taxRate: 0.19, decimals: false },
  PE: { code: 'PE', name: 'Perú', currency: 'PEN', locale: 'es-PE', lang: 'es-419', taxName: 'IGV', taxRate: 0.18, decimals: true },
};
export const COUNTRY_ORDER: CountryCode[] = ['ES', 'CL', 'MX', 'CO', 'PE'];
export const DEFAULT_COUNTRY: CountryCode = 'ES';
export const COUNTRY_COOKIE = 'avocat_pais';
/** Spain is sellable now; the others show prices and sell once their Stripe price ids exist (D6). */
export const SELLABLE_NOW: CountryCode[] = ['ES'];

export const isCountryCode = (v: unknown): v is CountryCode =>
  typeof v === 'string' && (COUNTRY_ORDER as string[]).includes(v.toUpperCase());

// ── Plans (D1, D2) ───────────────────────────────────────────────────────────

export const WELCOME_CREDITS = 20;
export const PACK_CREDITS = 30;
/** Abogado trial (D7). */
export const TRIAL_DAYS = 14;

export interface PricingPlan {
  id: PricingPlanId;
  profile: ProfileId;
  stored: StoredPlan;
  planTier: PlanTier | null;
  name: string;
  forWho: string;
  /** Members who operate (consume credits). null = by contract. */
  members: number | null;
  usersLabel: string;
  creditsPerMonth: number | null;
  /** "Uso justo" note on the Abogado plan. */
  fairUse: boolean;
  /** B2B → prices without tax; B2C → tax included (D4). */
  b2b: boolean;
  /** Four key features for the ladder card. */
  features: string[];
  /** Externals who review and sign at no cost (D2). null = none, 'unlimited' = a Medida. */
  externalsIncluded: number | 'unlimited' | null;
  trialDays: number;
  badge?: string;
  /** Always "Hablar con ventas" (Empresa a Medida). */
  contactOnly?: boolean;
  /** Key of the Stripe env var: STRIPE_PRICE_<key>_<CC>_<M|Y>. */
  stripeKey: string | null;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'estudiante', profile: 'estudiante', stored: 'Estudiantes', planTier: null, name: 'Estudiante',
    forWho: 'Grado y máster en Derecho. Con email universitario verificado.',
    members: 1, usersLabel: '1 usuario', creditsPerMonth: 120, fairUse: false, b2b: false,
    features: ['Tutor socrático para practicar', 'Plantillas comentadas de 8 áreas', 'Consultas con citas a la norma', 'Word y PDF'],
    externalsIncluded: null, trialDays: 0, stripeKey: 'ESTUDIANTE',
  },
  {
    id: 'particular', profile: 'particular', stored: 'Autoservicio', planTier: null, name: 'Particular',
    forWho: 'Orientación jurídica en lenguaje claro, con el camino hacia un abogado cuando lo necesitas.',
    members: 1, usersLabel: '1 usuario', creditsPerMonth: 60, fairUse: false, b2b: false,
    features: ['Orientación jurídica en lenguaje claro', 'Escritos sencillos: reclamación de cantidad, tutela', 'Revisión de documentos que te envían', '1 envío a firma al mes'],
    externalsIncluded: null, trialDays: 0, stripeKey: 'PARTICULAR',
  },
  {
    id: 'abogado', profile: 'abogado', stored: 'Abogados', planTier: null, name: 'Abogado',
    forWho: 'Abogados en ejercicio y despachos unipersonales.',
    members: 1, usersLabel: '1 usuario', creditsPerMonth: 600, fairUse: true, b2b: true,
    features: ['Agente IA con el contexto de cada caso', 'Casos, clientes, plazos y panel', 'NDA, contratos y escritos en Word y PDF', '5 envíos a firma al mes'],
    externalsIncluded: null, trialDays: TRIAL_DAYS, badge: 'Más elegido', stripeKey: 'ABOGADO',
  },
  {
    id: 'empresa-inicial', profile: 'empresa', stored: 'Abogados', planTier: 'EmpresaInicial', name: 'Empresa Inicial',
    forWho: 'Despachos pequeños y empresas con área legal que empiezan a trabajar en equipo.',
    members: 3, usersLabel: 'Hasta 3 usuarios', creditsPerMonth: 2000, fairUse: false, b2b: true,
    features: ['Todo lo del plan Abogado', '2.000 créditos compartidos', '25 externos sin coste', '20 envíos a firma al mes'],
    externalsIncluded: 25, trialDays: 0, stripeKey: 'EMPRESA_INICIAL',
  },
  {
    id: 'empresa-negocio', profile: 'empresa', stored: 'Abogados', planTier: 'EmpresaNegocio', name: 'Empresa Negocio',
    forWho: 'Despachos y departamentos legales con varios equipos y mucho volumen.',
    members: 10, usersLabel: 'Hasta 10 usuarios', creditsPerMonth: 8000, fairUse: false, b2b: true,
    features: ['Todo lo de Empresa Inicial', '8.000 créditos compartidos', '250 externos sin coste', '60 envíos a firma al mes'],
    externalsIncluded: 250, trialDays: 0, badge: 'Recomendado para despachos', stripeKey: 'EMPRESA_NEGOCIO',
  },
  {
    id: 'empresa-medida', profile: 'empresa', stored: 'Abogados', planTier: 'EmpresaMedida', name: 'Empresa a Medida',
    forWho: 'Organizaciones de 25 o más personas que necesitan condiciones propias.',
    members: null, usersLabel: '25 usuarios o más', creditsPerMonth: null, fairUse: false, b2b: true,
    features: ['Créditos y envíos a firma por contrato', 'Externos ilimitados', 'Condiciones y facturación a medida', 'API, SSO y residencia de datos (próximamente)'],
    externalsIncluded: 'unlimited', trialDays: 0, contactOnly: true, stripeKey: null,
  },
];

export const LADDER: PricingPlanId[] = ['estudiante', 'particular', 'abogado', 'empresa-inicial', 'empresa-negocio', 'empresa-medida'];
export const planById = (id: PricingPlanId) => PRICING_PLANS.find(p => p.id === id)!;

// ── Prices (D3, D5) ─────────────────────────────────────────────────────────

export interface PlanPrice {
  monthly: number;
  /** = 10 × monthly ("2 meses gratis"); null for a Medida (contract). */
  annual: number | null;
  /** "desde …/mes" (a Medida). */
  from?: boolean;
}

const m = (monthly: number): PlanPrice => ({ monthly, annual: Math.round(monthly * 10 * 100) / 100 });

export const PRICES: Record<CountryCode, Record<PricingPlanId, PlanPrice>> = {
  ES: { estudiante: m(6.9), particular: m(9.9), abogado: m(69), 'empresa-inicial': m(179), 'empresa-negocio': m(490), 'empresa-medida': { monthly: 1200, annual: null, from: true } },
  CL: { estudiante: m(4990), particular: m(6990), abogado: m(39990), 'empresa-inicial': m(104990), 'empresa-negocio': m(289990), 'empresa-medida': { monthly: 690000, annual: null, from: true } },
  MX: { estudiante: m(99), particular: m(149), abogado: m(699), 'empresa-inicial': m(1790), 'empresa-negocio': m(4990), 'empresa-medida': { monthly: 12000, annual: null, from: true } },
  CO: { estudiante: m(14900), particular: m(24900), abogado: m(119000), 'empresa-inicial': m(309000), 'empresa-negocio': m(849000), 'empresa-medida': { monthly: 2100000, annual: null, from: true } },
  PE: { estudiante: m(14.9), particular: m(24.9), abogado: m(109), 'empresa-inicial': m(289), 'empresa-negocio': m(779), 'empresa-medida': { monthly: 1900, annual: null, from: true } },
};

/** Pack of 30 credits — any plan, also without subscription; B2C (tax included); dearer per credit. */
export const PACK_PRICES: Record<CountryCode, number> = { ES: 7.9, CL: 4990, MX: 99, CO: 14900, PE: 14.9 };

/** Env var holding the Stripe price id (never invented — D7). */
export function stripeEnvName(plan: PricingPlan, country: CountryCode, interval: Interval): string | null {
  return plan.stripeKey ? `STRIPE_PRICE_${plan.stripeKey}_${country}_${interval === 'monthly' ? 'M' : 'Y'}` : null;
}
export const packEnvName = (country: CountryCode) => `STRIPE_PRICE_PACK30_${country}`;

/** Every env var the catalogue can use (report / deploy checklist). */
export function allStripeEnvNames(): { name: string; plan: string; country: CountryCode; interval: Interval | 'once'; amount: number; currency: string; taxIncluded: boolean }[] {
  const out: ReturnType<typeof allStripeEnvNames> = [];
  for (const c of COUNTRY_ORDER) {
    for (const p of PRICING_PLANS) {
      if (!p.stripeKey) continue;
      for (const i of ['monthly', 'annual'] as Interval[]) {
        const pr = PRICES[c][p.id];
        out.push({ name: stripeEnvName(p, c, i)!, plan: p.name, country: c, interval: i, amount: i === 'monthly' ? pr.monthly : pr.annual!, currency: COUNTRIES[c].currency, taxIncluded: !p.b2b });
      }
    }
    out.push({ name: packEnvName(c), plan: `Pack ${PACK_CREDITS} créditos`, country: c, interval: 'once', amount: PACK_PRICES[c], currency: COUNTRIES[c].currency, taxIncluded: true });
  }
  return out;
}

// ── Formatting ──────────────────────────────────────────────────────────────

/** "1.790 €", "6,90 €", "$104.990", "$1,790", "$ 309.000", "S/ 14,90" — Intl with the country's locale. */
export function formatPrice(country: CountryCode, amount: number): string {
  const c = COUNTRIES[country];
  const frac = c.decimals && !Number.isInteger(amount) ? 2 : 0;
  return new Intl.NumberFormat(c.locale, {
    style: 'currency', currency: c.currency, minimumFractionDigits: frac, maximumFractionDigits: frac,
    // es-ES doesn't group 4-digit numbers by default ("1790 €"); Avocat copy writes "1.790 €".
    useGrouping: 'always' as unknown as boolean,
  }).format(amount);
}

/** Plain number in the country's locale ("2.000", "8,000" in México). */
export function formatNumber(country: CountryCode, n: number): string {
  return new Intl.NumberFormat(COUNTRIES[country].locale, { useGrouping: 'always' as unknown as boolean }).format(n);
}

/** "IVA incluido" / "IVA no incluido" / "IGV no incluido" (D4). */
export function taxLine(country: CountryCode, b2b: boolean): string {
  return `${COUNTRIES[country].taxName} ${b2b ? 'no incluido' : 'incluido'}`;
}

export function priceFor(planId: PricingPlanId, country: CountryCode, interval: Interval): number | null {
  const p = PRICES[country][planId];
  return interval === 'monthly' ? p.monthly : p.annual;
}

/** Monthly-equivalent price net of tax (B2C prices include tax; B2B don't). */
export function netMonthly(planId: PricingPlanId, country: CountryCode): number {
  const p = planById(planId);
  const gross = PRICES[country][planId].monthly;
  return p.b2b ? gross : gross / (1 + COUNTRIES[country].taxRate);
}

/** Net price per credit (monthly billing). null when credits are by contract. */
export function pricePerCredit(planId: PricingPlanId, country: CountryCode): number | null {
  const credits = planById(planId).creditsPerMonth;
  return credits ? netMonthly(planId, country) / credits : null;
}
export const packPricePerCredit = (country: CountryCode) => PACK_PRICES[country] / (1 + COUNTRIES[country].taxRate) / PACK_CREDITS;

// ── Credits (D8) ─────────────────────────────────────────────────────────────

export interface CreditCost {
  id: 'consulta' | 'documento' | 'analisis' | 'investigacion' | 'firma-cupo' | 'firma-extra' | 'firma-docusign';
  label: string;
  credits: number;
  status: FeatureStatus;
  note?: string;
}

export const CREDIT_COSTS: CreditCost[] = [
  { id: 'consulta', label: 'Consulta jurídica con citas', credits: 1, status: 'live' },
  { id: 'documento', label: 'Generar un documento (NDA, contrato, escrito)', credits: 3, status: 'live' },
  { id: 'analisis', label: 'Revisar o analizar un documento subido', credits: 5, status: 'live', note: 'Hasta 30 páginas.' },
  { id: 'investigacion', label: 'Investigación profunda', credits: 5, status: 'soon' },
  { id: 'firma-cupo', label: 'Envío a firma con Firma Avocat dentro del cupo mensual', credits: 0, status: 'signature' },
  { id: 'firma-extra', label: 'Envío a firma extra (fuera del cupo)', credits: 20, status: 'signature' },
  { id: 'firma-docusign', label: 'Envío con tu propia cuenta DocuSign', credits: 0, status: 'pilot', note: 'No consume cupo.' },
];
export const creditCost = (id: CreditCost['id']) => CREDIT_COSTS.find(c => c.id === id)!.credits;

/** "≈ 600 consultas o 200 documentos". */
export function creditEquivalents(credits: number) {
  return { consultas: Math.floor(credits / creditCost('consulta')), documentos: Math.floor(credits / creditCost('documento')) };
}

// ── Firma Avocat (D12) ───────────────────────────────────────────────────────

export const SIGNATURE = {
  provider: 'yousign' as const,
  brand: 'Firma Avocat',
  poweredBy: 'Yousign',
  level: 'SES' as const,
  liveFlag: 'SIGNATURE_PROVIDER_LIVE',
  /** Sends per month, renewed monthly, not cumulative. null = none / by contract. */
  monthlySends: {
    estudiante: null, particular: 1, abogado: 5, 'empresa-inicial': 20, 'empresa-negocio': 60, 'empresa-medida': null,
  } as Record<PricingPlanId, number | null>,
  /** a Medida: "por contrato" (not "none"). */
  contractSends: ['empresa-medida'] as PricingPlanId[],
  sharedSends: ['empresa-inicial', 'empresa-negocio'] as PricingPlanId[],
  extraSendCredits: 20,
  addOns: [
    { id: 'aes' as const, label: 'Firma electrónica avanzada (AES)', status: 'soon' as FeatureStatus },
    { id: 'qes' as const, label: 'Firma electrónica cualificada (QES)', status: 'soon' as FeatureStatus },
  ],
  docusignConnector: { plans: ['abogado', 'empresa-inicial', 'empresa-negocio', 'empresa-medida'] as PricingPlanId[], status: 'pilot' as FeatureStatus },
  validityNote:
    'Firma electrónica simple conforme a eIDAS (UE). En Chile, Perú, Colombia y México, validez como firma electrónica simple según la ley de cada país; algunos actos exigen firma avanzada o cualificada.',
  // TODO(legal): country wording reviewed by the Chilean lawyer.
};

/** The status a row shows: Firma Avocat rows follow SIGNATURE_PROVIDER_LIVE. */
export function effectiveStatus(s: FeatureStatus, signatureLive: boolean): Exclude<FeatureStatus, 'signature'> {
  return s === 'signature' ? (signatureLive ? 'live' : 'soon') : s;
}
export const STATUS_LABEL: Record<Exclude<FeatureStatus, 'signature'>, string> = { live: 'Disponible', pilot: 'Piloto', soon: 'Próximamente' };

export function sendsLabel(planId: PricingPlanId, country: CountryCode): string {
  const n = SIGNATURE.monthlySends[planId];
  if (SIGNATURE.contractSends.includes(planId)) return 'Por contrato';
  if (n === null) return 'Sin firma (solo práctica)';
  return `${formatNumber(country, n)} ${n === 1 ? 'envío' : 'envíos'}/mes${SIGNATURE.sharedSends.includes(planId) ? ' compartidos' : ''}`;
}

// ── Estimator (D8) ───────────────────────────────────────────────────────────

export interface EstimateInput { consultas: number; documentos: number; analisis: number; personas: number; estudiante?: boolean }
export interface Estimate { credits: number; planId: PricingPlanId; packs: number }

const clampInt = (n: number) => (Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100_000) : 0);

/** Credits needed per month → the cheapest plan that covers them for that many people (deterministic). */
export function estimate(input: EstimateInput): Estimate {
  const credits = clampInt(input.consultas) * creditCost('consulta')
    + clampInt(input.documentos) * creditCost('documento')
    + clampInt(input.analisis) * creditCost('analisis');
  const people = Math.max(1, clampInt(input.personas));
  if (people > 10) return { credits, planId: 'empresa-medida', packs: 0 };
  const candidates: PricingPlanId[] = people > 3 ? ['empresa-negocio']
    : people > 1 ? ['empresa-inicial', 'empresa-negocio']
    : input.estudiante ? ['estudiante', 'abogado', 'empresa-inicial', 'empresa-negocio']
    : ['particular', 'abogado', 'empresa-inicial', 'empresa-negocio'];
  const fit = candidates.find(id => (planById(id).creditsPerMonth ?? Infinity) >= credits);
  if (!fit) return { credits, planId: 'empresa-medida', packs: 0 };
  return { credits, planId: fit, packs: 0 };
}

// ── Comparison (D11) — only what exists in code, with status ─────────────────

export type Cell = boolean | string;
export interface ComparisonRow {
  id: string;
  label: string;
  status: FeatureStatus;
  /** One value per plan, in LADDER order. */
  values: Record<PricingPlanId, Cell>;
  note?: string;
}
export interface ComparisonGroup { id: string; label: string; rows: ComparisonRow[] }

const all = (v: Cell): Record<PricingPlanId, Cell> => ({ estudiante: v, particular: v, abogado: v, 'empresa-inicial': v, 'empresa-negocio': v, 'empresa-medida': v });
const pro = (v: Cell = true): Record<PricingPlanId, Cell> => ({ estudiante: false, particular: false, abogado: v, 'empresa-inicial': v, 'empresa-negocio': v, 'empresa-medida': v });
const empresa = (v: Cell = true): Record<PricingPlanId, Cell> => ({ ...pro(false), 'empresa-inicial': v, 'empresa-negocio': v, 'empresa-medida': v });
const only = (id: PricingPlanId): Record<PricingPlanId, Cell> => ({ ...all(false), [id]: true });

export const COMPARISON: ComparisonGroup[] = [
  {
    id: 'precio', label: 'Precio y créditos', rows: [
      // Rendered from PRICES / PRICING_PLANS (country + interval aware) by the table.
      { id: 'precio', label: 'Precio', status: 'live', values: all('precio') },
      { id: 'creditos', label: 'Créditos al mes', status: 'live', values: { estudiante: '120', particular: '60', abogado: '600 (uso justo)', 'empresa-inicial': '2.000 compartidos', 'empresa-negocio': '8.000 compartidos', 'empresa-medida': 'Por contrato' } },
      { id: 'bienvenida', label: `Créditos de bienvenida (una vez)`, status: 'live', values: all(String(WELCOME_CREDITS)) },
      { id: 'packs', label: `Packs de ${PACK_CREDITS} créditos`, status: 'live', values: all(true) },
    ],
  },
  {
    id: 'ia', label: 'IA jurídica', rows: [
      // proof: src/app/api/agent-v2/route.ts, src/components/agent/CitationBlock.tsx
      { id: 'consulta', label: 'Consulta jurídica con IA y citas a la norma', status: 'live', values: all(true) },
      // proof: src/lib/agent-prompts.ts (Estudiantes: tutor socrático)
      { id: 'tutor', label: 'Tutor socrático para practicar', status: 'live', values: only('estudiante') },
      // proof: src/lib/agent-prompts.ts (Autoservicio: lenguaje llano)
      { id: 'llano', label: 'Orientación en lenguaje claro', status: 'live', values: only('particular') },
      // proof: src/app/api/agent-v2/route.ts — agent with the case context
      { id: 'contexto-caso', label: 'Agente con el contexto de cada caso', status: 'live', values: pro() },
      // proof: none yet (no deep-research flow in src/)
      { id: 'investigacion', label: 'Investigación profunda', status: 'soon', values: pro() },
    ],
  },
  {
    id: 'documentos', label: 'Documentos', rows: [
      // proof: src/app/(app)/tools/nda/page.tsx, src/app/(app)/tools/generacion/page.tsx
      { id: 'generacion', label: 'Generación de NDA, contratos y escritos', status: 'live', values: all(true) },
      // proof: src/app/(app)/tools/analisis/page.tsx
      { id: 'analisis', label: 'Análisis de documentos subidos', status: 'live', values: all(true) },
      // proof: src/lib/agent-export.ts (buildWordBlob / buildPdfBlob)
      { id: 'word-pdf', label: 'Descarga en Word y PDF', status: 'live', values: all(true) },
      // proof: src/lib/branding.ts, src/components/settings/BrandingCard.tsx
      { id: 'marca', label: 'Tu logo, colores y tipografía en los documentos', status: 'live', values: all(true) },
      // proof: src/app/(app)/tools/page.tsx (TOOLS_AUTOSERVICIO: reclamación de cantidad, acción de tutela)
      { id: 'escritos-particular', label: 'Escritos para particulares (reclamación de cantidad, tutela)', status: 'live', values: only('particular') },
      // proof: src/lib/org-templates/index.ts (MobilityForWork)
      { id: 'plantillas-org', label: 'Plantillas de tu organización', status: 'pilot', values: empresa() },
    ],
  },
  {
    id: 'casos', label: 'Casos y clientes', rows: [
      // proof: src/app/(app)/cases/[id]/page.tsx, src/app/(app)/panel/page.tsx
      { id: 'casos', label: 'Casos, plazos y panel', status: 'live', values: pro() },
      // proof: src/app/(app)/clients/page.tsx (Abogados + Autoservicio nav)
      { id: 'clientes', label: 'Clientes', status: 'live', values: { ...pro(), particular: true } },
      // proof: src/lib/data-requests/server.ts
      { id: 'solicitar-datos', label: 'Solicitar datos al cliente por email', status: 'live', values: { ...pro(), particular: true } },
      // proof: src/lib/clients/import.ts
      { id: 'importar-clientes', label: 'Importar clientes desde Excel', status: 'live', values: { ...pro(), particular: true } },
    ],
  },
  {
    id: 'repositorio', label: 'Repositorio', rows: [
      // proof: src/lib/folders/types.ts, src/app/(app)/documents/page.tsx
      { id: 'carpetas', label: 'Repositorio de documentos con carpetas', status: 'live', values: all(true) },
      // proof: src/lib/integrations/microsoft/import-server.ts (canUseMicrosoft: Abogados)
      { id: 'onedrive', label: 'Importación desde OneDrive y SharePoint', status: 'pilot', values: pro() },
    ],
  },
  {
    id: 'firma', label: 'Firma electrónica', rows: [
      { id: 'envios', label: 'Envíos a firma incluidos al mes (Firma Avocat)', status: 'signature', values: { estudiante: false, particular: '1', abogado: '5', 'empresa-inicial': '20 compartidos', 'empresa-negocio': '60 compartidos', 'empresa-medida': 'Por contrato' } },
      { id: 'envio-extra', label: 'Envío extra fuera del cupo', status: 'signature', values: { ...all('20 créditos'), estudiante: false } },
      { id: 'externos-firman', label: 'Firmantes externos sin cuenta y sin coste', status: 'signature', values: { ...all(true), estudiante: false } },
      { id: 'informe', label: 'PDF firmado e informe de pruebas en el repositorio y el caso', status: 'signature', values: { ...all(true), estudiante: false } },
      { id: 'ses', label: 'Firma electrónica simple (eIDAS)', status: 'signature', values: { ...all(true), estudiante: false } },
      { id: 'aes-qes', label: 'Firma avanzada y cualificada', status: 'soon', values: pro() },
      // proof: src/lib/signatures/server.ts, src/lib/docusign/config.ts (canUseDocusign: Abogados, preview)
      { id: 'docusign', label: 'Usar mi cuenta DocuSign (no consume cupo)', status: 'pilot', values: pro() },
    ],
  },
  {
    id: 'contratos', label: 'Contratos, avisos y cambios legales', rows: [
      // proof: src/lib/contracts/server.ts, src/lib/contracts/config.ts
      { id: 'ficha', label: 'Ficha de contrato y avisos de vencimiento (90 → 0 días)', status: 'pilot', values: pro() },
      // proof: src/lib/legal/sources.ts (BOE, EUR-Lex), src/lib/legal/check.ts (revisión de NDA)
      { id: 'monitor', label: 'Monitor de cambios legales BOE / EUR-Lex y revisión de NDA', status: 'pilot', values: pro(), note: 'Solo España y UE.' },
      { id: 'monitor-latam', label: 'Monitor legal para Chile, México, Colombia y Perú', status: 'soon', values: pro() },
    ],
  },
  {
    id: 'usuarios', label: 'Usuarios y accesos', rows: [
      { id: 'usuarios', label: 'Usuarios que trabajan en Avocat', status: 'live', values: { estudiante: '1', particular: '1', abogado: '1', 'empresa-inicial': 'Hasta 3', 'empresa-negocio': 'Hasta 10', 'empresa-medida': '25 o más' } },
      { id: 'externos', label: 'Externos que revisan y firman, sin coste', status: 'soon', values: { ...pro(false), 'empresa-inicial': '25', 'empresa-negocio': '250', 'empresa-medida': 'Ilimitados' } },
      { id: 'roles', label: 'Cuenta Empresa con roles y dos espacios', status: 'soon', values: empresa() },
      { id: 'portal', label: 'Portal de externos', status: 'soon', values: empresa() },
      { id: 'conocimiento', label: 'Base de conocimiento propia', status: 'soon', values: pro() },
      { id: 'integraciones', label: 'Integraciones con Word, Outlook y Drive', status: 'soon', values: pro() },
      { id: 'api', label: 'API, SSO y residencia de datos', status: 'soon', values: only('empresa-medida') },
      { id: 'marketplace', label: 'Del plan Particular a un abogado (marketplace)', status: 'soon', values: only('particular') },
    ],
  },
  {
    id: 'soporte', label: 'Soporte', rows: [
      // proof: src/app/(public)/contacto/page.tsx
      { id: 'email', label: 'Soporte por email', status: 'live', values: all(true) },
      { id: 'ventas', label: 'Condiciones y facturación a medida', status: 'live', values: only('empresa-medida') },
    ],
  },
];

// ── Profiles (sections #estudiante #particular #abogado #empresa) ────────────

export interface Profile {
  id: ProfileId;
  label: string;
  title: string;
  forWho: string;
  steps: [string, string, string];
  included: string[];
  notIncluded: string[];
  faqs: { q: string; a: string }[];
}

export const PROFILES: Profile[] = [
  {
    id: 'estudiante', label: 'Estudiante', title: 'Para practicar Derecho de verdad',
    forWho: 'Estudiantes de grado y máster en Derecho. El plan se activa con tu email universitario verificado.',
    steps: ['Verifica tu email universitario', 'Practica con el tutor socrático y las plantillas comentadas', 'Descarga tus escritos en Word y PDF para tu portafolio'],
    included: ['120 créditos al mes', 'Tutor socrático', 'Plantillas comentadas de 8 áreas', 'Consultas con citas a la norma', 'Repositorio (Dossier)'],
    notIncluded: ['Envíos a firma (es un plan de práctica)', 'Casos y clientes', 'Uso profesional con clientes reales'],
    faqs: [
      { q: '¿Qué email universitario sirve?', a: 'El de tu universidad. Te enviaremos un enlace para verificarlo antes de aplicar el precio de estudiante.' },
      { q: '¿Puedo usarlo para trabajar con clientes?', a: 'No. Es un plan de práctica. Para trabajar con clientes reales, elige Abogado.' },
    ],
  },
  {
    id: 'particular', label: 'Particular', title: 'Orientación jurídica clara, con un abogado cuando haga falta',
    forWho: 'Personas que quieren entender su situación legal y resolver trámites sencillos. Avocat orienta; no sustituye a un abogado y te indica cuándo necesitas uno.',
    steps: ['Cuéntale tu situación al asistente en tus palabras', 'Recibe una orientación clara y, si procede, tu escrito', 'Si tu caso lo requiere, te indicamos el siguiente paso con un abogado'],
    included: ['60 créditos al mes', 'Orientación en lenguaje claro', 'Escritos sencillos (reclamación de cantidad, tutela)', 'Revisión de documentos', '1 envío a firma al mes (Firma Avocat)'],
    notIncluded: ['Representación ni defensa en juicio', 'Casos y panel profesional', 'Más de un usuario'],
    faqs: [
      { q: '¿Avocat es un despacho de abogados?', a: 'No. Avocat es una herramienta de orientación jurídica. Cuando tu caso necesita un abogado, te lo indicamos.' },
      { q: '¿Y si solo necesito un documento?', a: `Puedes comprar un pack de ${PACK_CREDITS} créditos sin suscripción.` },
    ],
  },
  {
    id: 'abogado', label: 'Abogado', title: 'Tu despacho, con IA jurídica y firma incluidas',
    forWho: 'Abogados en ejercicio y despachos unipersonales que quieren ganar tiempo en cada caso.',
    steps: ['Crea tus casos y clientes (o impórtalos desde Excel)', 'Consulta, redacta y analiza con el contexto de cada caso', 'Envía a firma y controla plazos y vencimientos desde el panel'],
    included: ['600 créditos al mes (uso justo)', 'Agente IA con el contexto de cada caso', 'Casos, clientes, plazos y panel', 'NDA, contratos y escritos en Word y PDF', '5 envíos a firma al mes (Firma Avocat)', 'Usar tu cuenta DocuSign (piloto)'],
    notIncluded: ['Varios usuarios (pasa a Empresa)', 'Externos sin coste (Empresa)'],
    faqs: [
      { q: '¿Qué es el uso justo?', a: 'Los 600 créditos cubren el trabajo diario de un abogado. Si un mes necesitas más, puedes comprar packs o pasar a Empresa.' },
      { q: '¿Cómo funciona la prueba?', a: `Tienes ${TRIAL_DAYS} días gratis. Puedes cancelar antes de que termine y no se te cobra nada.` },
    ],
  },
  {
    id: 'empresa', label: 'Empresa', title: 'Para despachos y empresas con área legal',
    forWho: 'Despachos con varios abogados y empresas con un área legal propia. Los miembros trabajan en Avocat y consumen créditos; los externos —socios, clientes, proveedores— revisan y firman sin coste.',
    steps: ['Elige el plan según el número de personas que trabajan', 'Invita a tu equipo y comparte los créditos y los envíos a firma', 'Tus externos revisan y firman sin cuenta y sin coste'],
    included: ['Todo lo del plan Abogado', 'Créditos y envíos a firma compartidos', 'Externos sin coste (25 / 250 / ilimitados)', 'Plantillas de tu organización (piloto)', 'Roles y dos espacios: despacho y empresa (próximamente)'],
    notIncluded: ['Usuarios por encima del máximo del plan (pasa al siguiente o habla con ventas)'],
    faqs: [
      { q: '¿Qué diferencia hay entre miembros y externos?', a: 'Los miembros trabajan en Avocat y consumen créditos. Los externos solo revisan y firman lo que les envías, sin cuenta y sin coste.' },
      { q: '¿Necesito más usuarios de los que incluye mi plan?', a: 'Pasa a Empresa Negocio o habla con ventas para un plan a medida.' },
      // TODO(pricing): extra member price above the cap (deck: +59 € / +49 €) — not printed until decided.
    ],
  },
];

// ── FAQ (#preguntas) ─────────────────────────────────────────────────────────

export function pricingFaqs(country: CountryCode): { q: string; a: string }[] {
  const c = COUNTRIES[country];
  return [
    { q: '¿Los precios incluyen impuestos?', a: `Los planes Estudiante y Particular y los packs llevan el ${c.taxName} incluido. Los planes Abogado y Empresa se muestran sin ${c.taxName}, que se añade en la factura.` },
    { q: '¿Cómo funciona la facturación anual?', a: 'Pagas 10 mensualidades y tienes 12 meses: 2 meses gratis en todos los planes.' },
    { q: '¿Qué es un crédito?', a: 'La unidad con la que pagas lo que haces en Avocat: una consulta cuesta 1 crédito, generar un documento 3 y analizar uno subido 5.' },
    // TODO(pricing): do unused monthly credits roll over? Until decided, say they renew each month.
    { q: '¿Los créditos caducan?', a: 'Los créditos del plan se renuevan cada mes. Los créditos de packs y de bienvenida se mantienen mientras tengas cuenta.' },
    { q: '¿Qué pasa si me quedo sin créditos?', a: `Puedes comprar un pack de ${PACK_CREDITS} créditos en cualquier momento o pasar a un plan superior.` },
    { q: '¿Puedo comprar créditos sin suscripción?', a: `Sí. El pack de ${PACK_CREDITS} créditos está disponible con o sin plan.` },
    { q: '¿Puedo cambiar de plan o cancelar?', a: 'Sí, cuando quieras. El cambio se aplica en el siguiente periodo de facturación; si cancelas, conservas el acceso hasta el final del periodo pagado.' },
    { q: '¿Quiénes son los externos?', a: 'Socios, clientes o proveedores que revisan y firman lo que les envías. Están incluidos sin coste en los planes Empresa y no necesitan cuenta.' },
    { q: '¿Qué es un envío a firma?', a: 'Un documento enviado a firmar, con independencia del número de firmantes. Cada plan incluye un cupo mensual de envíos con Firma Avocat.' },
    { q: '¿Qué pasa al agotar el cupo de firmas?', a: `Cada envío extra cuesta ${SIGNATURE.extraSendCredits} créditos.` },
    { q: '¿La firma tiene validez legal?', a: SIGNATURE.validityNote },
    { q: '¿Necesito una cuenta de DocuSign?', a: 'No. Firma Avocat está incluida y no necesitas cuentas de terceros. Si ya pagas DocuSign, puedes usar tu cuenta (piloto) y esos envíos no consumen cupo.' },
    { q: '¿En qué países está Avocat?', a: 'En España ya puedes contratar. En Chile, México, Colombia y Perú puedes ver los precios en tu moneda y apuntarte para que te avisemos cuando abramos.' },
    { q: '¿Subirán los precios?', a: 'Pueden subir para nuevos clientes cuando lleguen la cuenta Empresa multiusuario, Firma Avocat y la base de conocimiento. Si ya eres cliente, mantienes tu precio.' },
    { q: '¿Avocat es un despacho de abogados?', a: 'No. Avocat es una herramienta tecnológica y no presta asesoramiento como despacho. Consulta el aviso legal.' },
    // TODO(legal): refunds wording.
    { q: '¿Hacéis reembolsos?', a: 'Si tienes un problema con un cobro, escríbenos y lo revisamos contigo.' },
  ];
}

// ── es-419 wording ───────────────────────────────────────────────────────────

/** Spain → "despacho"; Latin America → "estudio jurídico". */
export function localize(text: string, country: CountryCode): string {
  if (COUNTRIES[country].lang === 'es-ES') return text;
  return text
    .replace(/\bdespachos\b/g, 'estudios jurídicos').replace(/\bDespachos\b/g, 'Estudios jurídicos')
    .replace(/\bdespacho\b/g, 'estudio jurídico').replace(/\bDespacho\b/g, 'Estudio jurídico');
}

// ── Param helpers ────────────────────────────────────────────────────────────

export function pricingPlanFromParam(param: string | null | undefined): PricingPlanId | undefined {
  const v = (param ?? '').toLowerCase().trim();
  const map: Record<string, PricingPlanId> = {
    estudiante: 'estudiante', estudiantes: 'estudiante',
    particular: 'particular', particulares: 'particular', autoservicio: 'particular',
    abogado: 'abogado', abogados: 'abogado',
    'empresa-inicial': 'empresa-inicial', empresainicial: 'empresa-inicial', inicial: 'empresa-inicial',
    'empresa-negocio': 'empresa-negocio', empresanegocio: 'empresa-negocio', negocio: 'empresa-negocio',
    'empresa-medida': 'empresa-medida', empresamedida: 'empresa-medida', medida: 'empresa-medida', empresa: 'empresa-inicial',
  };
  return map[v];
}

export const PROFILE_ORDER: ProfileId[] = ['estudiante', 'particular', 'abogado', 'empresa'];
export const isProfileId = (v: unknown): v is ProfileId => typeof v === 'string' && (PROFILE_ORDER as string[]).includes(v);
