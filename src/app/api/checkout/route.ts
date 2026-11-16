import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { requireCaller } from '@/lib/data-requests/server';
import { parseCheckout, sessionPlan } from '@/lib/checkout';
import { PLAN_DASHBOARDS } from '@/lib/plans';
import { planById } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// POST /api/checkout { item: planId | 'pack30', country, interval } (ID token) → { url } or
// { available: false }. Price ids are resolved here from env; the client never sends one.
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const parsed = parseCheckout(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });

  const plan = sessionPlan(parsed, caller.uid, process.env);
  if (!plan) return NextResponse.json({ available: false });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ available: false });

  const user = (await db().collection('users').doc(caller.uid).get()).data() ?? {};
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com';
  const stored = parsed.item === 'pack30' ? (user.plan as keyof typeof PLAN_DASHBOARDS | undefined) : planById(parsed.item).stored;
  const landing = (stored && PLAN_DASHBOARDS[stored]) || '/agent';
  const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      ...(user.stripe_customer_id ? { customer: String(user.stripe_customer_id) } : { customer_email: caller.email }),
      client_reference_id: caller.uid,
      metadata: plan.metadata,
      ...(plan.mode === 'subscription'
        ? { subscription_data: { metadata: plan.metadata, ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}) } }
        : { payment_intent_data: { metadata: plan.metadata } }),
      // B2C prices are tax-inclusive, B2B exclusive: set on each Stripe price (tax_behavior). Stripe Tax
      // calculates it when enabled for the account.
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' ? { automatic_tax: { enabled: true }, tax_id_collection: { enabled: true } } : {}),
      allow_promotion_codes: true,
      success_url: `${origin}${landing}?checkout=ok`,
      cancel_url: `${origin}/precios?pais=${parsed.country.toLowerCase()}&checkout=cancelado`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo iniciar el pago. Intenta de nuevo.' }, { status: 502 });
  }
}
