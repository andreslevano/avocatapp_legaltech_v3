// Pure token-refresh logic (no Firebase imports) — unit-tested in tests/unit/docusign.node.spec.ts.
import { REFRESH_MARGIN_MS } from './config';
import type { DsTokenResponse } from './oauth';

export const needsRefresh = (expiresAt: number, now: number) => expiresAt - now < REFRESH_MARGIN_MS;

/**
 * Returns a usable access token. If it expires within REFRESH_MARGIN_MS, refreshes it with
 * `refresh` and returns the new tokens so the caller can persist them. invalid_grant from the
 * refresher surfaces as DocusignReconnectRequired.
 */
export async function resolveAccessToken(
  current: { accessToken: string; refreshToken: string; expiresAt: number },
  now: number,
  refresh: (refreshToken: string) => Promise<DsTokenResponse>,
): Promise<{ accessToken: string; refreshed: null | { accessToken: string; refreshToken: string; expiresAt: number } }> {
  if (!needsRefresh(current.expiresAt, now)) return { accessToken: current.accessToken, refreshed: null };
  const t = await refresh(current.refreshToken);
  const refreshed = {
    accessToken: t.access_token,
    refreshToken: t.refresh_token || current.refreshToken,
    expiresAt: now + t.expires_in * 1000,
  };
  return { accessToken: refreshed.accessToken, refreshed };
}
