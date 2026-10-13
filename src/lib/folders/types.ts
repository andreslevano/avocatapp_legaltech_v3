// Folders (D1) — shared types and validation used by client, server routes and tests.
// A folder is where a document lives (documents.folderId). Folders are metadata only:
// moving a document or folder never touches Storage blobs.

export interface FolderSource {
  provider: 'microsoft';
  driveId: string;
  itemId: string;
  webUrl: string;
  path: string;
}

export interface FolderRecord {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  ancestors: string[];   // ids root → parent
  depth: number;         // 1 = top level, max FOLDER_MAX_DEPTH
  color?: string;
  source?: FolderSource | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export const FOLDER_MAX_DEPTH = 8;
export const FOLDER_NAME_MAX = 120;

// Feature gating — single constant (plan rule: Abogados first).
export const FOLDERS_PLAN = 'Abogados';
export function canUseFolders(plan: string | null | undefined): boolean {
  return plan === FOLDERS_PLAN;
}

// Keep in sync with isValidFolderName() in firestore.rules.
const FORBIDDEN = /[/\\:*?"<>|]/;

export function validateFolderName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'El nombre no puede estar vacío.';
  if (name.length > FOLDER_NAME_MAX) return `Máximo ${FOLDER_NAME_MAX} caracteres.`;
  if (FORBIDDEN.test(name)) return 'No se permiten los caracteres / \\ : * ? " < > |';
  if (name === '.' || name === '..') return 'Nombre no válido.';
  return null;
}

/** Replaces forbidden characters so an arbitrary label (client name, case ref) can be a folder name. */
export function sanitizeFolderName(raw: string): string {
  const cleaned = raw.replace(/[/\\:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX);
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : 'Sin nombre';
}

export type FolderDeleteMode = 'move-up' | 'delete-all';
