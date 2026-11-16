// Precios v4 checkout (D7): which Stripe price to use and the session parameters. Pure (env passed
// in), unit tested; the route /api/checkout adds auth and calls Stripe. Price ids come ONLY from env
// (STRIPE_PRICE_<PLAN>_<CC>_<M|Y>, STRIPE_PRICE_PACK30_<CC>) — never from the client, never invented.
import {
  isCountryCode, LADDER, PACK_CREDITS, packEnvName, planById, stripeEnvName,
  type CountryCode, type Interval, type PricingPlanId,
} from './pricing';

export type CheckoutItem = PricingPlanId | 'pack30';

export interface CheckoutRequest { item: CheckoutItem; country: CountryCode; interval: Interval }

export function parseCheckout(body: unknown): CheckoutRequest | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const item = b.item === 'pack30' || (LADDER as string[]).includes(String(b.item)) ? b.item as CheckoutItem : null;
  if (!item || !isCountryCode(b.country)) return null;
  const interval: Interval = b.interval === 'annual' ? 'annual' : 'monthly';
  return { item, country: String(b.country).toUpperCase() as CountryCode, interval };
}

export interface SessionPlan {
  mode: 'subscription' | 'payment';
  priceId: string;
  trialDays: number;
  /** Read by the Stripe webhook (functions/src/index.ts): userId + planType keep the legacy contract. */
  metadata: Record<string, string>;
}

/** null → not sellable (no env price id, or a Medida which is always sales). */
export function sessionPlan(req: CheckoutRequest, userId: string, env: Record<string, string | undefined>): SessionPlan | null {
  const valid = (v: string | undefined) => (v && v.trim().startsWith('price_') ? v.trim() : null);
  if (req.item === 'pack30') {
    const priceId = valid(env[packEnvName(req.country)]);
    return priceId ? {
      mode: 'payment', priceId, trialDays: 0,
      metadata: { userId, kind: 'pack', planId: 'pack30', credits: String(PACK_CREDITS), country: req.country },
    } : null;
  }
  const plan = planById(req.item);
  const name = stripeEnvName(plan, req.country, req.interval);
  const priceId = name ? valid(env[name]) : null;
  if (!priceId || plan.contactOnly) return null;
  return {
    mode: 'subscription', priceId, trialDays: plan.trialDays,
    metadata: {
      userId, kind: 'subscription', planId: plan.id, planType: plan.stored, planTier: plan.planTier ?? '',
      country: req.country, interval: req.interval, credits: String(plan.creditsPerMonth ?? 0),
    },
  };
}
