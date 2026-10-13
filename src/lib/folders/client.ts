import {
  collection, addDoc, doc as firestoreDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { chunk } from './tree';
import type { FolderDeleteMode, FolderRecord } from './types';

export async function getUserFolders(userId: string): Promise<FolderRecord[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'folders'), where('userId', '==', userId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FolderRecord));
}

/** Simple create — validated by Firestore rules (owner, name, parent ownership, ancestors, depth). */
export async function createFolder(userId: string, name: string, parent: FolderRecord | null): Promise<FolderRecord> {
  if (!db) throw new Error('Firebase no disponible');
  const ancestors = parent ? [...parent.ancestors, parent.id] : [];
  const data = {
    userId,
    name: name.trim(),
    parentId: parent?.id ?? null,
    ancestors,
    depth: ancestors.length + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'folders'), data);
  const now = { seconds: Math.floor(Date.now() / 1000) };
  return { id: ref.id, ...data, createdAt: now, updatedAt: now };
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  if (!db) return;
  await updateDoc(firestoreDoc(db, 'folders', folderId), { name: name.trim(), updatedAt: serverTimestamp() });
}

/** Moves documents into a folder (null = root). Metadata only — Storage paths never change. */
export async function moveDocumentsToFolder(docIds: string[], folderId: string | null): Promise<void> {
  if (!db || docIds.length === 0) return;
  const database = db;
  for (const ids of chunk(docIds)) {
    const batch = writeBatch(database);
    ids.forEach(id => batch.update(firestoreDoc(database, 'documents', id), { folderId }));
    await batch.commit();
  }
}

async function callFolderRoute<T>(user: User, path: string, body: unknown): Promise<T> {
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Error inesperado.');
  return data as T;
}

/** Server route: re-parents the folder and rewrites descendants' ancestors/depth in batches. */
export function moveFolder(user: User, folderId: string, parentId: string | null) {
  return callFolderRoute<{ ok: true; updated: number }>(user, `/api/folders/${folderId}/move`, { parentId });
}

/**
 * Server route. `move-up` (default) moves content to the parent folder; `delete-all` requires the
 * counts the user confirmed, and fails if they no longer match the server state.
 */
export function deleteFolder(
  user: User, folderId: string, mode: FolderDeleteMode,
  confirm?: { folders: number; documents: number },
) {
  return callFolderRoute<{ ok: true; deletedFolders: number; movedDocuments: number; deletedDocuments: number }>(
    user, `/api/folders/${folderId}/delete`, { mode, confirm },
  );
}
