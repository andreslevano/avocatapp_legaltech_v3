import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { getOAuthUrl } from '@/lib/gmail';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  let loginEmail: string | undefined;
  try {
    const decoded = await authAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
    loginEmail = decoded.email;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Generate a random nonce to protect the OAuth callback from CSRF
  const nonce = crypto.randomBytes(16).toString('hex');
  await db().collection('users').doc(uid).update({ gmailAuthNonce: nonce });

  // Encode uid + nonce in state so the callback can find the user
  const state = Buffer.from(`${uid}:${nonce}`).toString('base64url');
  // ?account=login → Google preselects the Avocat login email; ?account=other → Google asks which one.
  const useLogin = req.nextUrl.searchParams.get('account') === 'login';
  const url   = getOAuthUrl(state, { loginHint: useLogin ? loginEmail : null });

  return NextResponse.json({ url });
}
