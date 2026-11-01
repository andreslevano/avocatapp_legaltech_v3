import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { canUseDocusign } from './config';
import { DocusignApiError } from './api';
import { DocusignNotConnected, DocusignReconnectRequired } from './errors';

/** Verifies the Firebase ID token and the plan + preview gate (D10). Returns uid or an error response. */
export async function requireDocusignUser(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    ({ uid, email } = await authAdmin().verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const plan = (await db().collection('users').doc(uid).get()).get('plan') as string | undefined;
  if (!canUseDocusign(plan, email)) return NextResponse.json({ error: 'No disponible en tu plan' }, { status: 403 });
  return uid;
}

export function docusignErrorResponse(err: unknown): NextResponse {
  if (err instanceof DocusignReconnectRequired || err instanceof DocusignNotConnected) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
  }
  if (err instanceof DocusignApiError) {
    const requestId = (err as DocusignApiError & { requestId?: string }).requestId;
    return NextResponse.json({ error: err.message, code: err.code, ...(requestId ? { requestId } : {}) }, { status: err.status });
  }
  console.error('[docusign]', (err as Error)?.message ?? err);
  return NextResponse.json({ error: 'Error al comunicar con DocuSign', code: 'error' }, { status: 502 });
}
