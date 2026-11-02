'use client';

import type { User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, where, type Firestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CreateSignatureInput, SignatureRecipient, SignatureRequest, SignatureStatus } from './types';

export class SignatureClientError extends Error {
  constructor(message: string, public code: string, public requestId?: string) { super(message); }
}

async function post<T>(user: User, path: string, body: unknown, method = 'POST'): Promise<T> {
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    method,
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

const rid = (id: string) => `/api/signatures/${encodeURIComponent(id)}`;

/** Manual "Actualizar estado" — the server answers from Firestore inside the 15-min window (D9). */
export const refreshSignature = (user: User, requestId: string) =>
  post<{ status: SignatureStatus; nextRefreshAt: string | null; throttled: boolean }>(user, `${rid(requestId)}/refresh`, {});

export const remindSignature = (user: User, requestId: string) =>
  post<{ ok: true }>(user, `${rid(requestId)}/remind`, {});

export const voidSignature = (user: User, requestId: string) =>
  post<{ ok: true }>(user, `${rid(requestId)}/void`, {});

export const correctSignatureEmail = (user: User, requestId: string, email: string, name?: string) =>
  post<{ ok: true }>(user, `${rid(requestId)}/recipients`, { email, name }, 'PATCH');

/** Live request (owner read-only by rules). */
export function watchSignatureRequest(requestId: string, cb: (r: SignatureRequest | null) => void) {
  return onSnapshot(doc(db as Firestore, 'signature_requests', requestId),
    s => cb(s.exists() ? { id: s.id, ...(s.data() as Omit<SignatureRequest, 'id'>) } : null),
    () => cb(null));
}

/** Live documentId → status for the user's latest requests (drives the /documents chips). */
export function watchSignatureStatuses(uid: string, cb: (m: Map<string, { status: SignatureStatus; requestId: string }>) => void) {
  const q = query(collection(db as Firestore, 'signature_requests'), where('userId', '==', uid), orderBy('updatedAt', 'desc'), limit(200));
  return onSnapshot(q, snap => {
    const m = new Map<string, { status: SignatureStatus; requestId: string }>();
    // Newest first: the first request seen for a document is its current one.
    snap.docs.forEach(d => {
      const docId = d.get('documentId') as string;
      if (docId && !m.has(docId)) m.set(docId, { status: d.get('status') as SignatureStatus, requestId: d.id });
    });
    cb(m);
  }, () => { /* index building / offline — chips fall back to the stored document fields */ });
}

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
