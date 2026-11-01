// Signed, tamper-proof OAuth `state` shared by integrations. Server-only (uses the integration key).
// Format: base64url(JSON) + "." + HMAC-SHA256. Callers validate the decoded shape.
import { sign, verifySignature } from './crypto';

export function encodeSignedState(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Returns the parsed JSON only if the signature is valid. */
export function decodeSignedState(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig || !verifySignature(body, sig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
