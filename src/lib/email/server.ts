// Revisión de Email — the user's mail accounts and provider-neutral search/read. Server-only.
import { promises as dns } from 'dns';
import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, db } from '@/lib/firebase-admin';
import { canUseMicrosoft } from '@/lib/integrations/microsoft/config';
import { getAccessToken } from '@/lib/integrations/microsoft/connection';
import { NotConnectedError, ReconnectRequiredError } from '@/lib/integrations/microsoft/errors';
import { searchMessages, fetchFullMessage } from '@/lib/gmail';
import { gmailQuery, outlookSearch, providerForDomain, type EmailMessage, type EmailMessageFull, type EmailProvider, type SearchCriteria } from './core';
import { getGmailAccessToken, gmailDisplay, GmailNotConnected, GmailReconnect } from './gmail-connection';
import { fetchOutlookMessage, OutlookMailNotGranted, searchOutlook } from './outlook';

export interface EmailCaller { uid: string; email: string | null; emailVerified: boolean; plan?: string }

export async function requireEmailCaller(req: NextRequest): Promise<EmailCaller | NextResponse> {
  const h = req.headers.get('Authorization') ?? '';
  const idToken = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const t = await authAdmin().verifyIdToken(idToken);
    return { uid: t.uid, email: t.email ?? null, emailVerified: t.email_verified === true };
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

/** Which provider hosts the login email (MX lookup, 2 s max). */
async function suggestedProvider(email: string | null): Promise<EmailProvider | null> {
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  const quick = providerForDomain(domain);
  if (quick) return quick;
  const mx = await Promise.race([
    dns.resolveMx(domain).then(r => r.map(x => x.exchange)).catch(() => [] as string[]),
    new Promise<string[]>(res => setTimeout(() => res([]), 2000)),
  ]);
  return providerForDomain(domain, mx);
}

export interface EmailStatus {
  loginEmail: string | null;
  suggested: EmailProvider | null;
  outlookAvailable: boolean;
  gmail: { email: string; status: 'connected' | 'reauth_required' } | null;
  outlook: { email: string; status: 'connected' | 'reauth_required'; mail: boolean } | null;
}

export async function emailStatus(c: EmailCaller): Promise<EmailStatus> {
  const u = (await db().collection('users').doc(c.uid).get()).data() ?? {};
  const ms = (u.integrations as { microsoft?: { email?: string; status?: string; mail?: boolean } } | undefined)?.microsoft;
  const outlookAvailable = canUseMicrosoft(u.plan as string | undefined, { email: c.email, emailVerified: c.emailVerified });
  return {
    loginEmail: c.email,
    suggested: await suggestedProvider(c.email),
    outlookAvailable,
    gmail: gmailDisplay(u),
    outlook: outlookAvailable && ms?.email
      ? { email: ms.email, status: ms.status === 'reauth_required' ? 'reauth_required' : 'connected', mail: ms.mail === true }
      : null,
  };
}

async function outlookToken(c: EmailCaller): Promise<string> {
  const plan = (await db().collection('users').doc(c.uid).get()).get('plan') as string | undefined;
  if (!canUseMicrosoft(plan, { email: c.email, emailVerified: c.emailVerified })) throw Object.assign(new Error('No disponible en tu plan'), { code: 'forbidden', status: 403 });
  return (await getAccessToken(c.uid)).token;
}

/** Access token for the provider (Gmail: refreshed, encrypted store; Outlook: Microsoft connection, plan-gated). */
export async function tokenFor(c: EmailCaller, provider: EmailProvider): Promise<string> {
  return provider === 'gmail' ? getGmailAccessToken(c.uid) : outlookToken(c);
}

export async function searchEmail(c: EmailCaller, provider: EmailProvider, criteria: SearchCriteria): Promise<EmailMessage[]> {
  if (provider === 'gmail') return searchMessages(await getGmailAccessToken(c.uid), gmailQuery(criteria), 20);
  return searchOutlook(await outlookToken(c), outlookSearch(criteria), 20);
}

export async function readEmail(c: EmailCaller, provider: EmailProvider, id: string): Promise<EmailMessageFull> {
  if (provider === 'gmail') {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw Object.assign(new Error('Identificador de email no válido.'), { status: 400 });
    return fetchFullMessage(await getGmailAccessToken(c.uid), id);
  }
  return fetchOutlookMessage(await outlookToken(c), id);
}

/** Uniform errors: the page shows "Vuelve a conectar" / "Dar acceso al correo" from `code`. */
export function emailErrorResponse(err: unknown): NextResponse {
  const e = err as Error & { code?: string; status?: number; expose?: boolean };
  if (e instanceof GmailNotConnected || e instanceof NotConnectedError) return NextResponse.json({ error: e.message, code: 'not_connected' }, { status: 409 });
  if (e instanceof GmailReconnect || e instanceof ReconnectRequiredError) return NextResponse.json({ error: e.message, code: 'reconnect_required' }, { status: 409 });
  if (e instanceof OutlookMailNotGranted) return NextResponse.json({ error: e.message, code: 'mail_not_granted' }, { status: 409 });
  if (e.expose && e.status) return NextResponse.json({ error: e.message, code: 'step_failed' }, { status: e.status });
  if (e.status === 400 || e.status === 403 || e.status === 404) return NextResponse.json({ error: e.message, code: e.code ?? 'error' }, { status: e.status });
  console.error('[email]', e?.message ?? err);
  return NextResponse.json({ error: 'No pudimos leer el correo. Inténtalo de nuevo.', code: 'error' }, { status: 502 });
}

export const isProvider = (v: unknown): v is EmailProvider => v === 'gmail' || v === 'outlook';
