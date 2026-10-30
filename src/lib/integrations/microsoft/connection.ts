// Stored Microsoft connection. Server-only.
//   integration_secrets/{uid}.microsoft         — encrypted refresh token + routing info (no client rule)
//   integration_secrets/{uid}.microsoftPending  — nonce + encrypted PKCE verifier, 10 min
//   users/{uid}.integrations.microsoft          — display info only (client can read, not write)

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { decryptString, encryptString } from '@/lib/integrations/crypto';
import { GRAPH_SCOPE, PERSONAL_TENANT_ID } from './config';
import { NotConnectedError, ReconnectRequiredError } from './errors';
import { refreshAccessToken } from './oauth';

export interface MicrosoftSecret {
  refreshToken: string;            // encrypted
  accountType: 'personal' | 'work';
  tenantId: string;
  sharePointTenant: string | null; // "contoso" for work accounts
  scope: string;
  updatedAt?: unknown;
}

export interface MicrosoftDisplay {
  email: string;
  displayName: string;
  tenantId: string;
  tenantName: string | null;
  accountType: 'personal' | 'work';
  pickerBaseUrl: string | null;
  status: 'connected' | 'reauth_required';
  connectedAt?: unknown;
}

const secretsRef = (uid: string) => db().collection('integration_secrets').doc(uid);
const userRef = (uid: string) => db().collection('users').doc(uid);

export async function savePending(uid: string, nonce: string, codeVerifier: string): Promise<void> {
  await secretsRef(uid).set({
    microsoftPending: { nonce, verifier: encryptString(codeVerifier), expiresAt: Date.now() + 10 * 60_000 },
  }, { merge: true });
}

/** Returns the PKCE verifier if the nonce matches an unexpired pending connect; clears it. */
export async function consumePending(uid: string, nonce: string): Promise<string | null> {
  const ref = secretsRef(uid);
  const snap = await ref.get();
  const p = snap.get('microsoftPending') as { nonce: string; verifier: string; expiresAt: number } | undefined;
  await ref.set({ microsoftPending: FieldValue.delete() }, { merge: true });
  if (!p || p.nonce !== nonce || p.expiresAt < Date.now()) return null;
  return decryptString(p.verifier);
}

export async function saveConnection(uid: string, secret: Omit<MicrosoftSecret, 'refreshToken'> & { refreshToken: string },
  display: Omit<MicrosoftDisplay, 'status' | 'connectedAt'>): Promise<void> {
  await secretsRef(uid).set({
    microsoft: { ...secret, refreshToken: encryptString(secret.refreshToken), updatedAt: FieldValue.serverTimestamp() },
  }, { merge: true });
  await userRef(uid).set({
    integrations: { microsoft: { ...display, status: 'connected', connectedAt: FieldValue.serverTimestamp() } },
  }, { merge: true });
}

export async function deleteConnection(uid: string): Promise<void> {
  await secretsRef(uid).set({ microsoft: FieldValue.delete(), microsoftPending: FieldValue.delete() }, { merge: true });
  await userRef(uid).set({ integrations: { microsoft: FieldValue.delete() } }, { merge: true });
}

export async function loadSecret(uid: string): Promise<MicrosoftSecret> {
  const s = (await secretsRef(uid).get()).get('microsoft') as MicrosoftSecret | undefined;
  if (!s?.refreshToken) throw new NotConnectedError();
  return s;
}

async function markReauthRequired(uid: string): Promise<void> {
  await userRef(uid).set({ integrations: { microsoft: { status: 'reauth_required' } } }, { merge: true });
}

/**
 * Short-lived access token for `scope`, refreshing via the stored refresh token. The rotated
 * refresh token is persisted. Never returns or exposes the refresh token itself.
 */
export async function getAccessToken(uid: string, scope: string = GRAPH_SCOPE): Promise<{ token: string; expiresOn: number }> {
  const secret = await loadSecret(uid);
  const tenant = secret.accountType === 'personal' ? 'consumers' : secret.tenantId;
  try {
    const t = await refreshAccessToken(decryptString(secret.refreshToken), scope, tenant);
    if (t.refresh_token) {
      await secretsRef(uid).set({ microsoft: { refreshToken: encryptString(t.refresh_token), updatedAt: FieldValue.serverTimestamp() } }, { merge: true });
    }
    return { token: t.access_token, expiresOn: Date.now() + t.expires_in * 1000 };
  } catch (err) {
    if (err instanceof ReconnectRequiredError) await markReauthRequired(uid);
    throw err;
  }
}

export const isPersonalTenant = (tid: string | undefined | null) => tid === PERSONAL_TENANT_ID;
