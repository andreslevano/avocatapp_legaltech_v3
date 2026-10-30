import { NextRequest, NextResponse } from 'next/server';
import { msServerConfig, sharePointTenantFromUrl, withParams, CONSUMER_PICKER_BASE_URL } from '@/lib/integrations/microsoft/config';
import { consumePending, isPersonalTenant, saveConnection } from '@/lib/integrations/microsoft/connection';
import { classifyAuthError } from '@/lib/integrations/microsoft/errors';
import { decodeJwtClaims, exchangeCode, graphGet } from '@/lib/integrations/microsoft/oauth';
import { decodeState } from '@/lib/integrations/microsoft/state';

// GET /api/integrations/microsoft/callback — Microsoft redirects here after sign-in/consent.
export async function GET(req: NextRequest) {
  const { appUrl } = msServerConfig();
  const q = req.nextUrl.searchParams;
  const state = decodeState(q.get('state'));
  const returnTo = state?.returnTo ?? '/documents';
  const back = (params: Record<string, string>) => NextResponse.redirect(`${appUrl}${withParams(returnTo, params)}`);

  // ── Admin consent result (an administrator approved Avocat for their tenant) ──
  if (q.get('admin_consent')) {
    return back({ ms: q.get('admin_consent')?.toLowerCase() === 'true' ? 'admin_granted' : 'error' });
  }

  // ── Error outcomes ────────────────────────────────────────────
  const error = q.get('error');
  if (error) {
    const outcome = classifyAuthError(error, q.get('error_description'), q.get('error_subcode'));
    console.warn('[microsoft/callback]', error, (q.get('error_description') ?? '').split('\r\n')[0]);
    if (outcome === 'admin_consent') {
      const tid = (q.get('error_description') ?? '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
      const page = new URL(`${appUrl}/integrations/microsoft/admin-consent`);
      page.searchParams.set('returnTo', returnTo);
      if (tid) page.searchParams.set('tid', tid);
      return NextResponse.redirect(page.toString());
    }
    return back({ ms: outcome === 'cancelled' ? 'cancelled' : 'error' });
  }

  // ── Success: verify state + nonce, exchange code ──────────────
  const code = q.get('code');
  if (!state || !code) return back({ ms: 'error' });
  const verifier = await consumePending(state.uid, state.nonce);
  if (!verifier) return back({ ms: 'error' });

  try {
    const tokens = await exchangeCode(code, verifier);   // throws on write-capable scopes (M2)
    if (!tokens.refresh_token) throw new Error('No refresh token (offline_access missing)');
    const claims = decodeJwtClaims(tokens.id_token);
    const tenantId = String(claims.tid ?? '');
    const personal = isPersonalTenant(tenantId);

    const me = await graphGet<{ displayName?: string; mail?: string; userPrincipalName?: string }>(
      tokens.access_token, '/me?$select=displayName,mail,userPrincipalName');
    const drive = await graphGet<{ webUrl?: string }>(tokens.access_token, '/me/drive?$select=webUrl').catch(() => ({ webUrl: undefined }));
    let tenantName: string | null = null;
    if (!personal) {
      const org = await graphGet<{ value?: { displayName?: string }[] }>(tokens.access_token, '/organization?$select=displayName')
        .catch(() => ({ value: [] }));
      tenantName = org.value?.[0]?.displayName ?? null;
    }

    const sharePointTenant = personal ? null : sharePointTenantFromUrl(drive.webUrl);
    const pickerBaseUrl = personal
      ? CONSUMER_PICKER_BASE_URL
      : sharePointTenant ? `https://${sharePointTenant}-my.sharepoint.com` : null;

    await saveConnection(state.uid, {
      refreshToken: tokens.refresh_token,
      accountType: personal ? 'personal' : 'work',
      tenantId,
      sharePointTenant,
      scope: tokens.scope ?? '',
    }, {
      email: me.mail ?? me.userPrincipalName ?? String(claims.preferred_username ?? claims.email ?? ''),
      displayName: me.displayName ?? String(claims.name ?? ''),
      tenantId,
      tenantName,
      accountType: personal ? 'personal' : 'work',
      pickerBaseUrl,
    });

    const params: Record<string, string> = { ms: 'connected' };
    if (state.intent === 'import') params.intent = 'import';
    return back(params);
  } catch (err) {
    console.error('[microsoft/callback] connect failed:', (err as Error)?.message);
    return back({ ms: 'error' });
  }
}
