import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { exchangeCode, getGmailUserEmail } from '@/lib/gmail';
import { saveGmailConnection } from '@/lib/email/gmail-connection';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com';

  if (error || !code || !state) {
    return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_error=${error ?? 'cancelled'}`);
  }

  // Decode state → uid:nonce
  let uid: string, nonce: string;
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    [uid, nonce] = decoded.split(':');
    if (!uid || !nonce) throw new Error('bad state');
  } catch {
    return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_error=invalid_state`);
  }

  // Verify nonce
  const userRef  = db().collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data()?.gmailAuthNonce !== nonce) {
    return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_error=invalid_state`);
  }

  // Exchange code for tokens
  let tokens: { accessToken: string; refreshToken: string; expiresAt: number };
  let gmailEmail: string;
  try {
    tokens     = await exchangeCode(code);
    gmailEmail = await getGmailUserEmail(tokens.accessToken);
  } catch {
    return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_error=token_exchange`);
  }

  // Tokens: encrypted, server-only (src/lib/email/gmail-connection.ts). The profile keeps display info only.
  if (!tokens.refreshToken) {
    return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_error=no_refresh_token`);
  }
  await saveGmailConnection(uid, { ...tokens, email: gmailEmail });
  await userRef.update({ gmailAuthNonce: FieldValue.delete() });

  return NextResponse.redirect(`${redirectBase}/tools/revision-email?gmail_connected=1`);
}
