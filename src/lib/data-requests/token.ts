// Link tokens for "Solicitar datos al cliente". Server-only (node:crypto). The raw token is only
// emailed / returned once; Firestore stores its SHA-256 hash.

import { createHash, randomBytes } from 'crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** 32 random bytes, base64url. */
export function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

/** Shape check before hashing (cheap reject of junk on the public routes). */
export const isTokenShape = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
