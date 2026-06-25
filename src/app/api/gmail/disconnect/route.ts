import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await authAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  await db().collection('users').doc(uid).update({
    gmailConnected:      false,
    gmailEmail:          FieldValue.delete(),
    gmailAccessToken:    FieldValue.delete(),
    gmailRefreshToken:   FieldValue.delete(),
    gmailTokenExpiresAt: FieldValue.delete(),
  });

  return NextResponse.json({ ok: true });
}
