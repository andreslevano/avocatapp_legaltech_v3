// OneDrive / SharePoint import (F1). Server-only (Admin SDK).
// Read-only towards Microsoft (M2): item metadata, children listings and content GETs only. Avocat
// stores a copy (M1) with documents.externalRef pointing back to the source.
//   import_jobs/{id} — one import (files + expanded folders), owner read-only; processed one item per
//   request (POST …/jobs/[id]/next) so each call stays well inside Hosting's 60 s. The job survives
//   navigation and closing the tab (it can be resumed); items are leased, so two tabs never import
//   the same file twice.

import { createHash, randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db, storage } from '@/lib/firebase-admin';
import { firebaseDownloadUrl } from '@/lib/signatures/filing';
import { sanitizeFolderName, FOLDER_MAX_DEPTH, type FolderSource } from '@/lib/folders/types';
import { getAccessToken } from './connection';
import { ReconnectRequiredError } from './errors';
import { graphDownload, graphGet } from './oauth';
import {
  checkItem, clipRel, extOf, jobCounts, MAX_IMPORT_BYTES, MAX_JOB_FILES, MAX_SOURCE_DEPTH, nextItemIndex,
  providerOf, readablePath, relKey, storageFileName,
  type DriveItemMeta, type ItemCheck, type JobItem, type RelPath,
} from './import';

export class ImportError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

const PLAN_FOLDER: Record<string, string> = { Abogados: 'abogado', Estudiantes: 'estudiante', Autoservicio: 'autoservicio' };
const bucketName = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';
const SELECT = '$select=id,name,size,eTag,webUrl,file,folder,parentReference';
const nowIso = () => new Date().toISOString();
const jobs = () => db().collection('import_jobs');
const itemPath = (driveId: string, itemId: string) => `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`;

async function itemMeta(token: string, driveId: string, itemId: string): Promise<DriveItemMeta | null> {
  try {
    return await graphGet<DriveItemMeta>(token, `${itemPath(driveId, itemId)}?${SELECT}`);
  } catch (err) {
    if (/→ (403|404)$/.test((err as Error).message)) return null;
    throw err;
  }
}

/** itemIds already imported by this user (duplicate detection). */
async function importedItemIds(uid: string): Promise<Map<string, { id: string; name: string }>> {
  const q = await db().collection('documents').where('userId', '==', uid).where('source', '==', 'microsoft').get();
  const m = new Map<string, { id: string; name: string }>();
  q.docs.forEach(d => { const id = d.get('externalRef.itemId'); if (id && !m.has(id)) m.set(id, { id: d.id, name: d.get('name') }); });
  return m;
}

// ── Folder expansion ────────────────────────────────────────────

export interface ExpandedFile { driveId: string; itemId: string; name: string; size: number; rel: RelPath; check: ItemCheck }
export interface ExpandedFolder { key: string; name: string; source: FolderSource }
interface Expansion { files: ExpandedFile[]; folders: ExpandedFolder[]; truncated: boolean }

/** Walks a selected folder (breadth-first, read-only) up to MAX_JOB_FILES files and MAX_SOURCE_DEPTH levels. */
async function expandFolder(token: string, root: DriveItemMeta, budget: number): Promise<Expansion> {
  const driveId = root.parentReference?.driveId ?? '';
  const out: Expansion = { files: [], folders: [], truncated: false };
  const queue: { id: string; rel: RelPath; meta: DriveItemMeta }[] = [{ id: root.id, rel: [sanitizeFolderName(root.name ?? 'Carpeta')], meta: root }];
  while (queue.length) {
    const dir = queue.shift()!;
    out.folders.push({
      key: relKey(dir.rel), name: dir.rel[dir.rel.length - 1],
      source: { provider: 'microsoft', driveId, itemId: dir.id, webUrl: dir.meta.webUrl ?? '', path: readablePath(dir.meta.parentReference?.path) },
    });
    let next: string | null = `${itemPath(driveId, dir.id)}/children?${SELECT}&$top=200`;
    while (next) {
      const page: { value: DriveItemMeta[]; '@odata.nextLink'?: string } = await graphGet(token, next);
      for (const child of page.value) {
        if (child.folder) {
          if (dir.rel.length < MAX_SOURCE_DEPTH) queue.push({ id: child.id, rel: [...dir.rel, sanitizeFolderName(child.name ?? 'Carpeta')], meta: child });
          else out.truncated = true;
          continue;
        }
        if (out.files.length >= budget) { out.truncated = true; return out; }
        out.files.push({ driveId, itemId: child.id, name: child.name ?? child.id, size: child.size ?? 0, rel: dir.rel, check: checkItem(child) });
      }
      // nextLink is absolute; graphGet takes the path after /v1.0.
      next = page['@odata.nextLink']?.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, '') ?? null;
    }
  }
  return out;
}

