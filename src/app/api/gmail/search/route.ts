import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { refreshAccessToken, searchMessages } from '@/lib/gmail';

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

  const { query, maxResults = 20 } = (await req.json()) as { query: string; maxResults?: number };

  const userRef  = db().collection('users').doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() ?? {};

  if (!userData.gmailConnected || !userData.gmailRefreshToken) {
    return NextResponse.json({ error: 'gmail_not_connected' }, { status: 400 });
  }

  let accessToken = userData.gmailAccessToken as string;
  let expiresAt   = userData.gmailTokenExpiresAt as number ?? 0;

  // Refresh if expired (with 60s buffer)
  if (Date.now() > expiresAt - 60_000) {
    try {
      const refreshed = await refreshAccessToken(userData.gmailRefreshToken as string);
      accessToken = refreshed.accessToken;
      expiresAt   = refreshed.expiresAt;
      await userRef.update({ gmailAccessToken: accessToken, gmailTokenExpiresAt: expiresAt });
    } catch {
      await userRef.update({ gmailConnected: false });
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }
  }

  try {
    const messages = await searchMessages(accessToken, query, maxResults);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
