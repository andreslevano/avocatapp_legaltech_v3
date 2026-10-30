'use client';

import type { User } from 'firebase/auth';

export interface MicrosoftIntegrationInfo {
  email: string;
  displayName: string;
  tenantId: string;
  tenantName: string | null;
  accountType: 'personal' | 'work';
  pickerBaseUrl: string | null;
  status: 'connected' | 'reauth_required';
  connectedAt?: unknown;
}

/** Display info stored on users/{uid}.integrations.microsoft (written server-side only). */
export function microsoftInfo(userDoc: unknown): MicrosoftIntegrationInfo | null {
  const info = (userDoc as { integrations?: { microsoft?: MicrosoftIntegrationInfo } } | null)?.integrations?.microsoft;
  return info?.email !== undefined ? info : null;
}

export class ConnectorError extends Error {
  constructor(message: string, public code: 'reconnect_required' | 'not_connected' | 'resource_not_allowed' | 'error') {
    super(message);
  }
}

async function authed<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: ConnectorError['code'] };
  if (!res.ok) throw new ConnectorError(data.error ?? 'Error inesperado', data.code ?? 'error');
  return data;
}

/** Starts the Microsoft sign-in (full-page redirect). */
export async function startMicrosoftConnect(
  user: User, opts: { returnTo: string; intent: 'import' | 'connect'; folderId?: string | null; caseId?: string | null },
): Promise<void> {
  const params = new URLSearchParams({ returnTo: opts.returnTo, intent: opts.intent });
  if (opts.folderId) params.set('folderId', opts.folderId);
  if (opts.caseId) params.set('caseId', opts.caseId);
  const { url } = await authed<{ url: string }>(user, `/api/integrations/microsoft/auth?${params}`);
  window.location.assign(url);
}

/** Short-lived token for the File Picker (SharePoint host or OneDrive consumer). */
export function getPickerToken(user: User, resource: string): Promise<{ token: string; expiresOn: number }> {
  return authed(user, '/api/integrations/microsoft/token', { method: 'POST', body: JSON.stringify({ resource }) });
}

export function disconnectMicrosoft(user: User): Promise<{ ok: true }> {
  return authed(user, '/api/integrations/microsoft/disconnect', { method: 'POST', body: '{}' });
}
