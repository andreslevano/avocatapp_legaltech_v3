'use client';

import type { User } from 'firebase/auth';
import type { DocusignDisplay } from './tokens';

/** Display info on users/{uid}.integrations.docusign (written server-side only). */
export function docusignInfo(userDoc: unknown): DocusignDisplay | null {
  const info = (userDoc as { integrations?: { docusign?: DocusignDisplay } } | null)?.integrations?.docusign;
  return info?.connected ? info : null;
}

export class DocusignClientError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

async function authed<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: string };
  if (!res.ok) throw new DocusignClientError(data.error ?? 'Error inesperado', data.code ?? 'error');
  return data;
}

/** Full-page redirect to DocuSign. `switchUser` forces the DocuSign login screen. */
export async function startDocusignConnect(user: User, opts: { returnTo: string; switchUser?: boolean }): Promise<void> {
  const params = new URLSearchParams({ returnTo: opts.returnTo });
  if (opts.switchUser) params.set('switch', '1');
  const { url } = await authed<{ url: string }>(user, `/api/integrations/docusign/auth?${params}`);
  window.location.assign(url);
}

export const selectDocusignAccount = (user: User, accountId: string) =>
  authed<{ ok: true }>(user, '/api/integrations/docusign/account', { method: 'POST', body: JSON.stringify({ accountId }) });

export const disconnectDocusign = (user: User) =>
  authed<{ ok: true }>(user, '/api/integrations/docusign/disconnect', { method: 'POST', body: '{}' });
