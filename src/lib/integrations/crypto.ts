// Shared AES-256-GCM helper for integration tokens (Microsoft F1, DocuSign D4, Gmail later).
// Key: INTEGRATION_TOKEN_ENC_KEY = 32 random bytes, base64. Server-only.
// Format: "v1.<iv>.<tag>.<ciphertext>" (base64url). functions/src/integrations/crypto.ts mirrors
// this exactly — keep both in sync (shared test vector in tests/unit/integrations-crypto.node.spec.ts).

import crypto from 'crypto';

const VERSION = 'v1';

function masterKey(): Buffer {
  const raw = (process.env.INTEGRATION_TOKEN_ENC_KEY ?? '').trim();
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('INTEGRATION_TOKEN_ENC_KEY must be 32 bytes, base64-encoded');
  return key;
}

// Separate sub-keys so encryption and state signing never share a key.
function subKey(purpose: 'enc' | 'state'): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', masterKey(), Buffer.alloc(0), `avocat-integrations-${purpose}`, 32));
}

export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', subKey('enc'), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
}

export function decryptString(payload: string): string {
  const [version, iv, tag, ct] = payload.split('.');
  if (version !== VERSION || !iv || !tag || ct === undefined) throw new Error('Unsupported ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', subKey('enc'), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}

/** HMAC-SHA256 (base64url) for signing OAuth state. */
export function sign(data: string): string {
  return crypto.createHmac('sha256', subKey('state')).update(data).digest('base64url');
}

export function verifySignature(data: string, signature: string): boolean {
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256Base64Url(input: string): string {
  return crypto.createHash('sha256').update(input).digest('base64url');
}
