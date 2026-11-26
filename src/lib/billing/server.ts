// Server side of the payment rule (src/lib/billing/access.ts): the paid AI routes refuse callers
// whose access is blocked, so skipping the app's screen check doesn't help. Server-only.

import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authAdmin, db } from '@/lib/firebase-admin';
import { isPilotUser } from '@/lib/pilot-users';
import { accessForUserDoc, ACCESS_MESSAGE, type Access } from './access';

export async function accessOf(uid: string, email?: string | null): Promise<Access> {
  const snap = await db().collection('users').doc(uid).get();
  return accessForUserDoc(snap.exists ? snap.data() : null, { pilot: isPilotUser(email) });
}

/** null when the caller may use paid features; otherwise a 402 response (`code: 'payment_required'`). */
export async function paymentGate(uid: string, email?: string | null, headers?: HeadersInit): Promise<NextResponse | null> {
  try {
    const a = await accessOf(uid, email);
    if (a.allowed) return null;
    return NextResponse.json({ error: ACCESS_MESSAGE[a.reason], code: 'payment_required', reason: a.reason }, { status: 402, headers });
  } catch (err) {
    // Never lock paying users out because of a read error.
    console.error('[billing/gate]', (err as Error)?.message);
    return null;
  }
}

/** Checkout started for a subscription: remember what to reopen, without downgrading a live subscription. */
export async function markCheckoutPending(uid: string, info: { item: string; country: string; interval: 'monthly' | 'annual' }) {
  const ref = db().collection('users').doc(uid);
  const cur = (await ref.get()).get('billing') as { status?: string } | undefined;
  const live = cur?.status && ['active', 'trialing', 'past_due', 'unpaid'].includes(cur.status);
  await ref.set({
    billing: live
      ? { ...cur, item: info.item, country: info.country, interval: info.interval }
      : { status: 'pending', item: info.item, country: info.country, interval: info.interval, pastDueSince: null, updatedAt: FieldValue.serverTimestamp() },
  }, { merge: true });
}

/**
 * Login + payment for the paid AI routes. Returns the caller, or the 401 / 402 response to send.
 * `headers` lets CORS routes (called straight on Cloud Run) attach their headers to the refusal.
 */
export async function requirePaidCaller(req: Request, headers?: HeadersInit): Promise<{ uid: string; email: string | null } | NextResponse> {
  const h = req.headers.get('Authorization') ?? '';
  const idToken = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  let uid: string, email: string | null;
  try {
    const t = await authAdmin().verifyIdToken(idToken);
    uid = t.uid; email = t.email ?? null;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers });
  }
  return (await paymentGate(uid, email, headers)) ?? { uid, email };
}
