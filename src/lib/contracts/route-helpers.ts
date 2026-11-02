import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { canUseContracts } from './config';
import { ContractError } from './server';

export interface ContractsCaller { uid: string; isAdmin: boolean }

/** Verifies the Firebase ID token and the plan + preview gate. Returns the caller or an error response. */
export async function requireContractsUser(req: NextRequest): Promise<ContractsCaller | NextResponse> {
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
  const u = (await db().collection('users').doc(uid).get()).data() ?? {};
  if (!canUseContracts(u.plan as string | undefined, email)) return NextResponse.json({ error: 'No disponible en tu plan' }, { status: 403 });
  return { uid, isAdmin: u.isAdmin === true };
}

export function contractErrorResponse(err: unknown): NextResponse {
  if (err instanceof ContractError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  console.error('[contracts]', (err as Error)?.message ?? err);
  return NextResponse.json({ error: 'No se pudo completar la acción.', code: 'error' }, { status: 500 });
}
