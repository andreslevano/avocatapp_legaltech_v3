'use client';

// Browser helpers for the tools opened from "Preparar {documento}" (Clientes).

import type { User } from 'firebase/auth';
import type { DocId } from './catalog';

/** ?clientId=…&requestId=… (read once on mount; the tools also accept them without a request). */
export function readRequestParams(): { clientId: string | null; requestId: string | null } {
  if (typeof window === 'undefined') return { clientId: null, requestId: null };
  const q = new URLSearchParams(window.location.search);
  return { clientId: q.get('clientId'), requestId: q.get('requestId') };
}

/** Records documentIds[docId] = documentId on the request. Fire-and-forget: never blocks the tool. */
export function linkRequestDocument(user: User, requestId: string, docId: DocId, documentId: string): void {
  user.getIdToken()
    .then(token => fetch(`/api/data-requests/${encodeURIComponent(requestId)}/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ docId, documentId }),
    }))
    .catch(err => console.warn('[data-requests] link document', (err as Error).message));
}
