// Subscription status → users/{uid}.billing (read by the app's access rule, src/lib/billing/access.ts).
// Kept in step with Stripe from: checkout.session.completed, customer.subscription.created / updated /
// deleted, invoice.payment_failed and invoice.paid. Idempotent: each event writes the current state.

import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const KNOWN = ['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'];
export const fromStripeStatus = (s: string): string => (KNOWN.includes(s) ? s : 'pending');

/** Next billing state; the grace clock (pastDueSince) starts at the first failure and clears on recovery. */
export function nextBilling(
  prev: { status?: string; pastDueSince?: unknown } | undefined,
  status: string,
  now: admin.firestore.Timestamp,
): { status: string; pastDueSince: unknown } {
  const failing = status === 'past_due' || status === 'unpaid';
  const wasFailing = prev?.status === 'past_due' || prev?.status === 'unpaid';
  return { status, pastDueSince: failing ? (wasFailing && prev?.pastDueSince ? prev.pastDueSince : now) : null };
}

async function findUser(db: admin.firestore.Firestore, userId: string | null | undefined, customerId: string | null | undefined) {
  if (userId) {
    const ref = db.collection('users').doc(userId);
    if ((await ref.get()).exists) return ref;
  }
  if (customerId) {
    const q = await db.collection('users').where('stripe_customer_id', '==', customerId).limit(1).get();
    if (!q.empty) return q.docs[0].ref;
  }
  return null;
}

async function write(ref: admin.firestore.DocumentReference, status: string, extra: Record<string, unknown> = {}) {
  await admin.firestore().runTransaction(async tx => {
    const prev = (await tx.get(ref)).get('billing') as { status?: string; pastDueSince?: unknown } | undefined;
    const next = nextBilling(prev, status, admin.firestore.Timestamp.now());
    tx.set(ref, { billing: { ...next, ...extra, updatedAt: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
  });
  console.log(`💳 billing ${ref.id}: ${status}`);
}

const customerOf = (c: unknown) => (typeof c === 'string' ? c : (c as { id?: string } | null)?.id ?? null);

/** Handles the subscription-status part of an event. Returns true when the event was billing-only. */
export async function applyBillingEvent(db: admin.firestore.Firestore, stripe: Stripe | null, event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== 'subscription') return false;
      const ref = await findUser(db, s.metadata?.userId ?? s.client_reference_id, customerOf(s.customer));
      if (!ref) return false;
      let status = 'active';
      const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null;
      if (stripe && subId) {
        try { status = fromStripeStatus((await stripe.subscriptions.retrieve(subId)).status); } catch (e) { console.warn('billing: subscription retrieve failed', (e as Error).message); }
      }
      await write(ref, status, { subscriptionId: subId });
      return false; // the existing handler still sets plan / customer / credits
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const ref = await findUser(db, sub.metadata?.userId, customerOf(sub.customer));
      if (!ref) { console.warn(`billing: no user for subscription ${sub.id}`); return true; }
      // A newer subscription may replace an old one: only the current subscription moves the status.
      const cur = (await ref.get()).get('billing') as { subscriptionId?: string; status?: string } | undefined;
      if (event.type === 'customer.subscription.deleted' && cur?.subscriptionId && cur.subscriptionId !== sub.id && cur.status && ['active', 'trialing'].includes(cur.status)) return true;
      await write(ref, event.type === 'customer.subscription.deleted' ? 'canceled' : fromStripeStatus(sub.status), { subscriptionId: sub.id });
      return true;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) return false;
      const ref = await findUser(db, (inv.subscription_details?.metadata as Record<string, string> | null | undefined)?.userId, customerOf(inv.customer));
      if (ref) await write(ref, 'past_due');
      return false; // purchases handler may also look at it
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) return false;
      const ref = await findUser(db, (inv.subscription_details?.metadata as Record<string, string> | null | undefined)?.userId, customerOf(inv.customer));
      if (ref) {
        const cur = (await ref.get()).get('billing') as { status?: string } | undefined;
        // A paid invoice clears a failure; a trial's €0 invoice keeps "trialing".
        if (cur?.status !== 'trialing' || (inv.amount_paid ?? 0) > 0) await write(ref, 'active');
      }
      return false; // the credits handler below still runs
    }
    default:
      return false;
  }
}
