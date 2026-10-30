// Microsoft connector (F1) — configuration and the read-only guarantees (decision M2).
// Pure module: safe to import from client code (no secrets read here except in msServerConfig).

export const MICROSOFT_PLAN = 'Abogados';   // feature gating (single constant)

// Preview: while F1 is incomplete, only these accounts see the connector in production.
// Empty the list to release it to every Abogados user.
export const MICROSOFT_PREVIEW_EMAILS: string[] = ['andres.levano@mobilityforwork.es'];

export function canUseMicrosoft(plan: string | null | undefined, email: string | null | undefined): boolean {
  if (plan !== MICROSOFT_PLAN) return false;
  if (MICROSOFT_PREVIEW_EMAILS.length === 0) return true;
  return !!email && MICROSOFT_PREVIEW_EMAILS.includes(email.trim().toLowerCase());
}

/** Tenant id Microsoft uses for all personal (MSA) accounts. */
export const PERSONAL_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

export const CONSUMER_PICKER_BASE_URL = 'https://onedrive.live.com/picker';
export const CONSUMER_PICKER_RESOURCE = 'https://onedrive.live.com';

/**
 * Sign-in scopes. `.default` consents to exactly the permissions registered on the Entra app
 * (Graph User.Read, Files.Read.All, Sites.Read.All + SharePoint AllSites.Read, MyFiles.Read),
 * which is required so the refresh token can later mint SharePoint tokens for the File Picker.
 * The registration is the allow-list; assertReadOnlyScopes() double-checks every grant.
 */
export const LOGIN_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'https://graph.microsoft.com/.default'];
export const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

// Anything that grants writing, sending or administration. Matched against the bare scope name.
const WRITE_LIKE = /(write|manage|fullcontrol|full\.control|send|create|delete|\.all\.modify)/i;

/** Splits "https://graph.microsoft.com/Files.Read.All openid" into bare scope names. */
export function scopeNames(scope: string | undefined | null): string[] {
  return (scope ?? '').split(/\s+/).filter(Boolean).map(s => s.slice(s.lastIndexOf('/') + 1));
}

/** Throws if Microsoft granted any write-capable scope. Enforces M2 at runtime. */
export function assertReadOnlyScopes(scope: string | undefined | null): void {
  const bad = scopeNames(scope).filter(s => WRITE_LIKE.test(s));
  if (bad.length) throw new Error(`Write-capable scopes granted (${bad.join(', ')}); refusing per M2`);
}

export interface MsServerConfig {
  clientId: string;
  clientSecret: string;
  authority: string;     // e.g. https://login.microsoftonline.com/common (no trailing slash)
  redirectUri: string;
  appUrl: string;
}

export function msServerConfig(): MsServerConfig {
  const clientId = process.env.MS_CLIENT_ID ?? '';
  const clientSecret = process.env.MS_CLIENT_SECRET ?? '';
  const authority = (process.env.MS_AUTHORITY ?? 'https://login.microsoftonline.com/common').replace(/\/+$/, '');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, '');
  if (!clientId || !clientSecret) throw new Error('MS_CLIENT_ID / MS_CLIENT_SECRET not configured');
  return { clientId, clientSecret, authority, appUrl, redirectUri: `${appUrl}/api/integrations/microsoft/callback` };
}

/** Authority host without the tenant segment, e.g. https://login.microsoftonline.com */
export function authorityHost(authority: string): string {
  return new URL(authority).origin;
}

// ── returnTo sanitising ──────────────────────────────────────────

/** Only same-site relative paths ("/documents?folder=x"). Anything else → fallback. */
export function sanitizeReturnTo(raw: string | null | undefined, fallback = '/documents'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, 'https://placeholder.invalid');
    if (u.origin !== 'https://placeholder.invalid') return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** Appends query params to a relative path (keeps existing ones). */
export function withParams(path: string, params: Record<string, string>): string {
  const u = new URL(path, 'https://placeholder.invalid');
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname + u.search + u.hash;
}

// ── Picker resource allow-list ───────────────────────────────────

/**
 * The File Picker asks for tokens per resource. Only the user's own SharePoint hosts
 * ({tenant}.sharepoint.com, {tenant}-my.sharepoint.com) or OneDrive consumer are allowed.
 */
export function isAllowedPickerResource(
  resource: string, account: { accountType: 'personal' | 'work'; sharePointTenant?: string | null },
): boolean {
  let url: URL;
  try { url = new URL(resource); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  if (account.accountType === 'personal') return url.origin === CONSUMER_PICKER_RESOURCE;
  const tenant = account.sharePointTenant;
  if (!tenant) return false;
  return url.hostname === `${tenant}.sharepoint.com` || url.hostname === `${tenant}-my.sharepoint.com`;
}

/** "contoso" from https://contoso-my.sharepoint.com/personal/... or https://contoso.sharepoint.com */
export function sharePointTenantFromUrl(webUrl: string | null | undefined): string | null {
  if (!webUrl) return null;
  try {
    const host = new URL(webUrl).hostname;
    const m = host.match(/^([a-z0-9-]+?)(-my)?\.sharepoint\.com$/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}
