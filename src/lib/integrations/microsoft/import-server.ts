// OneDrive / SharePoint file import (F1, step 1). Server-only (Admin SDK).
// Read-only towards Microsoft (M2): item metadata + content GETs only. Avocat stores a copy (M1)
// with documents.externalRef pointing back to the source. One file per request, so a single call
// stays well inside Hosting's 60 s; the browser drives the list and shows progress.

import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db, storage } from '@/lib/firebase-admin';
import { firebaseDownloadUrl } from '@/lib/signatures/filing';
import { getAccessToken } from './connection';
import { graphDownload, graphGet } from './oauth';
import {
  checkItem, extOf, MAX_IMPORT_BYTES, providerOf, readablePath, storageFileName,
  type DriveItemMeta, type ItemCheck,
} from './import';

export class ImportError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

const PLAN_FOLDER: Record<string, string> = { Abogados: 'abogado', Estudiantes: 'estudiante', Autoservicio: 'autoservicio' };
const bucketName = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';
const SELECT = '$select=id,name,size,eTag,webUrl,file,folder,parentReference';

async function itemMeta(token: string, driveId: string, itemId: string): Promise<DriveItemMeta | null> {
  try {
    return await graphGet<DriveItemMeta>(token, `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}?${SELECT}`);
  } catch (err) {
    if (/→ (403|404)$/.test((err as Error).message)) return null;
    throw err;
  }
}

async function existingCopies(uid: string, itemId: string) {
  const q = await db().collection('documents').where('userId', '==', uid).where('externalRef.itemId', '==', itemId).limit(5).get();
  return q.docs.map(d => ({ id: d.id, name: d.get('name') as string }));
}

export interface PreviewRow {
  driveId: string;
  itemId: string;
  name: string;
  size: number;
  provider: 'onedrive' | 'sharepoint';
  path: string;
  check: ItemCheck;
  duplicates: { id: string; name: string }[];
}

export async function previewImport(uid: string, items: { driveId: string; itemId: string }[]): Promise<PreviewRow[]> {
  const { token } = await getAccessToken(uid);
  return Promise.all(items.map(async it => {
    const m = await itemMeta(token, it.driveId, it.itemId);
    const check = checkItem(m);
    return {
      driveId: it.driveId, itemId: it.itemId,
      name: m?.name ?? it.itemId, size: m?.size ?? 0,
      provider: m ? providerOf(m) : 'onedrive',
      path: readablePath(m?.parentReference?.path),
      check,
      duplicates: check === 'ok' ? await existingCopies(uid, it.itemId) : [],
    };
  }));
}

async function owned(collection: string, id: string | null | undefined, uid: string): Promise<boolean> {
  if (!id) return true;
  const s = await db().collection(collection).doc(id).get();
  return s.exists && s.get('userId') === uid;
}

export async function importFile(uid: string, input: {
  driveId: string; itemId: string; folderId?: string | null; caseId?: string | null; clientId?: string | null;
}): Promise<Record<string, unknown> & { id: string }> {
  const [okFolder, okCase, okClient] = await Promise.all([
    owned('folders', input.folderId, uid), owned('cases', input.caseId, uid), owned('clients', input.clientId, uid),
  ]);
  if (!okFolder || !okCase || !okClient) throw new ImportError('Destino no válido.', 'invalid_destination', 400);

  const { token } = await getAccessToken(uid);
  const m = await itemMeta(token, input.driveId, input.itemId);
  const check = checkItem(m);
  if (check !== 'ok' || !m) {
    const msg: Record<ItemCheck, string> = {
      ok: '', folder: 'Es una carpeta.', unsupported: 'Formato no compatible.',
      too_large: 'Supera 25 MB.', not_found: 'No encontrado o sin acceso.',
    };
    throw new ImportError(msg[check], check, 422);
  }

  const content = await graphDownload(token,
    `/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`, MAX_IMPORT_BYTES)
    .catch(err => {
      if ((err as Error).message === 'too_large') throw new ImportError('Supera 25 MB.', 'too_large', 422);
      throw err;
    });

  const plan = (await db().collection('users').doc(uid).get()).get('plan') as string | undefined;
  const name = storageFileName(m.name ?? 'documento');
  const section = input.caseId ? `casos/${input.caseId}` : 'importados';
  const path = `users/${uid}/${PLAN_FOLDER[plan ?? ''] ?? 'autoservicio'}/${section}/${Date.now()}_${name}`;
  const dlToken = randomUUID();
  await storage().bucket(bucketName()).file(path).save(content, {
    resumable: false,
    contentType: m.file?.mimeType || 'application/octet-stream',
    metadata: { metadata: { firebaseStorageDownloadTokens: dlToken } },
  });

  const now = new Date().toISOString();
  const record = {
    userId: uid,
    caseId: input.caseId ?? null,
    clientId: input.clientId ?? null,
    folderId: input.folderId ?? null,
    name,
    type: extOf(name),
    size: content.length,
    storagePath: path,
    downloadUrl: firebaseDownloadUrl(bucketName(), path, dlToken),
    source: 'microsoft',
    externalRef: {
      provider: providerOf(m),
      driveId: input.driveId,
      itemId: input.itemId,
      webUrl: m.webUrl ?? null,
      path: readablePath(m.parentReference?.path),
      eTag: m.eTag ?? null,
      importedAt: now,
      lastSyncedAt: now,
    },
    createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await db().collection('documents').add(record);
  return { id: ref.id, ...record, createdAt: now };
}