// ── Preview ─────────────────────────────────────────────────────

export interface PreviewRow {
  driveId: string;
  itemId: string;
  name: string;
  size: number;
  provider: 'onedrive' | 'sharepoint';
  path: string;
  check: ItemCheck;
  duplicates: { id: string; name: string }[];
  /** For a selected folder: what's inside (importable, problems, already imported). */
  folder?: { files: number; importable: number; problems: number; duplicates: number; truncated: boolean };
}

export interface PreviewResult { rows: PreviewRow[]; files: (ExpandedFile & { duplicateOf: string | null })[]; folders: ExpandedFolder[] }

export async function previewImport(uid: string, items: { driveId: string; itemId: string }[]): Promise<PreviewResult> {
  const { token } = await getAccessToken(uid);
  const imported = await importedItemIds(uid);
  const rows: PreviewRow[] = [];
  const files: PreviewResult['files'] = [];
  const folders: ExpandedFolder[] = [];
  for (const it of items) {
    const m = await itemMeta(token, it.driveId, it.itemId);
    const check = checkItem(m);
    const base = {
      driveId: it.driveId, itemId: it.itemId, name: m?.name ?? it.itemId, size: m?.size ?? 0,
      provider: m ? providerOf(m) : 'onedrive' as const, path: readablePath(m?.parentReference?.path), check,
    };
    if (check === 'folder' && m) {
      const exp = await expandFolder(token, m, MAX_JOB_FILES - files.length);
      const inside = exp.files.map(f => ({ ...f, duplicateOf: imported.get(f.itemId)?.id ?? null }));
      files.push(...inside);
      folders.push(...exp.folders);
      rows.push({
        ...base, duplicates: [],
        folder: {
          files: inside.length,
          importable: inside.filter(f => f.check === 'ok' && !f.duplicateOf).length,
          problems: inside.filter(f => f.check !== 'ok').length,
          duplicates: inside.filter(f => f.check === 'ok' && f.duplicateOf).length,
          truncated: exp.truncated || files.length >= MAX_JOB_FILES,
        },
      });
      continue;
    }
    const dup = imported.get(it.itemId);
    rows.push({ ...base, duplicates: dup ? [dup] : [] });
    if (m && files.length < MAX_JOB_FILES) files.push({ driveId: it.driveId, itemId: it.itemId, name: base.name, size: base.size, rel: [], check, duplicateOf: dup?.id ?? null });
  }
  return { rows, files, folders };
}

// ── Single-file copy ────────────────────────────────────────────

async function owned(collection: string, id: string | null | undefined, uid: string): Promise<boolean> {
  if (!id) return true;
  const s = await db().collection(collection).doc(id).get();
  return s.exists && s.get('userId') === uid;
}

const CHECK_MESSAGE: Record<ItemCheck, string> = {
  ok: '', folder: 'Es una carpeta.', unsupported: 'Formato no compatible.',
  too_large: 'Supera 25 MB.', not_found: 'No encontrado o sin acceso.',
};

