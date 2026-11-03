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

// ── Import (F1) ──────────────────────────────────────────────────

export interface ImportPreviewRow {
  driveId: string;
  itemId: string;
  name: string;
  size: number;
  provider: 'onedrive' | 'sharepoint';
  path: string;
  check: 'ok' | 'folder' | 'unsupported' | 'too_large' | 'not_found';
  duplicates: { id: string; name: string }[];
  folder?: { files: number; importable: number; problems: number; duplicates: number; truncated: boolean };
}
export interface ImportPreviewFile {
  driveId: string; itemId: string; name: string; size: number; rel: string[];
  check: ImportPreviewRow['check']; duplicateOf: string | null;
}
export interface ImportPreviewFolder { key: string; name: string; source: { provider: 'microsoft'; driveId: string; itemId: string; webUrl: string; path: string } }
export interface ImportPreview { rows: ImportPreviewRow[]; files: ImportPreviewFile[]; folders: ImportPreviewFolder[] }

export function previewMicrosoftImport(user: User, items: { driveId: string; itemId: string }[]) {
  return authed<ImportPreview>(user, '/api/integrations/microsoft/import/preview', { method: 'POST', body: JSON.stringify({ items }) });
}

export function createImportJob(user: User, input: {
  destinationFolderId: string | null; keepStructure: boolean; caseId: string | null; clientId: string | null; analyze: boolean;
  files: Pick<ImportPreviewFile, 'driveId' | 'itemId' | 'name' | 'size' | 'rel'>[]; folders: ImportPreviewFolder[];
}) {
  return authed<{ jobId: string }>(user, '/api/integrations/microsoft/import/jobs', { method: 'POST', body: JSON.stringify(input) }).then(r => r.jobId);
}

export interface ImportJobCounts { total: number; done: number; error: number; skipped: number; pending: number }
export interface NextJobResult {
  status: 'running' | 'done' | 'cancelled' | 'paused';
  counts: ImportJobCounts;
  item: { name: string; status: string; error: string | null; documentId: string | null } | null;
  document: (Record<string, unknown> & { id: string }) | null;
}

export function nextImportJobItem(user: User, jobId: string) {
  return authed<NextJobResult>(user, `/api/integrations/microsoft/import/jobs/${encodeURIComponent(jobId)}/next`, { method: 'POST', body: '{}' });
}

export function importJobAction(user: User, jobId: string, action: 'cancel' | 'retry_failed' | 'resume') {
  return authed<{ ok: true }>(user, `/api/integrations/microsoft/import/jobs/${encodeURIComponent(jobId)}`, { method: 'POST', body: JSON.stringify({ action }) });
}
