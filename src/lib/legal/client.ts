'use client';

// Client side of legal-change monitoring (F2 step 1). Reads are Firestore listeners (rules: admins
// read the queue, everyone signed in reads approved changes); writes go through /api/admin/legal-changes.

import type { User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChangeEdit, ChangeStatus, LegalChange, LegalJurisdiction } from './types';

async function call<T>(user: User, path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Error inesperado');
  return data;
}

export function watchChanges(status: ChangeStatus, cb: (cs: LegalChange[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(query(collection(db, 'legal_changes'), where('status', '==', status)),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as LegalChange))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.createdAt.localeCompare(a.createdAt))),
    () => cb([]));
}

export async function getChanges(ids: string[]): Promise<LegalChange[]> {
  if (!db || !ids.length) return [];
  const snaps = await Promise.all(ids.slice(0, 20).map(id => getDoc(doc(db!, 'legal_changes', id)).catch(() => null)));
  return snaps.flatMap(s => (s?.exists() ? [{ id: s.id, ...s.data() } as LegalChange] : []));
}

export const reviewChange = (user: User, id: string, action: 'save' | 'approve' | 'dismiss', edit?: ChangeEdit) =>
  call<{ ok: true; flagged?: number; users?: number }>(user, `/api/admin/legal-changes/${encodeURIComponent(id)}`, { action, edit });

export const addManualChange = (user: User, input: { title: string; url?: string; text: string; jurisdiction: LegalJurisdiction; publishedAt?: string }) =>
  call<{ change: LegalChange }>(user, '/api/admin/legal-changes', input).then(r => r.change);

export const runMonitorNow = (user: User, days?: number) =>
  call<{ fetched: number; fresh: number; triagedRelevant: number; created: number; deferred: number; errors: string[] }>(user, '/api/admin/legal-changes/run', { days });
