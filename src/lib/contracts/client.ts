'use client';

// Client side of contracts (F0) and notifications (F3). Reads are live Firestore listeners
// (owner read rules); every write except "mark as read" goes through /api/contracts.

import type { User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Contract, ContractEdit, DateKind } from './types';
import type { AlertSeverity } from './alerts';
import type { NdaFormInput } from './extract';

export class ContractClientError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

async function call<T>(user: User, path: string, body: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string; code?: string };
  if (!res.ok) throw new ContractClientError(data.error ?? 'Error inesperado', data.code ?? 'error');
  return data;
}

export const createNdaContract = (user: User, input: NdaFormInput) =>
  call<{ contract: Contract }>(user, '/api/contracts', input).then(r => r.contract);

export const analyzeAsContract = (user: User, documentId: string) =>
  call<{ contract: Contract }>(user, '/api/contracts/extract', { documentId }).then(r => r.contract);

export const saveContract = (user: User, id: string, edit: ContractEdit, confirm: boolean) =>
  call<{ contract: Contract }>(user, `/api/contracts/${encodeURIComponent(id)}`, { edit, confirm }, 'PATCH').then(r => r.contract);

export const contractAction = (user: User, id: string, action: 'snooze' | 'let_expire' | 'terminate' | 'reactivate') =>
  call<{ contract: Contract }>(user, `/api/contracts/${encodeURIComponent(id)}/action`, { action }).then(r => r.contract);

export const runAlertsNow = (user: User, email: boolean) =>
  call<{ scan: { contracts: number; notifications: number }; digests: { sent: number } | null }>(user, '/api/admin/contract-alerts', { email });

export function watchContract(id: string, cb: (c: Contract | null) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'contracts', id),
    s => cb(s.exists() ? ({ id: s.id, ...s.data() } as Contract) : null),
    () => cb(null));
}

export function watchContracts(uid: string, cb: (cs: Contract[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'contracts'), where('userId', '==', uid)),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Contract))),
    () => cb([]));
}

// ── Notifications ───────────────────────────────────────────────

export interface AppNotification {
  id: string;
  userId: string;
  type: 'contract_expiry';
  contractId: string;
  documentId: string;
  kind: DateKind;
  threshold: number;
  dueDate: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  readAt: string | null;
  resolved?: boolean;
  createdAt: string;
}

export function watchNotifications(uid: string, cb: (ns: AppNotification[]) => void, max = 50): () => void {
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(max)),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))),
    () => cb([]));
}

export async function markNotificationsRead(ids: string[]) {
  if (!db || !ids.length) return;
  const at = new Date().toISOString();
  if (ids.length === 1) return updateDoc(doc(db, 'notifications', ids[0]), { readAt: at });
  const batch = writeBatch(db);
  ids.slice(0, 450).forEach(id => batch.update(doc(db!, 'notifications', id), { readAt: at }));
  await batch.commit();
}
