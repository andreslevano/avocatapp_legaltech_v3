// Signed OAuth `state` for the Microsoft connect flow. Server-only (uses the integration key).
import { decodeSignedState, encodeSignedState } from '@/lib/integrations/signed-state';
import { sanitizeReturnTo } from './config';

export interface ConnectState {
  uid: string;
  nonce: string;
  returnTo: string;               // safe relative path
  intent: 'import' | 'connect';
  folderId: string | null;
  caseId: string | null;
}

export const encodeState = (s: ConnectState): string => encodeSignedState(s);

/** Returns the state only if the signature is valid; returnTo is re-sanitised on the way out. */
export function decodeState(raw: string | null | undefined): ConnectState | null {
  const s = decodeSignedState(raw);
  if (!s || typeof s.uid !== 'string' || typeof s.nonce !== 'string') return null;
  return {
    uid: s.uid,
    nonce: s.nonce,
    returnTo: sanitizeReturnTo(s.returnTo as string),
    intent: s.intent === 'import' ? 'import' : 'connect',
    folderId: typeof s.folderId === 'string' ? s.folderId : null,
    caseId: typeof s.caseId === 'string' ? s.caseId : null,
  };
}
