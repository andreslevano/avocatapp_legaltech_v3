import { expect, test } from '@playwright/test';
import { accessFor, accessForUserDoc, BILLING_ENFORCED_FROM, fromStripeStatus, GRACE_DAYS } from '@/lib/billing/access';

const NEW = BILLING_ENFORCED_FROM + 3_600_000;
const OLD = BILLING_ENFORCED_FROM - 86_400_000 * 30;
const DAY = 86_400_000;

test('new Abogado who went back from Stripe: blocked; existing accounts unchanged', () => {
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW })).toEqual({ allowed: false, reason: 'payment_pending' });
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, billing: { status: 'pending', item: 'abogado' } })).toEqual({ allowed: false, reason: 'payment_pending' });
  expect(accessFor({ plan: 'Abogados', createdAtMs: OLD })).toEqual({ allowed: true });
  expect(accessFor({ plan: 'Abogados', createdAtMs: null })).toEqual({ allowed: true });           // legacy docs without createdAt
  expect(accessFor({ plan: 'Abogados', createdAtMs: OLD, billing: { status: 'pending' } })).toEqual({ allowed: true }); // changing plan, backed out
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, hasStripeCustomer: true })).toEqual({ allowed: true }); // paid before the billing field existed
});

test('plans without a required subscription', () => {
  expect(accessFor({ plan: 'Estudiantes', createdAtMs: NEW })).toEqual({ allowed: true });
  expect(accessFor({ plan: 'Autoservicio', createdAtMs: NEW })).toEqual({ allowed: true });            // Particular on credits
  expect(accessFor({ plan: 'Autoservicio', createdAtMs: NEW, billing: { status: 'pending' } })).toEqual({ allowed: false, reason: 'payment_pending' }); // started a subscription
});

test('paid, trial, grace period and cancellation', () => {
  const now = NEW + 100 * DAY;
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, billing: { status: 'trialing' } }, now)).toEqual({ allowed: true });
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, billing: { status: 'active' } }, now)).toEqual({ allowed: true });
  const since = now - 3 * DAY;
  expect(accessFor({ plan: 'Abogados', createdAtMs: OLD, billing: { status: 'past_due', pastDueSince: since } }, now)).toEqual({ allowed: true, grace: { until: since + GRACE_DAYS * DAY } });
  expect(accessFor({ plan: 'Abogados', createdAtMs: OLD, billing: { status: 'past_due', pastDueSince: now - 8 * DAY } }, now)).toEqual({ allowed: false, reason: 'payment_failed' });
  expect(accessFor({ plan: 'Abogados', createdAtMs: OLD, billing: { status: 'canceled' } }, now)).toEqual({ allowed: false, reason: 'canceled' });
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, pilot: true })).toEqual({ allowed: true });
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, isAdmin: true })).toEqual({ allowed: true });
});

test('raw user docs and Stripe statuses', () => {
  expect(accessForUserDoc({ plan: 'Abogados', createdAt: { seconds: NEW / 1000 } })).toEqual({ allowed: false, reason: 'payment_pending' });
  expect(accessForUserDoc({ plan: 'Abogados', createdAt: { toMillis: () => OLD } })).toEqual({ allowed: true });
  expect(accessForUserDoc({ plan: 'Abogados', createdAt: { seconds: NEW / 1000 }, billing: { status: 'past_due', pastDueSince: { seconds: (Date.now() - DAY) / 1000 } } }).allowed).toBe(true);
  expect(fromStripeStatus('past_due')).toBe('past_due');
  expect(fromStripeStatus('paused')).toBe('pending');
});

test('a stale pending mark after switching to a plan without subscription does not block', () => {
  expect(accessFor({ plan: 'Estudiantes', createdAtMs: NEW, billing: { status: 'pending', item: 'particular' } })).toEqual({ allowed: true });
  expect(accessFor({ plan: 'Estudiantes', createdAtMs: NEW, billing: { status: 'pending', item: 'estudiante' } })).toEqual({ allowed: false, reason: 'payment_pending' });
  expect(accessFor({ plan: 'Abogados', createdAtMs: NEW, billing: { status: 'pending', item: 'particular' } })).toEqual({ allowed: false, reason: 'payment_pending' });
});
