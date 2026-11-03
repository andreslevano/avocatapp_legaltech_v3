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
