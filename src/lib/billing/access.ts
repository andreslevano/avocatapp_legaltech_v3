// Who may use the app without (or while fixing) a payment. Pure: used by the app shell, the
// server routes (same rule on both sides) and unit tests.
//
// - Accounts created before BILLING_ENFORCED_FROM keep today's access (decision 26 nov 2026).
// - From then on, `Abogados` (Abogado + Empresa) needs a paid / trialing subscription.
// - Any account that started a subscription (`billing` exists) follows its status — this covers
//   Particular (stored 'Autoservicio'), which may otherwise use credits without a subscription.
// - A failed payment keeps access for GRACE_DAYS, with a warning; then it's blocked.
// - `billing` and `stripe_customer_id` are written only by the server (checkout route, webhook).

export const BILLING_ENFORCED_FROM = Date.parse('2026-11-26T00:00:00Z');
export const GRACE_DAYS = 7;
const DAY = 86_400_000;

export type BillingStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired';

export interface BillingRecord {
  status: BillingStatus;
  /** What to reopen from "Completa tu pago". */
  item?: string; country?: string; interval?: 'monthly' | 'annual';
  /** ms epoch: first failed payment of the current episode (grace runs from here). */
  pastDueSince?: number | null;
  subscriptionId?: string | null;
}

export interface AccessInput {
  plan?: string | null;
  createdAtMs?: number | null;
  billing?: BillingRecord | null;
  hasStripeCustomer?: boolean;
  pilot?: boolean;
  isAdmin?: boolean;
}

export type Access =
  | { allowed: true; grace?: { until: number } }
  | { allowed: false; reason: 'payment_pending' | 'payment_failed' | 'canceled' };

/** Checkout item → stored plan (src/lib/pricing.ts ladder). */
function storedOf(item: string): string | null {
  if (item === 'abogado' || item.startsWith('empresa')) return 'Abogados';
  if (item === 'particular') return 'Autoservicio';
  if (item === 'estudiante') return 'Estudiantes';
  return null;
}

export function accessFor(u: AccessInput, now = Date.now()): Access {
  if (u.pilot || u.isAdmin) return { allowed: true };
  const b = u.billing ?? null;

  if (b) {
    switch (b.status) {
      case 'active':
      case 'trialing':
        return { allowed: true };
      case 'past_due':
      case 'unpaid': {
        const until = (b.pastDueSince ?? now) + GRACE_DAYS * DAY;
        return now < until ? { allowed: true, grace: { until } } : { allowed: false, reason: 'payment_failed' };
      }
      case 'canceled':
      case 'incomplete_expired':
        return { allowed: false, reason: 'canceled' };
      default: // pending, incomplete
        break;
    }
    // Pending (checkout started, not paid): blocks new accounts. Existing accounts that open a
    // checkout (e.g. to change plan) and back out keep the access they had.
    // A pending mark for another plan is stale (they switched to a plan without subscription);
    // Abogados always needs one.
    const createdP = u.createdAtMs ?? 0;
    const samePlan = u.plan === 'Abogados' || (b.item ? storedOf(b.item) === u.plan : true);
    if (createdP >= BILLING_ENFORCED_FROM && !u.hasStripeCustomer && samePlan) return { allowed: false, reason: 'payment_pending' };
    return { allowed: true };
  }

  // No billing record: legacy accounts and anyone already known to Stripe keep access.
  if (u.plan !== 'Abogados') return { allowed: true };
  if (u.hasStripeCustomer) return { allowed: true };
  const created = u.createdAtMs ?? 0;
  if (!created || created < BILLING_ENFORCED_FROM) return { allowed: true };
  return { allowed: false, reason: 'payment_pending' };
}

/** Stripe subscription status → ours. */
export function fromStripeStatus(s: string): BillingStatus {
  const known: BillingStatus[] = ['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'];
  return (known as string[]).includes(s) ? (s as BillingStatus) : 'pending';
}

/** Firestore Timestamp | Date | number | {seconds} → ms (or null). */
export function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const o = v as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  const s = o.seconds ?? o._seconds;
  return typeof s === 'number' ? s * 1000 : null;
}

/** Access from a raw users/{uid} document. */
export function accessForUserDoc(d: Record<string, unknown> | null | undefined, opts: { pilot?: boolean } = {}, now = Date.now()): Access {
  if (!d) return { allowed: true };
  const billing = d.billing && typeof d.billing === 'object' ? d.billing as BillingRecord : null;
  return accessFor({
    plan: (d.plan as string) ?? null,
    createdAtMs: toMs(d.createdAt),
    billing: billing ? { ...billing, pastDueSince: toMs(billing.pastDueSince) } : null,
    hasStripeCustomer: !!d.stripe_customer_id,
    pilot: opts.pilot,
    isAdmin: d.isAdmin === true,
  }, now);
}

export const ACCESS_MESSAGE: Record<'payment_pending' | 'payment_failed' | 'canceled', string> = {
  payment_pending: 'Completa el pago de tu plan para empezar a usar Avocat.',
  payment_failed: 'No pudimos cobrar tu suscripción y el periodo de gracia ha terminado. Actualiza tu método de pago para seguir.',
  canceled: 'Tu suscripción está cancelada. Reactívala o elige otro plan para seguir.',
};
