// Yousign webhooks (plan §7): HMAC-SHA256 verification of the raw body and payload parsing. Pure
// (node:crypto). The route must answer in < 1 s: verify, store the event, return 200.

import { createHmac, timingSafeEqual } from 'crypto';

/** x-yousign-signature-256 == 'sha256=' + hex(HMAC_SHA256(secret, rawBody)), constant-time. */
export function verifyYousignSignature(rawBody: string | Buffer, header: string | null | undefined, secret: string): boolean {
  if (!secret || !header) return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!m) return false;
  const expected = createHmac('sha256', secret).update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody).digest();
  const got = Buffer.from(m[1], 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export interface YousignEvent {
  eventId: string;
  eventName: string;
  eventTime: string;          // unix seconds (string), same across retries
  sandbox: boolean;
  signatureRequestId: string | null;
  externalId: string | null;  // our signature_requests id
  signerId: string | null;
  reason: string | null;      // signer.declined
}

/** Webhook JSON → the fields we use. null when it isn't a Yousign event we can route. */
export function parseYousignEvent(body: unknown): YousignEvent | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const data = (b.data && typeof b.data === 'object' ? b.data : {}) as Record<string, unknown>;
  const sr = (data.signature_request && typeof data.signature_request === 'object' ? data.signature_request : {}) as Record<string, unknown>;
  const signer = (data.signer && typeof data.signer === 'object' ? data.signer : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const eventId = str(b.event_id), eventName = str(b.event_name);
  if (!eventId || !eventName || !/^[\w.-]{1,128}$/.test(eventId)) return null;
  return {
    eventId, eventName,
    eventTime: String(b.event_time ?? ''),
    sandbox: b.sandbox === true,
    signatureRequestId: str(sr.id),
    externalId: str(sr.external_id),
    signerId: str(signer.id),
    reason: str(data.reason) ?? str((sr.decline_information as Record<string, unknown> | undefined)?.reason),
  };
}

/** Events that change a request (others are stored and ignored). */
export const HANDLED_EVENTS = new Set([
  'signer.link_opened', 'signer.done', 'signer.declined',
  'signature_request.done', 'signature_request.declined', 'signature_request.expired', 'signature_request.canceled',
]);
