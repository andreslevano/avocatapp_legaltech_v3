'use client';

// Writes for "Importar clientes": chunked batched creates (rules: clients create needs
// userId == auth.uid) and undo. Every imported client carries importId so a whole import can be
// undone, and so support can trace where a client came from.

import { collection, doc, serverTimestamp, writeBatch, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ClientDoc } from '@/lib/firestore';
import { toClientFields, type ImportRow } from './import';

/** Firestore allows 500 writes per batch; stay well under it. */
const CHUNK = 200;

export interface CommitResult {
  importId: string;
  created: ClientDoc[];
  /** Rows not written because a batch failed (retryable). */
  failed: ImportRow[];
  error?: string;
}

export function newImportId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function commitClientImport(
  userId: string, rows: ImportRow[], importId = newImportId(), onProgress?: (done: number) => void,
): Promise<CommitResult> {
  if (!db) throw new Error('Base de datos no disponible.');
  const created: ClientDoc[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    const made: ClientDoc[] = [];
    for (const r of chunk) {
      const ref = doc(collection(db, 'clients'));
      const fields = toClientFields(r.values);
      batch.set(ref, {
        userId, ...fields,
        activeCases: 0, lastCaseDate: serverTimestamp(), status: 'active',
        createdAt: serverTimestamp(), importId, source: 'excel-import',
      });
      made.push({ id: ref.id, userId, ...fields, activeCases: 0, lastCaseDate: null as unknown as Timestamp, status: 'active' });
    }
    try {
      await batch.commit();
    } catch (e) {
      // Batches are atomic: this chunk wrote nothing. Earlier chunks stay (and can be undone).
      return { importId, created, failed: rows.slice(i), error: (e as Error).message };
    }
    created.push(...made);
    onProgress?.(created.length);
  }
  return { importId, created, failed: [] };
}

/** Deletes the given imported clients (the caller excludes any already linked to a case). */
export async function undoClientImport(ids: string[]): Promise<void> {
  if (!db) throw new Error('Base de datos no disponible.');
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK).forEach(id => batch.delete(doc(db!, 'clients', id)));
    await batch.commit();
  }
}
