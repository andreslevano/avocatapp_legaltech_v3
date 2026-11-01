// DocuSign "Firmar y enviar" — configuration (plan: docs/docusign/DOCUSIGN_IMPLEMENTATION_PLAN.md).
// Pure module: client-safe except dsServerConfig(), which reads server-only env vars.

export const DOCUSIGN_PLAN = 'Abogados';   // D10 — feature gating (single constant)
export const canUseDocusign = (plan: string | null | undefined) => plan === DOCUSIGN_PLAN;

/** D1 — `signature` to send envelopes, `extended` for long-lived (rolling) refresh tokens. */
export const DOCUSIGN_SCOPES = 'signature extended';

/** Refresh the access token when less than this remains (Phase 1: "<5 min to expiry"). */
export const REFRESH_MARGIN_MS = 5 * 60_000;

export interface DsServerConfig {
  integrationKey: string;
  secretKey: string;
  oauthBase: string;     // https://account-d.docusign.com (demo) | https://account.docusign.com (prod)
  redirectUri: string;
  appUrl: string;
}

export function dsServerConfig(): DsServerConfig {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY ?? '';
  const secretKey = process.env.DOCUSIGN_SECRET_KEY ?? '';
  const oauthBase = (process.env.DOCUSIGN_OAUTH_BASE ?? 'https://account-d.docusign.com').replace(/\/+$/, '');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, '');
  if (!integrationKey || !secretKey) throw new Error('DOCUSIGN_INTEGRATION_KEY / DOCUSIGN_SECRET_KEY not configured');
  return { integrationKey, secretKey, oauthBase, appUrl, redirectUri: `${appUrl}/api/integrations/docusign/callback` };
}

/** DocuSign account as returned by /oauth/userinfo (only what we keep). */
export interface DsAccount {
  accountId: string;
  accountName: string;
  baseUri: string;       // e.g. https://demo.docusign.net — API base is baseUri + /restapi (D3)
  isDefault: boolean;
}

/** Picks the account to use: the requested one if the user has it, else the default, else the first. */
export function chooseAccount(accounts: DsAccount[], requestedId?: string | null): DsAccount | null {
  if (!accounts.length) return null;
  return accounts.find(a => a.accountId === requestedId)
    ?? accounts.find(a => a.isDefault)
    ?? accounts[0];
}
