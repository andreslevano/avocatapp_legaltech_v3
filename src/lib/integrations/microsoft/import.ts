// OneDrive / SharePoint import (F1 step 3–4, files). Pure — unit tested.
// Avocat keeps a COPY (M1); the source is only ever read (M2).

export const IMPORT_EXTENSIONS = new Set(['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'txt']);
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_ITEMS = 50;          // per import, files only (folders: step 2)

export type ImportProvider = 'onedrive' | 'sharepoint';

/** Graph driveItem fields we read. */
export interface DriveItemMeta {
  id: string;
  name?: string;
  size?: number;
  eTag?: string;
  webUrl?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  parentReference?: { driveId?: string; driveType?: string; path?: string };
}

export type ItemCheck = 'ok' | 'folder' | 'unsupported' | 'too_large' | 'not_found';

export const extOf = (name: string | undefined) => (name ?? '').split('.').pop()?.toLowerCase() ?? '';

export function checkItem(m: DriveItemMeta | null): ItemCheck {
  if (!m) return 'not_found';
  if (m.folder) return 'folder';
  if (!m.file || !IMPORT_EXTENSIONS.has(extOf(m.name))) return 'unsupported';
  if ((m.size ?? 0) > MAX_IMPORT_BYTES) return 'too_large';
  return 'ok';
}

/** documentLibrary = a SharePoint site library; personal / business = OneDrive. */
export function providerOf(m: Pick<DriveItemMeta, 'parentReference' | 'webUrl'>): ImportProvider {
  const t = m.parentReference?.driveType;
  if (t === 'documentLibrary') return 'sharepoint';
  if (t === 'personal' || t === 'business') return 'onedrive';
  return /sharepoint\.com\/sites\//i.test(m.webUrl ?? '') ? 'sharepoint' : 'onedrive';
}

/** "/drives/b!x/root:/Contratos/2026" → "Contratos / 2026" (readable source folder). */
export function readablePath(p: string | undefined): string {
  const after = (p ?? '').split('root:')[1] ?? '';
  return decodeURIComponent(after).split('/').filter(Boolean).join(' / ');
}

/** Safe file name for Storage (keeps the extension). */
export function storageFileName(name: string): string {
  const clean = name.normalize('NFC').replace(/[\\/:*?"<>|#%\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim();
  return (clean || 'documento').slice(0, 150);
}

const IDS = /^[A-Za-z0-9!_\-.]{1,200}$/;
/** driveId / itemId from the picker go into Graph paths: allow only their character set. */
export function validIds(driveId: unknown, itemId: unknown): driveId is string {
  return typeof driveId === 'string' && typeof itemId === 'string' && IDS.test(driveId) && IDS.test(itemId);
}

export const CONTRACT_NAME_RE = /(^|[\s_.-])(nda|confidencial\w*|contrato\w*|acuerdo\w*|agreement|contract)([\s_.-]|$)/i;

export const CHECK_LABEL: Record<ItemCheck, string> = {
  ok: '', folder: 'Carpeta: ábrela en el selector y elige sus archivos',
  unsupported: 'Formato no compatible', too_large: 'Supera 25 MB', not_found: 'No encontrado o sin acceso',
};

// ── Folders + import jobs (step 2) ──────────────────────────────

export const MAX_JOB_FILES = 300;     // per import (plan limit)
export const MAX_SOURCE_DEPTH = 8;    // levels below a selected folder that are walked

/** Directories of a file relative to the selected folder, e.g. ['Contratos', '2026']. */
export type RelPath = string[];

export const relKey = (rel: RelPath) => rel.join('/');

/**
 * Folders (D1) are at most 8 deep. A structure that would go deeper is kept up to the limit and
 * the rest lands in the deepest folder allowed (nothing is lost, only flattened).
 */
export function clipRel(rel: RelPath, destinationDepth: number, maxDepth = 8): RelPath {
  return rel.slice(0, Math.max(0, maxDepth - destinationDepth));
}

export type JobItemStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

export interface JobItem {
  driveId: string;
  itemId: string;
  name: string;
  size: number;
  rel: RelPath;
  status: JobItemStatus;
  error?: string | null;
  documentId?: string | null;
  leaseAt?: string | null;
}

/** The next item to process: pending, or running with an expired lease (tab closed mid-file). */
export function nextItemIndex(items: Pick<JobItem, 'status' | 'leaseAt'>[], nowMs: number, leaseMs = 120_000): number {
  return items.findIndex(i => i.status === 'pending'
    || (i.status === 'running' && (!i.leaseAt || nowMs - Date.parse(i.leaseAt) > leaseMs)));
}

export function jobCounts(items: Pick<JobItem, 'status'>[]) {
  const c = { total: items.length, done: 0, error: 0, skipped: 0, pending: 0 };
  for (const i of items) {
    if (i.status === 'done') c.done++;
    else if (i.status === 'error') c.error++;
    else if (i.status === 'skipped') c.skipped++;
    else c.pending++;
  }
  return c;
}
