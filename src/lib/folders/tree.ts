// Pure folder-tree logic shared by the /documents UI, the /api/folders routes and unit tests.
// No Firebase imports here — callers pass plain records and apply the returned plan.

import { FOLDER_MAX_DEPTH, type FolderRecord, type FolderDeleteMode } from './types';

type FolderLike = Pick<FolderRecord, 'id' | 'name' | 'parentId' | 'ancestors' | 'depth'>;
type DocLike = { id: string; folderId?: string | null };

export const ROOT_LABEL = 'Mis documentos';

// ── Indexing & lookup ────────────────────────────────────────────

export function indexById<F extends FolderLike>(folders: F[]): Map<string, F> {
  return new Map(folders.map(f => [f.id, f]));
}

export function childrenOf<F extends FolderLike>(folders: F[], parentId: string | null): F[] {
  return folders
    .filter(f => (f.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/** Folders from the top level down to (and including) `folderId`. Unknown ids are skipped. */
export function folderPath<F extends FolderLike>(folderId: string | null | undefined, byId: Map<string, F>): F[] {
  if (!folderId) return [];
  const self = byId.get(folderId);
  if (!self) return [];
  return [...self.ancestors.map(id => byId.get(id)).filter((f): f is F => !!f), self];
}

export function folderPathLabel(folderId: string | null | undefined, byId: Map<string, FolderLike>): string {
  return [ROOT_LABEL, ...folderPath(folderId, byId).map(f => f.name)].join(' › ');
}

/** Ids of every folder strictly below `folderId`. */
export function descendantIds(folders: FolderLike[], folderId: string): string[] {
  return folders.filter(f => f.ancestors.includes(folderId)).map(f => f.id);
}

/** Resolves a document's folder, treating missing or dangling folderIds as root. */
export function effectiveFolderId(doc: DocLike, byId: Map<string, FolderLike>): string | null {
  return doc.folderId && byId.has(doc.folderId) ? doc.folderId : null;
}

// ── Names ────────────────────────────────────────────────────────

export function isNameTaken(
  folders: FolderLike[], parentId: string | null, name: string, excludeId?: string,
): boolean {
  const n = name.trim().toLocaleLowerCase('es');
  return folders.some(f =>
    f.id !== excludeId && (f.parentId ?? null) === parentId && f.name.trim().toLocaleLowerCase('es') === n,
  );
}

/** "Nueva carpeta", "Nueva carpeta (2)", … — first name not used in `parentId`. */
export function uniqueName(folders: FolderLike[], parentId: string | null, base: string, excludeId?: string): string {
  if (!isNameTaken(folders, parentId, base, excludeId)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`;
    if (!isNameTaken(folders, parentId, candidate, excludeId)) return candidate;
  }
}

// ── Move ─────────────────────────────────────────────────────────

export interface FolderPatch {
  id: string;
  parentId?: string | null;
  name?: string;
  ancestors: string[];
  depth: number;
}

export type PlanError = { ok: false; code: 'not-found' | 'cycle' | 'depth' | 'name-taken' | 'noop'; message: string };

export function planFolderMove(
  folders: FolderLike[], folderId: string, newParentId: string | null,
): { ok: true; patches: FolderPatch[] } | PlanError {
  const byId = indexById(folders);
  const folder = byId.get(folderId);
  if (!folder) return { ok: false, code: 'not-found', message: 'Carpeta no encontrada.' };
  if ((folder.parentId ?? null) === newParentId) {
    return { ok: false, code: 'noop', message: 'La carpeta ya está en ese destino.' };
  }

  let base: string[] = [];
  if (newParentId) {
    const parent = byId.get(newParentId);
    if (!parent) return { ok: false, code: 'not-found', message: 'Carpeta de destino no encontrada.' };
    if (newParentId === folderId || parent.ancestors.includes(folderId)) {
      return { ok: false, code: 'cycle', message: 'No puedes mover una carpeta dentro de sí misma.' };
    }
    base = [...parent.ancestors, parent.id];
  }

  if (isNameTaken(folders, newParentId, folder.name, folderId)) {
    return { ok: false, code: 'name-taken', message: `Ya existe una carpeta "${folder.name}" en el destino.` };
  }

  const patches: FolderPatch[] = [{ id: folderId, parentId: newParentId, ancestors: base, depth: base.length + 1 }];
  for (const d of folders) {
    const idx = d.ancestors.indexOf(folderId);
    if (idx === -1) continue;
    const ancestors = [...base, folderId, ...d.ancestors.slice(idx + 1)];
    patches.push({ id: d.id, ancestors, depth: ancestors.length + 1 });
  }

  const maxDepth = Math.max(...patches.map(p => p.depth));
  if (maxDepth > FOLDER_MAX_DEPTH) {
    return { ok: false, code: 'depth', message: `Se superaría la profundidad máxima de ${FOLDER_MAX_DEPTH} niveles.` };
  }
  return { ok: true, patches };
}

// ── Delete ───────────────────────────────────────────────────────

export interface FolderDeletePlan {
  deleteFolderIds: string[];                         // folder itself (+ subtree in delete-all)
  folderPatches: FolderPatch[];                      // move-up: re-parented descendants
  docMoves: { id: string; folderId: string | null }[]; // move-up: docs moved to the parent
  deleteDocIds: string[];                            // delete-all: docs removed
  counts: { folders: number; documents: number };    // what the user must confirm (subtree content)
}

export function planFolderDelete(
  folders: FolderLike[], docs: DocLike[], folderId: string, mode: FolderDeleteMode,
): { ok: true; plan: FolderDeletePlan } | PlanError {
  const byId = indexById(folders);
  const folder = byId.get(folderId);
  if (!folder) return { ok: false, code: 'not-found', message: 'Carpeta no encontrada.' };

  const subtree = new Set(descendantIds(folders, folderId));
  const inSubtree = (fid: string | null | undefined) => !!fid && (fid === folderId || subtree.has(fid));
  const counts = { folders: subtree.size, documents: docs.filter(d => inSubtree(d.folderId)).length };

  if (mode === 'delete-all') {
    return {
      ok: true,
      plan: {
        deleteFolderIds: [folderId, ...subtree],
        folderPatches: [],
        docMoves: [],
        deleteDocIds: docs.filter(d => inSubtree(d.folderId)).map(d => d.id),
        counts,
      },
    };
  }

  // move-up: direct children and documents go to the folder's parent; the rest of the
  // subtree keeps its shape but loses `folderId` from its ancestors.
  const parentId = folder.parentId ?? null;
  const siblings = folders.filter(f => f.id !== folderId);
  const folderPatches: FolderPatch[] = [];
  for (const d of folders) {
    const idx = d.ancestors.indexOf(folderId);
    if (idx === -1) continue;
    const ancestors = [...d.ancestors.slice(0, idx), ...d.ancestors.slice(idx + 1)];
    const patch: FolderPatch = { id: d.id, ancestors, depth: ancestors.length + 1 };
    if (d.parentId === folderId) {
      patch.parentId = parentId;
      const name = uniqueName(siblings, parentId, d.name, d.id);
      if (name !== d.name) patch.name = name;
      // Later children must see this one in its new place to avoid a second name clash.
      const i = siblings.findIndex(f => f.id === d.id);
      siblings[i] = { ...siblings[i], name, parentId };
    }
    folderPatches.push(patch);
  }

  return {
    ok: true,
    plan: {
      deleteFolderIds: [folderId],
      folderPatches,
      docMoves: docs.filter(d => d.folderId === folderId).map(d => ({ id: d.id, folderId: parentId })),
      deleteDocIds: [],
      counts,
    },
  };
}

// ── Auto-organize suggestion ─────────────────────────────────────

export interface AutoOrganizeInput {
  docs: { id: string; folderId?: string | null; caseId?: string | null; clientId?: string | null }[];
  cases: { id: string; ref?: string; title?: string; clientId?: string }[];
  clients: { id: string; name: string }[];
}

export interface AutoOrganizeGroup {
  parentName: 'Casos' | 'Clientes';
  name: string;
  docIds: string[];
}

/**
 * Proposes Casos/{ref} and Clientes/{cliente} folders for documents still in root.
 * A case link wins over a client link (the case already implies the client).
 */
export function planAutoOrganize(input: AutoOrganizeInput, sanitize: (s: string) => string): AutoOrganizeGroup[] {
  const groups = new Map<string, AutoOrganizeGroup>();
  const caseById = new Map(input.cases.map(c => [c.id, c]));
  const clientById = new Map(input.clients.map(c => [c.id, c]));
  const add = (parentName: AutoOrganizeGroup['parentName'], rawName: string, docId: string) => {
    const name = sanitize(rawName);
    const key = `${parentName}/${name.toLocaleLowerCase('es')}`;
    const g = groups.get(key) ?? { parentName, name, docIds: [] };
    g.docIds.push(docId);
    groups.set(key, g);
  };

  for (const d of input.docs) {
    if (d.folderId) continue;
    const c = d.caseId ? caseById.get(d.caseId) : undefined;
    if (c) { add('Casos', c.ref || c.title || c.id, d.id); continue; }
    const cl = d.clientId ? clientById.get(d.clientId) : undefined;
    if (cl) add('Clientes', cl.name, d.id);
  }
  return [...groups.values()].sort((a, b) =>
    a.parentName.localeCompare(b.parentName) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/** Splits an array in chunks (Firestore batches are limited to 500 writes). */
export function chunk<T>(items: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type { FolderDeleteMode };
