// Signed OAuth `state` for the Microsoft connect flow. Server-only (uses the integration key).
import { sign, verifySignature } from '@/lib/integrations/crypto';
import { sanitizeReturnTo } from './config';

export interface ConnectState {
  uid: string;
  nonce: string;
  returnTo: string;               // safe relative path
  intent: 'import' | 'connect';
  folderId: string | null;
  caseId: string | null;
}

export function encodeState(s: ConnectState): string {
  const body = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Returns the state only if the signature is valid; returnTo is re-sanitised on the way out. */
export function decodeState(raw: string | null | undefined): ConnectState | null {
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig || !verifySignature(body, sig)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ConnectState;
    if (typeof s.uid !== 'string' || typeof s.nonce !== 'string') return null;
    return {
      uid: s.uid,
      nonce: s.nonce,
      returnTo: sanitizeReturnTo(s.returnTo),
      intent: s.intent === 'import' ? 'import' : 'connect',
      folderId: typeof s.folderId === 'string' ? s.folderId : null,
      caseId: typeof s.caseId === 'string' ? s.caseId : null,
    };
  } catch {
    return null;
  }
}
