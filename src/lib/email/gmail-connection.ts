// Gmail connection — stored like DocuSign / Microsoft (server-only, encrypted). Server-only.
//   integration_secrets/{uid}.gmail   — encrypted refresh + access token, expiry (no client rule)
//   users/{uid}.integrations.gmail    — display only: { email, status, connectedAt } (client can't write)
// Older connections kept the tokens on users/{uid} (gmailAccessToken / gmailRefreshToken, readable by
// the browser): they are moved here, encrypted, the first time they're used, and removed from the profile.

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { decryptString, encryptString } from '@/lib/integrations/crypto';
import { refreshAccessToken } from '@/lib/gmail';

export class GmailNotConnected extends Error { code = 'not_connected'; constructor() { super('Gmail no está conectado.'); } }
export class GmailReconnect extends Error { code = 'reconnect_required'; constructor() { super('La conexión con Gmail ha caducado. Vuelve a conectarla.'); } }

interface GmailSecret { refreshToken: string; accessToken?: string; expiresAt?: number }

const secretsRef = (uid: string) => db().collection('integration_secrets').doc(uid);
const userRef = (uid: string) => db().collection('users').doc(uid);

const LEGACY_FIELDS = { gmailConnected: FieldValue.delete(), gmailEmail: FieldValue.delete(), gmailAccessToken: FieldValue.delete(),
  gmailRefreshToken: FieldValue.delete(), gmailTokenExpiresAt: FieldValue.delete(), gmailConnectedAt: FieldValue.delete() };

export async function saveGmailConnection(uid: string, t: { refreshToken: string; accessToken: string; expiresAt: number; email: string }) {
  await secretsRef(uid).set({
    gmail: { refreshToken: encryptString(t.refreshToken), accessToken: encryptString(t.accessToken), expiresAt: t.expiresAt, updatedAt: FieldValue.serverTimestamp() },
  }, { merge: true });
  await userRef(uid).set({
    integrations: { gmail: { email: t.email, status: 'connected', connectedAt: FieldValue.serverTimestamp() } },
    ...LEGACY_FIELDS,
  }, { merge: true });
}

export async function deleteGmailConnection(uid: string) {
  await secretsRef(uid).set({ gmail: FieldValue.delete() }, { merge: true });
  await userRef(uid).set({ integrations: { gmail: FieldValue.delete() }, ...LEGACY_FIELDS, gmailAuthNonce: FieldValue.delete() }, { merge: true });
}

/** Moves a pre-encryption connection (tokens on the profile) to the encrypted store. */
async function migrateLegacy(uid: string): Promise<GmailSecret | null> {
  const u = (await userRef(uid).get()).data() ?? {};
  if (!u.gmailRefreshToken) return null;
  await saveGmailConnection(uid, {
    refreshToken: String(u.gmailRefreshToken), accessToken: String(u.gmailAccessToken ?? ''),
    expiresAt: Number(u.gmailTokenExpiresAt ?? 0), email: String(u.gmailEmail ?? ''),
  });
  return { refreshToken: encryptString(String(u.gmailRefreshToken)), accessToken: encryptString(String(u.gmailAccessToken ?? '')), expiresAt: Number(u.gmailTokenExpiresAt ?? 0) };
}

/** A valid Gmail access token (refreshed when < 60 s remain). */
export async function getGmailAccessToken(uid: string): Promise<string> {
  let s = (await secretsRef(uid).get()).get('gmail') as GmailSecret | undefined;
  if (!s?.refreshToken) s = (await migrateLegacy(uid)) ?? undefined;
  if (!s?.refreshToken) throw new GmailNotConnected();
  if (s.accessToken && (s.expiresAt ?? 0) > Date.now() + 60_000) return decryptString(s.accessToken);
  try {
    const r = await refreshAccessToken(decryptString(s.refreshToken));
    await secretsRef(uid).set({ gmail: { accessToken: encryptString(r.accessToken), expiresAt: r.expiresAt } }, { merge: true });
    return r.accessToken;
  } catch {
    await userRef(uid).set({ integrations: { gmail: { status: 'reauth_required' } } }, { merge: true });
    throw new GmailReconnect();
  }
}

/** Display info, including a legacy connection not migrated yet. */
export function gmailDisplay(u: Record<string, unknown>): { email: string; status: 'connected' | 'reauth_required' } | null {
  const g = (u.integrations as { gmail?: { email?: string; status?: string } } | undefined)?.gmail;
  if (g?.email) return { email: g.email, status: g.status === 'reauth_required' ? 'reauth_required' : 'connected' };
  if (u.gmailConnected && u.gmailRefreshToken) return { email: String(u.gmailEmail ?? ''), status: 'connected' };
  return null;
}
