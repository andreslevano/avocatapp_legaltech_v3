'use client';

// NDA negotiation — client side. Reads are live Firestore listeners (owner read rules); every write
// goes through /api/negotiations/*.

import type { User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ClauseLevel } from './levels';
import type { Counterparty, Negotiation, NegotiationEvent, NegotiationStatus, NegotiationVersion } from './types';

export class NegotiationClientError extends Error {
  constructor(message: string, public code: string, public errors?: Record<string, string>) { super(message); }
}

async function call<T>(user: User, path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: string; errors?: Record<string, string> };
  if (!res.ok) throw new NegotiationClientError(data.error ?? 'Error inesperado', data.code ?? 'error', data.errors);
  return data;
}

export interface SentResult { id: string; status: NegotiationStatus; emailed: boolean; emailConfigured: boolean; link?: string }

const path = (id: string, action: string) => `/api/negotiations/${encodeURIComponent(id)}/${action}`;

export const createNegotiation = (user: User, input: {
  draftDocumentId: string; markdown: string; levels: Record<string, ClauseLevel>; counterparty: Counterparty;
  clientId?: string | null; showLevels: boolean;
}) => call<SentResult>(user, '/api/negotiations', input);

export const respondNegotiation = (user: User, id: string, body: {
  decisions: { key: string; action: 'aceptar' | 'rechazar' | 'contrapropuesta'; text?: string; reason?: string }[];
  replies: { key: string; text: string }[];
}) => call<SentResult & { round: number }>(user, path(id, 'respond'), body);

export const finalizeNegotiation = (user: User, id: string) =>
  call<{ markdown: string; title: string; version: number }>(user, path(id, 'finalize'));
export const linkFinalDocument = (user: User, id: string, documentId: string) =>
  call<{ id: string; finalDocumentId: string }>(user, path(id, 'final-document'), { documentId });
export const resendNegotiation = (user: User, id: string) => call<SentResult>(user, path(id, 'resend'));
export const revokeNegotiation = (user: User, id: string) => call<{ id: string; status: NegotiationStatus }>(user, path(id, 'revoke'));

export function watchNegotiation(id: string, cb: (n: Negotiation | null) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'negotiations', id),
    s => cb(s.exists() ? ({ id: s.id, ...s.data() } as Negotiation) : null),
    () => cb(null));
}

export function watchNegotiations(uid: string, cb: (ns: Negotiation[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'negotiations'), where('ownerId', '==', uid)),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Negotiation)).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))),
    () => cb([]));
}

export function watchNegotiationEvents(id: string, cb: (es: (NegotiationEvent & { id: string; counts?: Record<string, number> })[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'negotiations', id, 'events'), orderBy('at', 'asc')),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as NegotiationEvent & { id: string }))),
    () => cb([]));
}

export function watchNegotiationVersions(id: string, cb: (vs: NegotiationVersion[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'negotiations', id, 'versions'), orderBy('n', 'asc')),
    s => cb(s.docs.map(d => d.data() as NegotiationVersion)),
    () => cb([]));
}

// ── Draft hand-off (NDA tool → /negociaciones/nueva) ────────────────

export interface DraftHandoff {
  documentId: string;
  markdown: string;
  title: string;
  clientId: string | null;
  counterparty: Counterparty;
}

const KEY = (id: string) => `avocat:negotiation-draft:${id}`;

export function stashDraft(d: DraftHandoff) {
  try { sessionStorage.setItem(KEY(d.documentId), JSON.stringify(d)); } catch { /* private mode: the page asks to regenerate */ }
}

export function readDraft(documentId: string): DraftHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY(documentId));
    return raw ? JSON.parse(raw) as DraftHandoff : null;
  } catch { return null; }
}

export function clearDraft(documentId: string) {
  try { sessionStorage.removeItem(KEY(documentId)); } catch { /* ignore */ }
}
