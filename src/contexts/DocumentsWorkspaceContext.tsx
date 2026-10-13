'use client';

// Shared state for /documents: the page (table, breadcrumb) and the app Sidebar (folder tree,
// smart views) both read and mutate the same folders/documents, so it lives above both.
// Data is loaded each time the user enters /documents; elsewhere this provider is idle.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { getCases, getClients, type CaseDoc, type ClientDoc } from '@/lib/firestore';
import {
  createFolder as createFolderDoc, deleteFolder as deleteFolderRoute, getUserFolders,
  moveDocumentsToFolder, moveFolder as moveFolderRoute, renameFolder as renameFolderDoc,
} from '@/lib/folders/client';
import { effectiveFolderId, indexById, isNameTaken, planFolderMove } from '@/lib/folders/tree';
import { canUseFolders, validateFolderName, type FolderDeleteMode, type FolderRecord } from '@/lib/folders/types';
import { getClientForDoc } from '@/components/documents/helpers';
import {
  ROOT_LOCATION, availableViews, locationHref, type DocsLocation, type DragPayload,
} from '@/components/documents/workspace';

export type WorkspaceDialog =
  | { type: 'new-folder'; parentId: string | null }
  | { type: 'rename-folder'; folder: FolderRecord }
  | { type: 'move'; payload: DragPayload }
  | { type: 'delete-folder'; folder: FolderRecord }
  | { type: 'auto-organize' };

export interface WorkspaceNotice { kind: 'ok' | 'error'; text: string }

interface DocumentsWorkspace {
  enabled: boolean;                 // folders feature available for this plan
  loading: boolean;
  docs: DocumentRecord[];
  setDocs: React.Dispatch<React.SetStateAction<DocumentRecord[]>>;
  folders: FolderRecord[];
  foldersById: Map<string, FolderRecord>;
  cases: CaseDoc[];
  clients: ClientDoc[];
  views: ReturnType<typeof availableViews>;
  location: DocsLocation;
  setLocation: (loc: DocsLocation) => void;
  navigate: (loc: DocsLocation) => void;
  currentFolderId: string | null;   // folder that uploads / "Nueva carpeta" target
  reload: () => Promise<void>;
  createFolder: (parentId: string | null, name: string) => Promise<string | null>;
  renameFolder: (folderId: string, name: string) => Promise<string | null>;
  moveItems: (payload: DragPayload, targetId: string | null) => Promise<void>;
  deleteFolder: (folderId: string, mode: FolderDeleteMode, confirm?: { folders: number; documents: number }) => Promise<string | null>;
  dialog: WorkspaceDialog | null;
  openDialog: (d: WorkspaceDialog) => void;
  closeDialog: () => void;
  notice: WorkspaceNotice | null;
  notify: (n: WorkspaceNotice) => void;
}

const Ctx = createContext<DocumentsWorkspace | null>(null);

