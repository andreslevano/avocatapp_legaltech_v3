import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { requireCaller } from '@/lib/data-requests/server';

export const dynamic = 'force-dynamic';

// POST /api/billing/portal { returnPath? } (ID token) → { url } — the caller's own Stripe billing
// portal (update card, invoices, cancel / reactivate). Deliberately NOT payment-gated: it's how a
// blocked user fixes their payment.
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'Pagos no disponibles.' }, { status: 503 });
  const customer = (await db().collection('users').doc(caller.uid).get()).get('stripe_customer_id') as string | undefined;
  if (!customer) return NextResponse.json({ error: 'no_stripe_customer' }, { status: 404 });
  const b = await req.json().catch(() => ({})) as { returnPath?: unknown };
  const path = typeof b.returnPath === 'string' && /^\/[A-Za-z0-9/_-]{0,80}$/.test(b.returnPath) ? b.returnPath : '/settings/suscripcion';
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com';
  try {
    const stripe = new Stripe(key, { apiVersion: '2023-10-16' });
    const s = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}${path}` });
    return NextResponse.json({ url: s.url });
  } catch (err) {
    console.error('[billing/portal]', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo abrir el portal de pagos. Inténtalo de nuevo.' }, { status: 502 });
  }
}
