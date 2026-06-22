import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, authAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ ok: false, remaining: 0, error: 'missing_token' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await authAdmin().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ ok: false, remaining: 0, error: 'invalid_token' }, { status: 401 });
    }

    const { descripcion } = (await req.json().catch(() => ({}))) as { descripcion?: string };

    const userRef = db().collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, remaining: 0, error: 'user_not_found' }, { status: 404 });
    }

    const userData = snap.data()!;

    // Non-Autoservicio users have unlimited access — no deduction
    if (userData.plan !== 'Autoservicio') {
      return NextResponse.json({ ok: true, remaining: -1 });
    }

    const disponibles: number = typeof userData.creditos_disponibles === 'number'
      ? userData.creditos_disponibles
      : 0;

    if (disponibles <= 0) {
      return NextResponse.json({ ok: false, remaining: 0, error: 'insufficient_credits' });
    }

    // Atomic decrement inside a transaction
    const newBalance = await db().runTransaction(async (tx) => {
      const freshSnap = await tx.get(userRef);
      const fresh = freshSnap.data()!;
      const current: number = typeof fresh.creditos_disponibles === 'number'
        ? fresh.creditos_disponibles
        : 0;

      if (current <= 0) return 0;

      tx.update(userRef, {
        creditos_disponibles: FieldValue.increment(-1),
        creditos_consumidos: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Append to audit log
      const logRef = userRef.collection('creditos_log').doc();
      tx.set(logRef, {
        tipo: 'consume',
        cantidad: 1,
        descripcion: descripcion ?? 'Operación de herramienta',
        createdAt: FieldValue.serverTimestamp(),
      });

      return current - 1;
    });

    if (newBalance === 0 && disponibles > 0) {
      // Transaction found 0 balance on re-read (concurrent request raced ahead)
      return NextResponse.json({ ok: false, remaining: 0, error: 'insufficient_credits' });
    }

    return NextResponse.json({ ok: true, remaining: newBalance });
  } catch (err) {
    console.error('[api/creditos/consumir]', err);
    return NextResponse.json({ ok: false, remaining: 0, error: 'internal_error' }, { status: 500 });
  }
}
