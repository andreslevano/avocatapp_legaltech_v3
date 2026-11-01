// DocuSign token storage (D4). Server-only.
//   integration_secrets/{uid}.docusign        — encrypted tokens + routing info (no client rule)
//   integration_secrets/{uid}.docusignPending — nonce for the connect flow, 10 min
//   users/{uid}.integrations.docusign         — display info only (client reads, never writes)

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { decryptString, encryptString } from '@/lib/integrations/crypto';
import type { DsAccount } from './config';
import { DocusignNotConnected, DocusignReconnectRequired } from './errors';
import { refreshTokens, type DsTokenResponse } from './oauth';
import { resolveAccessToken } from './token-logic';

export interface DocusignSecret {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: number;          // ms epoch
  accountId: string;
  accountName: string;
  baseUri: string;
  userEmail: string;
  userName: string;
  connectedAt?: unknown;
  updatedAt?: unknown;
}

export interface DocusignDisplay {
  connected: boolean;
  status: 'connected' | 'reauth_required';
  email: string;
  name: string;
  accountId: string;
  accountName: string;
  accounts: { accountId: string; accountName: string; isDefault: boolean }[];
  connectedAt?: unknown;
}

const secretsRef = (uid: string) => db().collection('integration_secrets').doc(uid);
const userRef = (uid: string) => db().collection('users').doc(uid);

// ── Firestore persistence ────────────────────────────────────────

export async function savePendingNonce(uid: string, nonce: string): Promise<void> {
  await secretsRef(uid).set({ docusignPending: { nonce, expiresAt: Date.now() + 10 * 60_000 } }, { merge: true });
}

export async function consumePendingNonce(uid: string, nonce: string): Promise<boolean> {
  const ref = secretsRef(uid);
  const p = (await ref.get()).get('docusignPending') as { nonce: string; expiresAt: number } | undefined;
  await ref.set({ docusignPending: FieldValue.delete() }, { merge: true });
  return !!p && p.nonce === nonce && p.expiresAt >= Date.now();
}

export async function saveConnection(uid: string, tokens: DsTokenResponse, user: { name: string; email: string },
  account: DsAccount, accounts: DsAccount[]): Promise<void> {
  const now = Date.now();
  await secretsRef(uid).set({
    docusign: {
      accessTokenEnc: encryptString(tokens.access_token),
      refreshTokenEnc: encryptString(tokens.refresh_token),
      expiresAt: now + tokens.expires_in * 1000,
      accountId: account.accountId,
      accountName: account.accountName,
      baseUri: account.baseUri,
      userEmail: user.email,
      userName: user.name,
      connectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies DocusignSecret,
  }, { merge: true });
  await userRef(uid).set({
    integrations: {
      docusign: {
        connected: true,
        status: 'connected',
        email: user.email,
        name: user.name,
        accountId: account.accountId,
        accountName: account.accountName,
        accounts: accounts.map(a => ({ accountId: a.accountId, accountName: a.accountName, isDefault: a.isDefault })),
        connectedAt: FieldValue.serverTimestamp(),
      } satisfies DocusignDisplay,
    },
  }, { merge: true });
}

export async function switchAccount(uid: string, account: DsAccount): Promise<void> {
  await secretsRef(uid).set({
    docusign: { accountId: account.accountId, accountName: account.accountName, baseUri: account.baseUri, updatedAt: FieldValue.serverTimestamp() },
  }, { merge: true });
  await userRef(uid).set({
    integrations: { docusign: { accountId: account.accountId, accountName: account.accountName } },
  }, { merge: true });
}

export async function deleteConnection(uid: string): Promise<void> {
  await secretsRef(uid).set({ docusign: FieldValue.delete(), docusignPending: FieldValue.delete() }, { merge: true });
  await userRef(uid).set({ integrations: { docusign: FieldValue.delete() } }, { merge: true });
}

async function loadSecret(uid: string): Promise<DocusignSecret> {
  const s = (await secretsRef(uid).get()).get('docusign') as DocusignSecret | undefined;
  if (!s?.refreshTokenEnc) throw new DocusignNotConnected();
  return s;
}

/**
 * Valid access token + account routing for API calls. Refreshes when <5 min remain and persists
 * the rotated tokens. Throws DocusignReconnectRequired (and flags the profile) when the refresh
 * token is no longer valid.
 */
export interface DocusignCreds { accessToken: string; accountId: string; baseUri: string; userName: string; userEmail: string }

export async function getValidAccessToken(uid: string): Promise<DocusignCreds> {
  const s = await loadSecret(uid);
  try {
    const { accessToken, refreshed } = await resolveAccessToken(
      { accessToken: decryptString(s.accessTokenEnc), refreshToken: decryptString(s.refreshTokenEnc), expiresAt: s.expiresAt },
      Date.now(),
      refreshTokens,
    );
    if (refreshed) {
      await secretsRef(uid).set({
        docusign: {
          accessTokenEnc: encryptString(refreshed.accessToken),
          refreshTokenEnc: encryptString(refreshed.refreshToken),
          expiresAt: refreshed.expiresAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
      }, { merge: true });
    }
    return { accessToken, accountId: s.accountId, baseUri: s.baseUri, userName: s.userName, userEmail: s.userEmail };
  } catch (err) {
    if (err instanceof DocusignReconnectRequired) {
      await userRef(uid).set({ integrations: { docusign: { status: 'reauth_required' } } }, { merge: true });
    }
    throw err;
  }
}
