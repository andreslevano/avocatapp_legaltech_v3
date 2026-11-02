// eSignature REST v2.1 calls (D2: plain fetch, no SDK). Server-only.
// Go-live (D13b): status comes from webhooks; the single envelope GET is the throttled refresh.

import { DocusignReconnectRequired } from './errors';
import type { DsEnvelopeSummary } from '@/lib/signatures/sync';

export interface DsCreds { accessToken: string; accountId: string; baseUri: string }

/** A DocuSign API error with a friendly Spanish message and a stable code for the UI. */
export class DocusignApiError extends Error {
  constructor(message: string, public code: string, public status: number, public dsErrorCode?: string) {
    super(message);
    this.name = 'DocusignApiError';
  }
}

/** Maps DocuSign errorCode values to friendly Spanish messages (Phase 2 "friendly errors"). */
export function friendlyDocusignError(status: number, dsErrorCode?: string): DocusignApiError {
  const c = (dsErrorCode ?? '').toUpperCase();
  if (status === 401 || c === 'USER_AUTHENTICATION_FAILED' || c === 'AUTHORIZATION_INVALID_TOKEN') {
    return new DocusignApiError('Reconecta tu cuenta de DocuSign.', 'reconnect_required', 409, c);
  }
  if (c.includes('EMAIL')) {
    return new DocusignApiError('DocuSign rechazó el email de un firmante. Revísalo e inténtalo de nuevo.', 'invalid_email', 422, c);
  }
  if (c.includes('ALLOWANCE') || c.includes('QUOTA') || c.includes('LIMIT') || c === 'ACCOUNT_LACKS_PERMISSIONS'
      || c.includes('BILLING') || c.includes('PLAN')) {
    return new DocusignApiError('Tu cuenta de DocuSign no permite enviar más sobres (límite o plan). Revisa tu suscripción de DocuSign.', 'quota', 402, c);
  }
  if (c.includes('ANCHOR')) {
    return new DocusignApiError('No encontramos los espacios de firma en el documento.', 'no_signature_blocks', 422, c);
  }
  return new DocusignApiError('DocuSign no pudo procesar la solicitud. Inténtalo de nuevo.', 'docusign_error', 502, c);
}

async function call<T>(creds: DsCreds, method: string, path: string, body?: unknown): Promise<T> {
  const url = `${creds.baseUri.replace(/\/+$/, '')}/restapi/v2.1/accounts/${creds.accountId}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { errorCode?: string; message?: string };
  if (!res.ok) {
    console.warn('[docusign/api]', method, path.replace(/[0-9a-f-]{36}/g, ':id'), res.status, data.errorCode, data.message);
    if (res.status === 401) throw new DocusignReconnectRequired();
    throw friendlyDocusignError(res.status, data.errorCode);
  }
  return data;
}

export const createEnvelope = (creds: DsCreds, definition: unknown) =>
  call<{ envelopeId: string; status: string }>(creds, 'POST', '/envelopes', definition);

/** Embedded signing URL for the owner (D5/D6). Valid ~5 min, single use. */
export const createRecipientView = (creds: DsCreds, envelopeId: string, v: {
  returnUrl: string; name: string; email: string; clientUserId: string;
  /** Focused View (5c): [page origin, DocuSign app origin] / [DocuSign app origin]. */
  frameAncestors?: string[]; messageOrigins?: string[];
}) => call<{ url: string }>(creds, 'POST', `/envelopes/${envelopeId}/views/recipient`, {
  returnUrl: v.returnUrl, authenticationMethod: 'none',
  userName: v.name, email: v.email, clientUserId: v.clientUserId, recipientId: '1',
  ...(v.frameAncestors ? { frameAncestors: v.frameAncestors, messageOrigins: v.messageOrigins } : {}),
});

/**
 * Envelope + recipients. ONLY for the manual, throttled "Actualizar estado" (D9) — never from the
 * webhook, the return page or a timer (D13b: the go-live review rejects repeated envelope GETs).
 */
export const getEnvelopeWithRecipients = (creds: DsCreds, envelopeId: string) =>
  call<DsEnvelopeSummary>(creds, 'GET', `/envelopes/${envelopeId}?include=recipients`);

/** Updates remote signers and re-sends the envelope email to them (reminder / corrected email) — one call. */
export const updateSignerAndResend = (creds: DsCreds, envelopeId: string, signers: { recipientId: string; name: string; email: string }[]) =>
  call<Record<string, unknown>>(creds, 'PUT', `/envelopes/${envelopeId}/recipients?resend_envelope=true`, { signers });

/**
 * Signed documents + Certificate of Completion as ONE PDF, in ONE call (D13b). Called once per
 * envelope when it completes (Phase 4 filing).
 */
export async function downloadCombinedPdf(creds: DsCreds, envelopeId: string): Promise<Buffer> {
  const url = `${creds.baseUri.replace(/\/+$/, '')}/restapi/v2.1/accounts/${creds.accountId}/envelopes/${envelopeId}/documents/combined?certificate=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/pdf' } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { errorCode?: string; message?: string };
    console.warn('[docusign/api] GET combined', res.status, data.errorCode, data.message);
    if (res.status === 401) throw new DocusignReconnectRequired();
    throw friendlyDocusignError(res.status, data.errorCode);
  }
  return Buffer.from(await res.arrayBuffer());
}

export const voidEnvelope = (creds: DsCreds, envelopeId: string, reason: string) =>
  call<Record<string, unknown>>(creds, 'PUT', `/envelopes/${envelopeId}`, { status: 'voided', voidedReason: reason.slice(0, 200) });
