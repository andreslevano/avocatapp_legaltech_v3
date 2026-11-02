import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { LegalError } from './server';

/** Verifies the Firebase ID token and users/{uid}.isAdmin (server-side; the client flag is protected in rules). */
export async function requireLegalAdmin(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let uid: string;
  try {
    ({ uid } = await authAdmin().verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const isAdmin = (await db().collection('users').doc(uid).get()).get('isAdmin') === true;
  if (!isAdmin) return NextResponse.json({ error: 'Solo administradores.' }, { status: 403 });
  return uid;
}

export function legalErrorResponse(err: unknown): NextResponse {
  if (err instanceof LegalError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  console.error('[legal]', (err as Error)?.message ?? err);
  return NextResponse.json({ error: 'No se pudo completar la acción.', code: 'error' }, { status: 500 });
}