export function DocumentsWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, userDoc } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === '/documents' || !!pathname?.startsWith('/documents/');
  const enabled = canUseFolders(userDoc.plan);

  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<DocsLocation>(ROOT_LOCATION);
  const [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null);

  const notify = useCallback((n: WorkspaceNotice) => {
    setNotice(n);
    setTimeout(() => setNotice(cur => (cur === n ? null : cur)), 5000);
  }, []);

  const reload = useCallback(async () => {
    if (!userDoc.uid) return;
    try {
      const [d, f, c, cl] = await Promise.all([
        getUserDocuments(userDoc.uid),
        enabled ? getUserFolders(userDoc.uid) : Promise.resolve([]),
        getCases(userDoc.uid),
        getClients(userDoc.uid),
      ]);
      setDocs(d); setFolders(f); setCases(c); setClients(cl);
    } catch (err) {
      notify({ kind: 'error', text: `Error al cargar: ${(err as Error)?.message ?? err}` });
    } finally {
      setLoading(false);
    }
  }, [userDoc.uid, enabled, notify]);

  // Fresh data every time the user enters /documents (other pages create documents too).
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    reload();
  }, [active, reload]);

  const foldersById = useMemo(() => indexById(folders), [folders]);

  const views = useMemo(() => {
    if (!enabled) return [];
    const hasCaseDocs = docs.some(d => d.caseId && cases.some(c => c.id === d.caseId));
    const hasClientDocs = docs.some(d => getClientForDoc(d, cases, clients));
    return availableViews(docs, hasCaseDocs, hasClientDocs);
  }, [enabled, docs, cases, clients]);

  const currentFolderId = location.kind === 'folder' && location.folderId && foldersById.has(location.folderId)
    ? location.folderId : null;

  const navigate = useCallback((loc: DocsLocation) => router.push(locationHref(loc)), [router]);

  // ── Operations ───────────────────────────────────────────────

  const createFolder = useCallback(async (parentId: string | null, rawName: string) => {
    const name = rawName.trim();
    const invalid = validateFolderName(name);
    if (invalid) return invalid;
    if (isNameTaken(folders, parentId, name)) return `Ya existe una carpeta "${name}" aquí.`;
    const parent = parentId ? foldersById.get(parentId) ?? null : null;
    if (parent && parent.depth >= 8) return 'Se ha alcanzado la profundidad máxima (8 niveles).';
    try {
      const created = await createFolderDoc(userDoc.uid, name, parent);
      setFolders(prev => [...prev, created]);
      return null;
    } catch {
      return 'No se pudo crear la carpeta.';
    }
  }, [folders, foldersById, userDoc.uid]);

  const renameFolder = useCallback(async (folderId: string, rawName: string) => {
    const name = rawName.trim();
    const folder = foldersById.get(folderId);
    if (!folder || name === folder.name) return null;
    const invalid = validateFolderName(name);
    if (invalid) return invalid;
    if (isNameTaken(folders, folder.parentId, name, folderId)) return `Ya existe una carpeta "${name}" aquí.`;
    try {
      await renameFolderDoc(folderId, name);
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, name } : f)));
      return null;
    } catch {
      return 'No se pudo renombrar la carpeta.';
    }
  }, [folders, foldersById]);

  const moveItems = useCallback(async (payload: DragPayload, targetId: string | null) => {
    const targetName = targetId ? foldersById.get(targetId)?.name ?? 'carpeta' : 'Mis documentos';
    const docIds = payload.docIds.filter(id => {
      const d = docs.find(x => x.id === id);
      return d && effectiveFolderId(d, foldersById) !== targetId;
    });
    const folderIds = payload.folderIds.filter(id => id !== targetId && (foldersById.get(id)?.parentId ?? null) !== targetId);
    if (!docIds.length && !folderIds.length) return;

    // Validate folder moves locally first (cycle / depth / name) for an immediate message.
    for (const id of folderIds) {
      const plan = planFolderMove(folders, id, targetId);
      if (!plan.ok) { notify({ kind: 'error', text: plan.message }); return; }
    }

    const prevDocs = docs;
    if (docIds.length) {
      const moving = new Set(docIds);
      setDocs(cur => cur.map(d => (moving.has(d.id) ? { ...d, folderId: targetId } : d)));
    }
    try {
      await moveDocumentsToFolder(docIds, targetId);
      for (const id of folderIds) await moveFolderRoute(user, id, targetId);
      if (folderIds.length) setFolders(await getUserFolders(userDoc.uid));
      const n = docIds.length + folderIds.length;
      notify({ kind: 'ok', text: `${n} elemento${n !== 1 ? 's' : ''} movido${n !== 1 ? 's' : ''} a ${targetName}` });
    } catch (err) {
      setDocs(prevDocs);
      if (folderIds.length) setFolders(await getUserFolders(userDoc.uid).catch(() => folders));
      notify({ kind: 'error', text: (err as Error)?.message || 'No se pudo mover.' });
    }
  }, [docs, folders, foldersById, notify, user, userDoc.uid]);

  const deleteFolder = useCallback(async (
    folderId: string, mode: FolderDeleteMode, confirm?: { folders: number; documents: number },
  ) => {
    const folder = foldersById.get(folderId);
    try {
      await deleteFolderRoute(user, folderId, mode, confirm);
    } catch (err) {
      return (err as Error)?.message || 'No se pudo eliminar la carpeta.';
    }
    // If we were inside the deleted subtree, go to its parent.
    if (currentFolderId && (currentFolderId === folderId || foldersById.get(currentFolderId)?.ancestors.includes(folderId))) {
      navigate({ kind: 'folder', folderId: folder?.parentId ?? null });
    }
    await reload();
    notify({ kind: 'ok', text: `Carpeta "${folder?.name ?? ''}" eliminada` });
    return null;
  }, [currentFolderId, foldersById, navigate, notify, reload, user]);

  const value: DocumentsWorkspace = {
    enabled, loading, docs, setDocs, folders, foldersById, cases, clients, views,
    location, setLocation, navigate, currentFolderId, reload,
    createFolder, renameFolder, moveItems, deleteFolder,
    dialog, openDialog: setDialog, closeDialog: () => setDialog(null),
    notice, notify,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocumentsWorkspace(): DocumentsWorkspace {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDocumentsWorkspace must be used within DocumentsWorkspaceProvider');
  return ctx;
}
