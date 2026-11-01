'use client';

import type { User } from 'firebase/auth';
import type { CreateSignatureInput, SignatureRecipient, SignatureStatus } from './types';

export class SignatureClientError extends Error {
  constructor(message: string, public code: string, public requestId?: string) { super(message); }
}

async function post<T>(user: User, path: string, body: unknown): Promise<T> {
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: string; requestId?: string };
  if (!res.ok) throw new SignatureClientError(data.error ?? 'Error inesperado', data.code ?? 'error', data.requestId);
  return data;
}

export const createSignatureRequest = (user: User, input: CreateSignatureInput) =>
  post<{ requestId: string; signingUrl: string }>(user, '/api/signatures', input);

export const getSigningUrl = (user: User, requestId: string) =>
  post<{ signingUrl: string }>(user, `/api/signatures/${encodeURIComponent(requestId)}/signing-url`, {});

export const reportSigningReturn = (user: User, requestId: string, event: string) =>
  post<{ status: SignatureStatus; counterparty: SignatureRecipient | null; documentId: string }>(
    user, `/api/signatures/${encodeURIComponent(requestId)}/return`, { event });

// The OAuth round-trip to DocuSign is a full-page redirect, so the sheet's context is parked in
// sessionStorage and restored when /tools/nda comes back with ?ds=connected (returnTo).
const RESUME_KEY = 'avocat.signResume';

export interface SignResumeState {
  documentId: string;
  markdown: string;
  title: string;
  counterparty: { name: string; email: string };
}

export function saveSignResume(s: SignResumeState) {
  try { sessionStorage.setItem(RESUME_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function takeSignResume(): SignResumeState | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return raw ? JSON.parse(raw) as SignResumeState : null;
  } catch { return null; }
}
