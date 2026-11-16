import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/ratelimit';
import { clientIp } from '@/lib/data-requests/server';
import { parseWaitlist } from '@/lib/waitlist';

export const dynamic = 'force-dynamic';

// POST /api/waitlist { email, country, plan? } — "Avísame cuando esté disponible" (D6). Public,
// rate-limited, Admin SDK only (rules deny all client access to `waitlist`). One document per
// email + country; plans asked about accumulate.
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`waitlist:${clientIp(req)}`);
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429 });
  const parsed = parseWaitlist(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email, country, plan } = parsed.entry;
  try {
    const id = createHash('sha256').update(`${email}|${country}`).digest('hex').slice(0, 40);
    const ref = db().collection('waitlist').doc(id);
    await db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      tx.set(ref, {
        email, country,
        plans: plan ? FieldValue.arrayUnion(plan) : (snap.exists ? snap.get('plans') ?? [] : []),
        source: 'precios',
        updatedAt: FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist]', (err as Error).message);
    return NextResponse.json({ error: 'No se pudo guardar. Intenta de nuevo.' }, { status: 500 });
  }
}
