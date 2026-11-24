// Revisión de Email — provider-neutral pieces (Gmail and Outlook). Pure, client-safe, unit tested.

export type EmailProvider = 'gmail' | 'outlook';
export const PROVIDER_LABEL: Record<EmailProvider, string> = { gmail: 'Gmail', outlook: 'Outlook' };

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
}

export interface EmailMessageFull extends EmailMessage {
  bodyText: string;
  /** `id`: to download it when the user ticks it for the analysis or saves it to a case. */
  attachments: { id?: string; name: string; mimeType: string; size: number }[];
}

export interface SearchCriteria { keywords?: string; from?: string; dateFrom?: string; dateTo?: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (s: string | undefined, max: number) => (s ?? '').replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Gmail search syntax (q=). Empty → the inbox. */
export function gmailQuery(c: SearchCriteria): string {
  const parts: string[] = [];
  const k = clean(c.keywords, 200), f = clean(c.from, 254);
  if (k) parts.push(k);
  if (f) parts.push(`from:${f}`);
  if (c.dateFrom && ISO.test(c.dateFrom)) parts.push(`after:${c.dateFrom.replace(/-/g, '/')}`);
  if (c.dateTo && ISO.test(c.dateTo)) parts.push(`before:${c.dateTo.replace(/-/g, '/')}`);
  return parts.join(' ') || 'in:inbox';
}

/** Outlook (Microsoft Graph $search, KQL). null → no criteria: list the inbox newest first. */
export function outlookSearch(c: SearchCriteria): string | null {
  const parts: string[] = [];
  const k = clean(c.keywords, 200), f = clean(c.from, 254);
  if (k) parts.push(k);
  if (f) parts.push(`from:${f}`);
  if (c.dateFrom && ISO.test(c.dateFrom)) parts.push(`received>=${c.dateFrom}`);
  if (c.dateTo && ISO.test(c.dateTo)) parts.push(`received<=${c.dateTo}`);
  return parts.length ? `"${parts.join(' ')}"` : null;
}

// ── Which provider hosts the login email (to propose it by default) ──

const GOOGLE_CONSUMER = new Set(['gmail.com', 'googlemail.com']);
const MICROSOFT_CONSUMER = new Set(['outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es', 'live.com', 'live.es', 'msn.com']);

/** From the email domain and its MX hosts: 'gmail' (Google / Workspace), 'outlook' (Microsoft 365 / Outlook.com) or null. */
export function providerForDomain(domain: string, mxHosts: string[] = []): EmailProvider | null {
  const d = domain.trim().toLowerCase();
  if (GOOGLE_CONSUMER.has(d)) return 'gmail';
  if (MICROSOFT_CONSUMER.has(d)) return 'outlook';
  const hosts = mxHosts.map(h => h.toLowerCase().replace(/\.$/, ''));
  if (hosts.some(h => /(^|\.)google(mail)?\.com$/.test(h) || /\.googlemail\.com$/.test(h))) return 'gmail';
  if (hosts.some(h => /\.mail\.protection\.outlook\.com$/.test(h) || /(^|\.)outlook\.com$/.test(h) || /\.hotmail\.com$/.test(h))) return 'outlook';
  return null;
}
