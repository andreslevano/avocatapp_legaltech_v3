// Stripe webhook → users.billing: the grace clock starts at the first failure, survives repeated
// failures and clears on recovery.
import { expect, test } from '@playwright/test';
import { fromStripeStatus, nextBilling } from '../../functions/src/billing-status';

const T = (s: number) => ({ seconds: s }) as never;

test('grace clock', () => {
  expect(nextBilling(undefined, 'active', T(1))).toEqual({ status: 'active', pastDueSince: null });
  expect(nextBilling({ status: 'active' }, 'past_due', T(100))).toEqual({ status: 'past_due', pastDueSince: T(100) });
  expect(nextBilling({ status: 'past_due', pastDueSince: T(100) }, 'past_due', T(500))).toEqual({ status: 'past_due', pastDueSince: T(100) });
  expect(nextBilling({ status: 'past_due', pastDueSince: T(100) }, 'unpaid', T(900))).toEqual({ status: 'unpaid', pastDueSince: T(100) });
  expect(nextBilling({ status: 'past_due', pastDueSince: T(100) }, 'active', T(900))).toEqual({ status: 'active', pastDueSince: null });
  expect(nextBilling({ status: 'trialing' }, 'canceled', T(900))).toEqual({ status: 'canceled', pastDueSince: null });
  expect(fromStripeStatus('trialing')).toBe('trialing');
  expect(fromStripeStatus('paused')).toBe('pending');
});