export async function importFile(uid: string, input: {
  driveId: string; itemId: string; folderId?: string | null; caseId?: string | null; clientId?: string | null; token?: string;
}): Promise<Record<string, unknown> & { id: string }> {
  const token = input.token ?? (await getAccessToken(uid)).token;
  const m = await itemMeta(token, input.driveId, input.itemId);
  const check = checkItem(m);
  if (check !== 'ok' || !m) throw new ImportError(CHECK_MESSAGE[check], check, 422);

  const content = await graphDownload(token, `${itemPath(input.driveId, input.itemId)}/content`, MAX_IMPORT_BYTES)
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

  const now = nowIso();
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

// ── Import jobs ─────────────────────────────────────────────────

export interface ImportJob {
  id: string;
  userId: string;
  status: 'running' | 'done' | 'cancelled' | 'paused';
  pausedReason?: 'reconnect' | null;
  destinationFolderId: string | null;
  destinationDepth: number;
  keepStructure: boolean;
  caseId: string | null;
  clientId: string | null;
  analyze: boolean;
  items: JobItem[];
  folders: ExpandedFolder[];
  folderIds: Record<string, string>;   // sha1(relKey) → Avocat folder id
  counts: ReturnType<typeof jobCounts>;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
}

export interface JobInput {
  destinationFolderId: string | null;
  keepStructure: boolean;
  caseId: string | null;
  clientId: string | null;
  analyze: boolean;
  files: { driveId: string; itemId: string; name: string; size: number; rel: RelPath }[];
  folders: ExpandedFolder[];
}

export async function createImportJob(uid: string, input: JobInput): Promise<string> {
  const [okFolder, okCase, okClient] = await Promise.all([
    owned('folders', input.destinationFolderId, uid), owned('cases', input.caseId, uid), owned('clients', input.clientId, uid),
  ]);
  if (!okFolder || !okCase || !okClient) throw new ImportError('Destino no válido.', 'invalid_destination', 400);
  if (!input.files.length) throw new ImportError('No hay archivos que importar.', 'empty', 400);
  if (input.files.length > MAX_JOB_FILES) throw new ImportError(`Máximo ${MAX_JOB_FILES} archivos por importación.`, 'too_many', 400);
  const destinationDepth = input.destinationFolderId
    ? Number((await db().collection('folders').doc(input.destinationFolderId).get()).get('depth') ?? 0) : 0;

  const items: JobItem[] = input.files.map(f => ({
    driveId: f.driveId, itemId: f.itemId, name: String(f.name).slice(0, 300), size: Number(f.size) || 0,
    rel: input.keepStructure ? clipRel(f.rel.map(s => sanitizeFolderName(String(s))), destinationDepth, FOLDER_MAX_DEPTH) : [],
    status: 'pending', error: null, documentId: null, leaseAt: null,
  }));
  const ref = jobs().doc();
  const at = nowIso();
  await ref.set({
    userId: uid, status: 'running', pausedReason: null,
    destinationFolderId: input.destinationFolderId, destinationDepth,
    keepStructure: input.keepStructure, caseId: input.caseId, clientId: input.clientId, analyze: input.analyze,
    items, folders: input.keepStructure ? input.folders.slice(0, 500) : [], folderIds: {},
    counts: jobCounts(items), createdAt: at, updatedAt: at, finishedAt: null,
  });
  return ref.id;
}

const keyHash = (key: string) => createHash('sha1').update(key).digest('hex');

/** Avocat folder for a file's relative path: reuses the job's, then an existing same-name folder, else creates it. */
async function ensureFolderChain(uid: string, jobId: string, job: ImportJob, rel: RelPath): Promise<string | null> {
  let parentId = job.destinationFolderId;
  let ancestors: string[] = parentId
    ? [...((await db().collection('folders').doc(parentId).get()).get('ancestors') as string[] ?? []), parentId] : [];
  for (let i = 0; i < rel.length; i++) {
    const key = relKey(rel.slice(0, i + 1));
    const h = keyHash(key);
    let id = job.folderIds?.[h];
    if (!id) {
      const name = rel[i];
      const existing = await db().collection('folders')
        .where('userId', '==', uid).where('parentId', '==', parentId).where('name', '==', name).limit(1).get();
      if (!existing.empty) {
        id = existing.docs[0].id;
      } else {
        const src = job.folders?.find(f => f.key === key)?.source ?? null;
        const ref = await db().collection('folders').add({
          userId: uid, name, parentId, ancestors, depth: ancestors.length + 1,
          ...(src ? { source: src } : {}),
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        id = ref.id;
      }
      job.folderIds = { ...(job.folderIds ?? {}), [h]: id };
      await jobs().doc(jobId).update({ [`folderIds.${h}`]: id });
    }
    ancestors = [...ancestors, id];
    parentId = id;
  }
  return parentId;
}

export interface NextResult {
  status: ImportJob['status'];
  counts: ImportJob['counts'];
  item: Pick<JobItem, 'name' | 'status' | 'error' | 'documentId'> | null;
  document: (Record<string, unknown> & { id: string }) | null;
}

/** Imports the next pending item of a job (one per request). */
export async function runNextJobItem(uid: string, jobId: string): Promise<NextResult> {
  const ref = jobs().doc(jobId);
  const claim = await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists || s.get('userId') !== uid) throw new ImportError('Importación no encontrada.', 'not_found', 404);
    const job = { id: s.id, ...(s.data() as Omit<ImportJob, 'id'>) };
    if (job.status !== 'running') return { job, index: -1 };
    const index = nextItemIndex(job.items, Date.now());
    if (index < 0) {
      const counts = jobCounts(job.items);
      if (counts.pending === 0) {
        tx.update(ref, { status: 'done', counts, finishedAt: nowIso(), updatedAt: nowIso() });
        return { job: { ...job, status: 'done' as const, counts }, index: -1 };
      }
      return { job, index: -1 };      // the rest is leased by another tab
    }
    const items = job.items.map((it, i) => (i === index ? { ...it, status: 'running' as const, leaseAt: nowIso() } : it));
    tx.update(ref, { items, updatedAt: nowIso() });
    return { job: { ...job, items }, index };
  });
  const { job, index } = claim;
  if (index < 0) return { status: job.status, counts: jobCounts(job.items), item: null, document: null };

  const item = job.items[index];
  let patch: Partial<JobItem>;
  let document: NextResult['document'] = null;
  let paused = false;
  try {
    const folderId = job.keepStructure && item.rel.length ? await ensureFolderChain(uid, jobId, job, item.rel) : job.destinationFolderId;
    document = await importFile(uid, { driveId: item.driveId, itemId: item.itemId, folderId, caseId: job.caseId, clientId: job.clientId });
    patch = { status: 'done', documentId: document.id, error: null, leaseAt: null };
  } catch (err) {
    if (err instanceof ReconnectRequiredError) {
      paused = true;
      patch = { status: 'pending', leaseAt: null };
    } else {
      const msg = err instanceof ImportError ? err.message : 'No se pudo importar.';
      if (!(err instanceof ImportError)) console.error('[microsoft/import]', jobId, (err as Error).message);
      patch = { status: 'error', error: msg, leaseAt: null };
    }
  }

  const final = await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    const cur = s.data() as Omit<ImportJob, 'id'>;
    const items = cur.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    const counts = jobCounts(items);
    const status: ImportJob['status'] = paused ? 'paused' : cur.status === 'cancelled' ? 'cancelled' : counts.pending === 0 ? 'done' : cur.status;
    tx.update(ref, {
      items, counts, status, updatedAt: nowIso(),
      ...(paused ? { pausedReason: 'reconnect' } : {}),
      ...(status === 'done' ? { finishedAt: nowIso() } : {}),
    });
    return { status, counts };
  });
  return { ...final, item: { name: item.name, status: patch.status!, error: patch.error ?? null, documentId: patch.documentId ?? null }, document };
}

/** Cancel (remaining items skipped), retry failed items, or resume a paused job. */
export async function updateImportJob(uid: string, jobId: string, action: 'cancel' | 'retry_failed' | 'resume'): Promise<void> {
  const ref = jobs().doc(jobId);
  await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists || s.get('userId') !== uid) throw new ImportError('Importación no encontrada.', 'not_found', 404);
    const job = s.data() as Omit<ImportJob, 'id'>;
    let items = job.items;
    let status = job.status;
    if (action === 'cancel') {
      items = items.map(i => (i.status === 'pending' ? { ...i, status: 'skipped' as const } : i));
      status = 'cancelled';
    } else if (action === 'retry_failed') {
      items = items.map(i => (i.status === 'error' ? { ...i, status: 'pending' as const, error: null } : i));
      status = 'running';
    } else {
      status = 'running';
    }
    tx.update(ref, { items, status, pausedReason: null, counts: jobCounts(items), updatedAt: nowIso(), ...(status === 'running' ? { finishedAt: null } : {}) });
  });
}
