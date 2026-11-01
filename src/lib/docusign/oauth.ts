// DocuSign OAuth Authorization Code Grant (confidential client, D1). Server-only.
import { DOCUSIGN_SCOPES, dsServerConfig, type DsAccount } from './config';
import { DocusignReconnectRequired } from './errors';

export interface DsTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;       // seconds (typically 8 h)
  token_type: string;
}

export function buildAuthorizeUrl(state: string, opts?: { forceLogin?: boolean }): string {
  const cfg = dsServerConfig();
  const url = new URL(`${cfg.oauthBase}/oauth/auth`);
  url.search = new URLSearchParams({
    response_type: 'code',
    scope: DOCUSIGN_SCOPES,
    client_id: cfg.integrationKey,
    redirect_uri: cfg.redirectUri,
    state,
    ...(opts?.forceLogin ? { prompt: 'login' } : {}),
  }).toString();
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<DsTokenResponse> {
  const cfg = dsServerConfig();
  const res = await fetch(`${cfg.oauthBase}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.integrationKey}:${cfg.secretKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({})) as DsTokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    // invalid_grant = refresh token expired/revoked or consent withdrawn → user must reconnect.
    if (body.error === 'invalid_grant' || body.error === 'consent_required') throw new DocusignReconnectRequired();
    throw new Error(`DocuSign token error: ${body.error ?? res.status} ${body.error_description ?? ''}`.trim());
  }
  return body;
}

export const exchangeCode = (code: string) => tokenRequest({ grant_type: 'authorization_code', code });

export const refreshTokens = (refreshToken: string) => tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });

export interface DsUserInfo {
  sub: string;
  name: string;
  email: string;
  accounts: DsAccount[];
}

/** D3 — the API base URI always comes from userinfo, never hard-coded. */
export async function getUserInfo(accessToken: string): Promise<DsUserInfo> {
  const cfg = dsServerConfig();
  const res = await fetch(`${cfg.oauthBase}/oauth/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new DocusignReconnectRequired();
  if (!res.ok) throw new Error(`DocuSign userinfo → ${res.status}`);
  const u = await res.json() as {
    sub: string; name: string; email: string;
    accounts?: { account_id: string; account_name: string; base_uri: string; is_default: boolean | string }[];
  };
  return {
    sub: u.sub,
    name: u.name,
    email: u.email,
    accounts: (u.accounts ?? []).map(a => ({
      accountId: a.account_id,
      accountName: a.account_name,
      baseUri: a.base_uri.replace(/\/+$/, ''),
      isDefault: a.is_default === true || a.is_default === 'true',
    })),
  };
}
