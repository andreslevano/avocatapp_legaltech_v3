// Microsoft identity platform (v2.0) — auth code + PKCE, confidential client. Server-only.
// Read-only by construction: only GET requests to Graph, and every token grant is checked by
// assertReadOnlyScopes().

import { sha256Base64Url } from '@/lib/integrations/crypto';
import { LOGIN_SCOPES, assertReadOnlyScopes, authorityHost, msServerConfig } from './config';
import { isReauthError, ReconnectRequiredError } from './errors';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  scope?: string;
}

export function buildAuthorizeUrl(opts: { state: string; codeVerifier: string; prompt?: 'select_account' }): string {
  const cfg = msServerConfig();
  const url = new URL(`${cfg.authority}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    response_mode: 'query',
    scope: LOGIN_SCOPES.join(' '),
    state: opts.state,
    code_challenge: sha256Base64Url(opts.codeVerifier),
    code_challenge_method: 'S256',
    prompt: opts.prompt ?? 'select_account',
  }).toString();
  return url.toString();
}

async function tokenRequest(authority: string, params: Record<string, string>): Promise<TokenResponse> {
  const cfg = msServerConfig();
  const res = await fetch(`${authority}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params }).toString(),
  });
  const body = await res.json().catch(() => ({})) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    if (isReauthError(body)) throw new ReconnectRequiredError();
    throw new Error(`Microsoft token error: ${body.error ?? res.status} ${(body.error_description ?? '').split('\r\n')[0]}`);
  }
  assertReadOnlyScopes(body.scope);
  return body;
}

export function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const cfg = msServerConfig();
  return tokenRequest(cfg.authority, {
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: cfg.redirectUri,
    scope: LOGIN_SCOPES.join(' '),
  });
}

/**
 * Redeems the refresh token for an access token to `scope` (Graph, a SharePoint host, or
 * OneDrive consumer). Uses the account's own tenant authority when known.
 */
export function refreshAccessToken(refreshToken: string, scope: string, tenant?: string | null): Promise<TokenResponse> {
  const cfg = msServerConfig();
  const authority = tenant ? `${authorityHost(cfg.authority)}/${tenant}` : cfg.authority;
  return tokenRequest(authority, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: `${scope} offline_access`,
  });
}

/** Claims of the id_token received directly from the token endpoint over TLS (not re-verified). */
export function decodeJwtClaims(jwt: string | undefined): Record<string, unknown> {
  if (!jwt) return {};
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

// ── Graph (GET only) ─────────────────────────────────────────────

export async function graphGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new ReconnectRequiredError();
  if (!res.ok) throw new Error(`Graph ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
