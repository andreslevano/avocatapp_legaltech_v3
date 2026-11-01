import { NextRequest, NextResponse } from 'next/server';
import { decodeSignedState } from '@/lib/integrations/signed-state';
import { sanitizeReturnTo, withParams } from '@/lib/integrations/urls';
import { chooseAccount, dsServerConfig } from '@/lib/docusign/config';
import { exchangeCode, getUserInfo } from '@/lib/docusign/oauth';
import { consumePendingNonce, saveConnection } from '@/lib/docusign/tokens';

// Per-request OAuth endpoint — never prerendered.
export const dynamic = 'force-dynamic';

// GET /api/integrations/docusign/callback — DocuSign redirects here after login/consent.
// Outcomes: ?ds=connected | cancelled | error | no_account on the original returnTo page.
export async function GET(req: NextRequest) {
  const { appUrl } = dsServerConfig();
  const q = req.nextUrl.searchParams;
  const state = decodeSignedState(q.get('state'));
  const returnTo = sanitizeReturnTo(state?.returnTo as string | undefined, '/profile');
  const back = (ds: string) => NextResponse.redirect(`${appUrl}${withParams(returnTo, { ds })}`);

  const error = q.get('error');
  if (error) {
    console.warn('[docusign/callback]', error, q.get('error_description') ?? '');
    return back(error === 'access_denied' ? 'cancelled' : 'error');
  }

  const code = q.get('code');
  const uid = typeof state?.uid === 'string' ? state.uid : null;
  const nonce = typeof state?.nonce === 'string' ? state.nonce : null;
  if (!code || !uid || !nonce || !(await consumePendingNonce(uid, nonce))) return back('error');

  try {
    const tokens = await exchangeCode(code);
    const info = await getUserInfo(tokens.access_token);
    const account = chooseAccount(info.accounts);    // D3: base URI from userinfo; default account first
    if (!account) return back('no_account');
    await saveConnection(uid, tokens, { name: info.name, email: info.email }, account, info.accounts);
    return back('connected');
  } catch (err) {
    console.error('[docusign/callback] connect failed:', (err as Error)?.message);
    return back('error');
  }
}
