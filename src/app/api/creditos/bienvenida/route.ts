import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authAdmin, db } from '@/lib/firebase-admin';
import { requireCaller } from '@/lib/data-requests/server';
import { WELCOME_CREDITS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** Only new accounts get them (signup calls this right after creating the account). */
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

// POST /api/creditos/bienvenida (ID token) — Precios v4 (D1): 20 welcome credits, once per account.
// Server-side because users can't write credits (firestore.rules). Idempotent: welcomeCreditsGranted.
export async function POST(req: NextRequest) {
  const caller = await requireCaller(req);
  if (caller instanceof NextResponse) return caller;
  const created = Date.parse((await authAdmin().getUser(caller.uid)).metadata.creationTime ?? '');
  if (!(created > Date.now() - NEW_ACCOUNT_MS)) return NextResponse.json({ granted: false, reason: 'not_new' });

  const userRef = db().collection('users').doc(caller.uid);
  const granted = await db().runTransaction(async tx => {
    const snap = await tx.get(userRef);
    if (snap.get('welcomeCreditsGranted') === true) return false;
    tx.set(userRef, {
      creditos_disponibles: FieldValue.increment(WELCOME_CREDITS),
      welcomeCreditsGranted: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.create(userRef.collection('creditos_log').doc('welcome'), {
      tipo: 'grant_welcome', cantidad: WELCOME_CREDITS, descripcion: 'Créditos de bienvenida',
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  return NextResponse.json({ granted, credits: granted ? WELCOME_CREDITS : 0 });
}
