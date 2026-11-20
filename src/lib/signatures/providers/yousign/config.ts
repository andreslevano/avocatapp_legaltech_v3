// Yousign configuration (plan §3.2, §10). Pure helpers + server-only env readers. The API key and
// webhook secret are never logged or sent to the browser.

export interface YsConfig { apiKey: string; apiBase: string; webhookSecret: string; sandbox: boolean; appUrl: string }

export function ysConfig(): YsConfig {
  const apiKey = process.env.YOUSIGN_API_KEY ?? '';
  const apiBase = (process.env.YOUSIGN_API_BASE ?? 'https://api-sandbox.yousign.app/v3').replace(/\/+$/, '');
  if (!apiKey) throw new Error('YOUSIGN_API_KEY not configured');
  return {
    apiKey, apiBase, webhookSecret: process.env.YOUSIGN_WEBHOOK_SECRET ?? '',
    sandbox: isSandboxBase(apiBase),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? 'https://avocatapp.com').replace(/\/+$/, ''),
  };
}

export const isSandboxBase = (base: string) => /api-sandbox\.yousign\.app/.test(base);
export const yousignConfigured = () => !!process.env.YOUSIGN_API_KEY;

export type ProviderChoice = 'yousign' | 'docusign';

/** New requests: SIGNATURE_PROVIDER_DEFAULT (default yousign); DocuSign only if enabled. Pure (env passed in). */
export function defaultProvider(env: Record<string, string | undefined> = process.env): ProviderChoice {
  const wanted = (env.SIGNATURE_PROVIDER_DEFAULT ?? 'yousign').trim().toLowerCase();
  if (wanted === 'docusign' && env.DOCUSIGN_ENABLED === 'true') return 'docusign';
  if (env.YOUSIGN_API_KEY) return 'yousign';
  // No Yousign key yet: keep DocuSign (today's behaviour) unless it was explicitly switched off.
  return env.DOCUSIGN_ENABLED === 'false' ? 'yousign' : 'docusign';
}

/** DocuSign can be chosen for new requests: DOCUSIGN_ENABLED=true, or no Yousign key yet (today's setup). */
export const docusignEnabled = (env: Record<string, string | undefined> = process.env) =>
  env.DOCUSIGN_ENABLED === 'true' || (!env.YOUSIGN_API_KEY && env.DOCUSIGN_ENABLED !== 'false');

/** expiration_date for Yousign: yyyy-mm-dd, no offset; 1..365 days from now (UTC date). */
export function expirationDate(now: Date, days: number): string {
  const d = Math.min(365, Math.max(1, Math.round(days)));
  return new Date(now.getTime() + d * 86_400_000).toISOString().slice(0, 10);
}

/** Sandbox iframes need disable_domain_validation=true (ignored in production). */
export function embedLink(link: string, sandbox: boolean): string {
  if (!sandbox) return link;
  return link + (link.includes('?') ? '&' : '?') + 'disable_domain_validation=true';
}

/** "Ana María López" → { first_name: 'Ana', last_name: 'María López' } (Yousign needs both). */
export function splitName(full: string): { first_name: string; last_name: string } {
  const parts = (full || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (!parts.length) return { first_name: '-', last_name: '-' };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}
