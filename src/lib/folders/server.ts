import { NextRequest, NextResponse } from 'next/server';
import type { DocumentReference, WriteBatch } from 'firebase-admin/firestore';
import { authAdmin, db } from '@/lib/firebase-admin';
import { chunk } from './tree';
import type { FolderRecord } from './types';

/** Returns the caller's uid, or a 401 response. */
export async function requireUid(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return (await authAdmin().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function loadUserFolders(uid: string): Promise<FolderRecord[]> {
  const snap = await db().collection('folders').where('userId', '==', uid).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FolderRecord));
}

export async function loadUserDocs(uid: string): Promise<{ id: string; folderId: string | null; storagePath?: string }[]> {
  const snap = await db().collection('documents').where('userId', '==', uid)
    .select('folderId', 'storagePath').get();
  return snap.docs.map(d => ({
    id: d.id,
    folderId: (d.get('folderId') as string | null | undefined) ?? null,
    storagePath: d.get('storagePath') as string | undefined,
  }));
}

type Op = (batch: WriteBatch) => void;

/** Commits writes in chunks below Firestore's 500-writes-per-batch limit, in order. */
export async function commitInBatches(ops: Op[]): Promise<void> {
  for (const group of chunk(ops)) {
    const batch = db().batch();
    group.forEach(op => op(batch));
    await batch.commit();
  }
}

export const folderRef = (id: string): DocumentReference => db().collection('folders').doc(id);
export const documentRef = (id: string): DocumentReference => db().collection('documents').doc(id);
