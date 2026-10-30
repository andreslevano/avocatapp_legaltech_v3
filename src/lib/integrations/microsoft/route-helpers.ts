import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { canUseMicrosoft } from './config';
import { NotConnectedError, ReconnectRequiredError } from './errors';

/** Verifies the Firebase ID token and the plan gate. Returns uid or an error response. */
export async function requireMicrosoftUser(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await authAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const plan = (await db().collection('users').doc(uid).get()).get('plan') as string | undefined;
  if (!canUseMicrosoft(plan, email)) return NextResponse.json({ error: 'No disponible en tu plan' }, { status: 403 });
  return uid;
}

/** Uniform JSON for connector errors: the client shows the reconnect banner on `reconnect_required`. */
export function connectorErrorResponse(err: unknown): NextResponse {
  if (err instanceof ReconnectRequiredError) {
    return NextResponse.json({ error: err.message, code: 'reconnect_required' }, { status: 409 });
  }
  if (err instanceof NotConnectedError) {
    return NextResponse.json({ error: err.message, code: 'not_connected' }, { status: 409 });
  }
  console.error('[microsoft]', (err as Error)?.message ?? err);
  return NextResponse.json({ error: 'Error al comunicar con Microsoft', code: 'error' }, { status: 502 });
}
