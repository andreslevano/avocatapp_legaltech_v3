'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocumentsWorkspace } from '@/contexts/DocumentsWorkspaceContext';
import {
  uploadDocument, updateDocumentMeta, deleteDocumentRecord,
  type DocumentRecord,
} from '@/lib/storage-client';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import DocFiltersBar, { type SearchScope } from '@/components/documents/DocFiltersBar';
import DocTable, { type DocAction, type FolderAction, type FolderRow } from '@/components/documents/DocTable';
import DocPreviewPanel from '@/components/documents/DocPreviewPanel';
import Breadcrumb from '@/components/documents/Breadcrumb';
import FolderDialogs from '@/components/documents/FolderDialogs';
import { IconFolder } from '@/components/documents/FolderTree';
import { LinkCaseModal, LinkClientModal, DeleteConfirmModal } from '@/components/documents/modals';
import {
  EMPTY_FILTERS, activeFilterCount, applyFilters, getClientForDoc, sortDocs, tsSeconds,
  type DocFilters, type SortCol, type SortDir,
} from '@/components/documents/helpers';
import {
  ROOT_LOCATION, SMART_VIEWS, isFileDrag, parseLocation, type DragPayload,
} from '@/components/documents/workspace';
import {
  childrenOf, effectiveFolderId, folderPathLabel, planAutoOrganize,
} from '@/lib/folders/tree';
import { sanitizeFolderName } from '@/lib/folders/types';

async function triggerEmbed(docId: string, idToken: string) {
  fetch('/api/documents/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ docId }),
  }).catch(() => {});
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const AUTO_ORGANIZE_DISMISSED = 'avocat:autoOrganizeDismissed';

export default function DocumentsPage() {
  // useSearchParams needs a Suspense boundary (same pattern as /tools/analisis).
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-40">
        <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
      </div>
    }>
      <DocumentsView />
    </Suspense>
  );
}

function DocumentsView() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ws = useDocumentsWorkspace();
  const { docs, setDocs, folders, foldersById, cases, clients, loading, enabled, currentFolderId } = ws;

  // ── Location (URL is the source of truth; published to the Sidebar tree) ──
  const searchKey = searchParams?.toString() ?? '';
  const location = useMemo(
    () => (enabled ? parseLocation(new URLSearchParams(searchKey)) : ROOT_LOCATION),
    [enabled, searchKey],
  );
  const { setLocation } = ws;
  useEffect(() => { setLocation(location); }, [location, setLocation]);

  const [error, setError] = useState('');

  // View & sort
  const [sortCol, setSortCol] = useState<SortCol>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters & search scope
  const [filters, setFilters] = useState<DocFilters>(EMPTY_FILTERS);
  const [scope, setScope] = useState<SearchScope>('folder');

  // Selection (documents only) — cleared when the location changes
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { setSelected(new Set()); }, [searchKey, scope]);

  // Preview (by id, so moves/renames are reflected)
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewDoc = previewId ? docs.find(d => d.id === previewId) ?? null : null;

  // Upload
  const fileRef   = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadToast, setUploadToast] = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [addMenu,    setAddMenu]    = useState(false);

  // Modals
  const [modal, setModal] = useState<{
    type: 'link-case' | 'link-client' | 'delete';
    docs: DocumentRecord[];
  } | null>(null);

  // Indexing
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState('');

  // Auto-organize suggestion (per-viewer convenience → localStorage)
  const [organizeDismissed, setOrganizeDismissed] = useState(true);
  useEffect(() => {
    try { setOrganizeDismissed(localStorage.getItem(`${AUTO_ORGANIZE_DISMISSED}:${userDoc.uid}`) === '1'); }
    catch { setOrganizeDismissed(false); }
  }, [userDoc.uid]);
  const dismissOrganize = () => {
    setOrganizeDismissed(true);
    try { localStorage.setItem(`${AUTO_ORGANIZE_DISMISSED}:${userDoc.uid}`, '1'); } catch { /* ignore */ }
  };

  const { openDialog } = ws;
  const openNewFolder = useCallback(
    () => openDialog({ type: 'new-folder', parentId: currentFolderId }),
    [openDialog, currentFolderId],
  );

  // Shift+N → Nueva carpeta (ignored while typing)
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== 'n') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (ws.dialog) return;
      e.preventDefault();
      openNewFolder();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, openNewFolder, ws.dialog]);

  useEffect(() => {
    if (!addMenu) return;
    const close = () => setAddMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [addMenu]);

  // ── Upload (lands in the current folder) ───────────────────────

  const doUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const activeCaseId = filters.caseId && filters.caseId !== '__none__' ? filters.caseId : undefined;
      const idToken = await user.getIdToken();
      let last: DocumentRecord | null = null;
      for (const file of files) {
        const record = await uploadDocument(userDoc.uid, file, activeCaseId ?? null, enabled ? currentFolderId : null);
        setDocs(prev => [record, ...prev]);
        triggerEmbed(record.id, idToken);
        last = record;
      }
      if (last) {
        setUploadToast(last.id);
        setTimeout(() => setUploadToast(''), 6000);
      }
    } catch { setError('Error al subir el documento.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }, [user, userDoc.uid, filters.caseId, enabled, currentFolderId, setDocs]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    doUpload(Array.from(e.target.files ?? []));
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;   // row drags are handled by folder/tree/breadcrumb targets
    e.preventDefault();
    setDragOver(false);
    doUpload(Array.from(e.dataTransfer.files ?? []));
  };

  // ── Sort ──────────────────────────────────────────────────────

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  // ── Derived: what this location shows ─────────────────────────

  const globalScope = enabled && location.kind === 'folder' && scope === 'all';
  const view = location.kind === 'view' ? SMART_VIEWS.find(v => v.id === location.view) ?? null : null;
  const otherFiltersActive = activeFilterCount({ ...filters, search: '' }) > 0;

  const docFolder = useCallback((d: DocumentRecord) => effectiveFolderId(d, foldersById), [foldersById]);

  const { baseDocs, folderRows, viewGroupLabel } = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const countIn = (folderId: string) =>
      folders.filter(f => f.parentId === folderId).length + docs.filter(d => docFolder(d) === folderId).length;

    if (!enabled) return { baseDocs: docs, folderRows: [] as FolderRow[], viewGroupLabel: undefined };

    if (location.kind === 'view' && view) {
      if (view.id === 'casos') {
        if (!location.key) {
          const rows = cases
            .map(c => ({ c, n: docs.filter(d => d.caseId === c.id).length }))
            .filter(({ c, n }) => n > 0 && (!search || c.title.toLowerCase().includes(search)))
            .map(({ c, n }) => ({ id: c.id, name: c.title, itemCount: n, modified: c.updatedAt, virtual: true }));
          return { baseDocs: [], folderRows: rows, viewGroupLabel: undefined };
        }
        return {
          baseDocs: docs.filter(d => d.caseId === location.key),
          folderRows: [],
          viewGroupLabel: cases.find(c => c.id === location.key)?.title,
        };
      }
      if (view.id === 'clientes') {
        if (!location.key) {
          const rows = clients
            .map(c => ({ c, n: docs.filter(d => getClientForDoc(d, cases, clients)?.id === c.id).length }))
            .filter(({ c, n }) => n > 0 && (!search || c.name.toLowerCase().includes(search)))
            .map(({ c, n }) => ({ id: c.id, name: c.name, itemCount: n, modified: c.lastCaseDate, virtual: true }));
          return { baseDocs: [], folderRows: rows, viewGroupLabel: undefined };
        }
        return {
          baseDocs: docs.filter(d => getClientForDoc(d, cases, clients)?.id === location.key),
          folderRows: [],
          viewGroupLabel: clients.find(c => c.id === location.key)?.name,
        };
      }
      return { baseDocs: docs.filter(d => view.match!(d)), folderRows: [], viewGroupLabel: undefined };
    }

    if (globalScope) {
      const rows = search && !otherFiltersActive
        ? folders.filter(f => f.name.toLowerCase().includes(search)).map(f => ({
            id: f.id, name: f.name, itemCount: countIn(f.id), modified: f.updatedAt,
            path: folderPathLabel(f.parentId, foldersById),
          }))
        : [];
      return { baseDocs: docs, folderRows: rows, viewGroupLabel: undefined };
    }

    const rows = otherFiltersActive ? [] : childrenOf(folders, currentFolderId)
      .filter(f => !search || f.name.toLowerCase().includes(search))
      .map(f => ({ id: f.id, name: f.name, itemCount: countIn(f.id), modified: f.updatedAt }));
    return {
      baseDocs: docs.filter(d => docFolder(d) === currentFolderId),
      folderRows: rows,
      viewGroupLabel: undefined,
    };
  }, [enabled, location, view, docs, folders, foldersById, cases, clients, currentFolderId, globalScope, filters.search, otherFiltersActive, docFolder]);

  const filtered      = applyFilters(baseDocs, filters, cases, clients);
  const displayedDocs = sortDocs(filtered, sortCol, sortDir, cases, clients);
  const sortedFolderRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...folderRows].sort((a, b) => {
      if (sortCol === 'fecha') return (tsSeconds(a.modified) - tsSeconds(b.modified)) * dir;
      const byName = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      return sortCol === 'name' ? byName * dir : byName;
    });
  }, [folderRows, sortCol, sortDir]);

  const showPaths = globalScope || location.kind === 'view';
  const docPath = showPaths ? (d: DocumentRecord) => folderPathLabel(docFolder(d), foldersById) : undefined;

  const selectedDocs = displayedDocs.filter(d => selected.has(d.id));
  const uploadedDoc  = uploadToast ? docs.find(d => d.id === uploadToast) : null;

  const organizeGroups = useMemo(
    () => (enabled && folders.length === 0 && !organizeDismissed
      ? planAutoOrganize({ docs, cases, clients }, sanitizeFolderName) : []),
    [enabled, folders.length, organizeDismissed, docs, cases, clients],
  );
  const showOrganizeBanner = !loading && organizeGroups.length > 0 && location.kind === 'folder' && !currentFolderId;

  // ── Selection ────────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAll = () => {
    if (displayedDocs.every(d => selected.has(d.id))) setSelected(new Set());
    else setSelected(new Set(displayedDocs.map(d => d.id)));
  };

  // ── Actions ──────────────────────────────────────────────────

  const openMove = (payload: DragPayload) => ws.openDialog({ type: 'move', payload });

  const handleAction = (action: DocAction, doc: DocumentRecord) => {
    switch (action) {
      case 'preview':
        setPreviewId(prev => prev === doc.id ? null : doc.id);
        break;
      case 'move':
        openMove({ docIds: [doc.id], folderIds: [] });
        break;
      case 'link-case':
        setModal({ type: 'link-case', docs: [doc] });
        break;
      case 'link-client':
        setModal({ type: 'link-client', docs: [doc] });
        break;
      case 'rename':
        // name is pre-set on the doc object by DocTable
        updateDocumentMeta(doc.id, { name: doc.name }).then(() => {
          setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, name: doc.name } : d));
        }).catch(() => {});
        break;
      case 'download':
        window.open(doc.pdfDownloadUrl ?? doc.downloadUrl, '_blank');
        break;
      case 'analyze':
        router.push(`/tools/analisis?docId=${doc.id}`);
        break;
      case 'delete':
        setModal({ type: 'delete', docs: [doc] });
        break;
    }
  };

  const openRow = (row: FolderRow) => {
    if (row.virtual && location.kind === 'view') ws.navigate({ kind: 'view', view: location.view, key: row.id });
    else ws.navigate({ kind: 'folder', folderId: row.id });
  };

  const handleFolderAction = (action: FolderAction, row: FolderRow) => {
    const folder = foldersById.get(row.id);
    if (action === 'open') return openRow(row);
    if (!folder) return;
    if (action === 'rename') ws.openDialog({ type: 'rename-folder', folder });
    if (action === 'move')   openMove({ docIds: [], folderIds: [folder.id] });
    if (action === 'delete') ws.openDialog({ type: 'delete-folder', folder });
  };

  const handleLinkCase = async (caseId: string | null) => {
    if (!modal) return;
    const docIds = modal.docs.map(d => d.id);
    await Promise.all(docIds.map(id => updateDocumentMeta(id, { caseId })));
    setDocs(prev => prev.map(d => docIds.includes(d.id) ? { ...d, caseId } : d));
    setModal(null);
    setSelected(new Set());
  };

  const handleLinkClient = async (clientId: string | null) => {
    if (!modal) return;
    const docIds = modal.docs.map(d => d.id);
    await Promise.all(docIds.map(id => updateDocumentMeta(id, { clientId })));
    setDocs(prev => prev.map(d => docIds.includes(d.id) ? { ...d, clientId } : d));
    setModal(null);
    setSelected(new Set());
  };

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!modal) return;
    setDeleting(true);
    try {
      await Promise.all(modal.docs.map(d => deleteDocumentRecord(d.id, d.storagePath)));
      const deletedIds = new Set(modal.docs.map(d => d.id));
      setDocs(prev => prev.filter(d => !deletedIds.has(d.id)));
      if (previewId && deletedIds.has(previewId)) setPreviewId(null);
      setSelected(prev => { const next = new Set(prev); deletedIds.forEach(id => next.delete(id)); return next; });
      setModal(null);
    } catch { setError('Error al eliminar.'); }
    finally { setDeleting(false); }
  };

  const handleBulkLinkCase = () => { if (selectedDocs.length) setModal({ type: 'link-case', docs: selectedDocs }); };
  const handleBulkDelete   = () => { if (selectedDocs.length) setModal({ type: 'delete',    docs: selectedDocs }); };
  const handleBulkMove     = () => { if (selectedDocs.length) openMove({ docIds: selectedDocs.map(d => d.id), folderIds: [] }); };

  const handleBulkZip = async () => {
    const JSZip = (await import('jszip')).default;
    const zip   = new JSZip();
    await Promise.all(selectedDocs.map(async d => {
      try {
        const url  = d.pdfDownloadUrl ?? d.downloadUrl;
        const res  = await fetch(url);
        const blob = await res.blob();
        zip.file(d.name, blob);
      } catch { /* skip failed */ }
    }));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `documentos_${new Date().toISOString().slice(0,10)}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleIndexAll = async () => {
    setIndexing(true); setIndexMsg('');
    try {
      const idToken = await user.getIdToken();
      const res  = await fetch('/api/documents/embed-all', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json() as { ok: boolean; embedded: number; failed: number };
      setIndexMsg(data.ok ? `✓ ${data.embedded} indexado${data.embedded !== 1 ? 's' : ''}` : 'Error al indexar.');
    } catch { setIndexMsg('Error de red.'); }
    finally  { setIndexing(false); }
  };

  // ── Header text ──────────────────────────────────────────────

  let subtitle: string;
  if (!enabled) {
    subtitle = `${displayedDocs.length}${docs.length !== displayedDocs.length ? ` de ${docs.length}` : ''} archivo${docs.length !== 1 ? 's' : ''}`;
  } else if (globalScope) {
    subtitle = `${plural(displayedDocs.length, 'archivo', 'archivos')} en todas las carpetas`;
  } else if (location.kind === 'view' && !location.key && view?.grouped) {
    subtitle = plural(sortedFolderRows.length, view.id === 'casos' ? 'caso' : 'cliente', view.id === 'casos' ? 'casos' : 'clientes');
  } else if (location.kind === 'view') {
    subtitle = plural(displayedDocs.length, 'archivo', 'archivos');
  } else {
    subtitle = `${plural(displayedDocs.length, 'archivo', 'archivos')} · ${plural(sortedFolderRows.length, 'carpeta', 'carpetas')}`;
  }

  const folderIsEmpty = enabled && location.kind === 'folder' && !globalScope && !!currentFolderId
    && baseDocs.length === 0 && childrenOf(folders, currentFolderId).length === 0;

  const emptyFolder = (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-[#3a3630] mb-3"><IconFolder className="w-10 h-10" /></span>
      <p className="text-[13px] text-[#c8c0ac] font-medium">Carpeta vacía</p>
      <p className="text-[12px] text-[#6b6050] mt-1 mb-4">Arrastra archivos aquí o súbelos desde tu equipo.</p>
      <div className="flex gap-2">
        <Button variant="BtnGold" size="sm" onClick={() => fileRef.current?.click()}>Subir</Button>
        <Button variant="BtnOutlineDark" size="sm" onClick={openNewFolder}>Nueva carpeta</Button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={e => { if (!isFileDrag(e)) return; e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Drag overlay (files from the OS only) */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-avocat-gold/10 border-4 border-dashed border-avocat-gold/40 rounded-2xl m-4" />
          <div className="relative bg-[#1e1c16] border border-avocat-gold/30 rounded-xl px-8 py-5 text-center shadow-xl">
            <p className="text-[14px] font-sans font-semibold text-avocat-gold">Suelta para subir</p>
            <p className="text-[12px] text-[#6b6050] mt-1">
              {enabled ? `A ${currentFolderId ? `«${foldersById.get(currentFolderId)?.name}»` : 'Mis documentos'} · ` : ''}PDF, DOCX, XLSX, imágenes
            </p>
          </div>
        </div>
      )}

      <AppHeader
        title="Documentos"
        titleNode={enabled ? <Breadcrumb viewGroupLabel={viewGroupLabel} /> : undefined}
        subtitle={loading ? undefined : subtitle}
        actions={
          <div className="flex items-center gap-2">
            {indexMsg && <span className="hidden sm:inline text-[11px] text-[#6b6050]">{indexMsg}</span>}
            <button onClick={handleIndexAll} disabled={indexing}
              className="hidden sm:inline text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors disabled:opacity-40">
              {indexing ? 'Indexando…' : 'Reindexar'}
            </button>
            <input ref={fileRef} type="file" multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput} className="hidden" />
            {enabled ? (
              <div className="relative" onMouseDown={e => e.stopPropagation()}>
                <Button variant="BtnGold" size="sm" loading={uploading} onClick={() => setAddMenu(o => !o)}>
                  Añadir ▾
                </Button>
                {addMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1c16] border border-[#2e2b20] rounded-xl shadow-2xl py-1 w-56">
                    <button onClick={() => { setAddMenu(false); fileRef.current?.click(); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] transition-colors">
                      Subir desde mi equipo
                    </button>
                    <button onClick={() => { setAddMenu(false); openNewFolder(); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-[#c8c0ac] hover:bg-[#252218] hover:text-[#e8d4a0] transition-colors">
                      Nueva carpeta <kbd className="text-[10px] text-[#6b6050] font-sans">⇧N</kbd>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="BtnGold" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                Subir documento
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-[12px] text-red-400">{error}</div>
      )}

      {/* Workspace notices (moves, folder ops) */}
      {ws.notice && (
        <div className={`mx-4 mt-3 rounded-lg px-4 py-2 text-[12px] border ${ws.notice.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {ws.notice.text}
        </div>
      )}

      {/* Upload toast */}
      {uploadedDoc && (
        <div className="mx-4 mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 flex items-center justify-between text-[12px]">
          <span className="text-emerald-400 truncate">Documento subido — <span className="font-medium">{uploadedDoc.name}</span></span>
          <button onClick={() => setModal({ type: 'link-case', docs: [uploadedDoc] })}
            className="text-avocat-gold hover:underline ml-4 flex-shrink-0">
            Vincular a caso →
          </button>
        </div>
      )}

      {/* One-time suggestion: Organizar automáticamente */}
      {showOrganizeBanner && (
        <div className="mx-4 mt-3 rounded-lg bg-avocat-gold/5 border border-avocat-gold/20 px-4 py-2.5 flex items-center gap-3 text-[12px]">
          <span className="text-avocat-gold flex-shrink-0"><IconFolder className="w-4 h-4" /></span>
          <span className="text-[#c8c0ac] flex-1 min-w-0">
            ¿Organizamos tus documentos en carpetas <span className="text-[#e8d4a0]">Casos</span> y <span className="text-[#e8d4a0]">Clientes</span> según sus vínculos?
          </span>
          <button onClick={() => ws.openDialog({ type: 'auto-organize' })} className="text-avocat-gold hover:underline flex-shrink-0">
            Ver propuesta
          </button>
          <button onClick={dismissOrganize} aria-label="Descartar" className="text-[#6b6050] hover:text-[#c8c0ac] flex-shrink-0">✕</button>
        </div>
      )}

      {/* Filters bar */}
      <DocFiltersBar
        filters={filters}
        onChange={setFilters}
        cases={cases}
        clients={clients}
        scope={enabled && location.kind === 'folder' ? scope : undefined}
        onScopeChange={setScope}
      />

      {/* Content — split pane */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Table area */}
        <div className={`flex-1 min-w-0 overflow-y-auto ${previewDoc ? 'hidden md:block' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
            </div>
          ) : docs.length === 0 && folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[13px] text-[#6b6050] mb-4">No hay documentos subidos aún.</p>
              <div className="flex gap-2">
                <Button variant="BtnGold" size="md" onClick={() => fileRef.current?.click()}>
                  Subir primer documento
                </Button>
                {enabled && <Button variant="BtnOutlineDark" size="md" onClick={openNewFolder}>Nueva carpeta</Button>}
              </div>
            </div>
          ) : (
            <DocTable
              docs={displayedDocs}
              folderRows={sortedFolderRows}
              cases={cases}
              clients={clients}
              selected={selected}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              previewDocId={previewDoc?.id ?? null}
              onAction={handleAction}
              canMove={enabled}
              docPath={docPath}
              onOpenFolder={openRow}
              onFolderAction={handleFolderAction}
              onRenameFolder={ws.renameFolder}
              onDropOnFolder={ws.moveItems}
              emptyState={folderIsEmpty && activeFilterCount(filters) === 0 ? emptyFolder : undefined}
            />
          )}
        </div>

        {/* Preview panel — desktop split pane */}
        {previewDoc && (
          <>
            <div className="hidden md:flex w-[360px] flex-shrink-0 border-l border-[#2e2b20] flex-col overflow-hidden">
              <DocPreviewPanel
                doc={previewDoc}
                cases={cases}
                clients={clients}
                folderLabel={enabled ? folderPathLabel(docFolder(previewDoc), foldersById) : undefined}
                onClose={() => setPreviewId(null)}
                onAction={handleAction}
              />
            </div>
            {/* Mobile: full overlay */}
            <div className="md:hidden fixed inset-0 z-40 flex items-end">
              <div className="absolute inset-0 bg-black/70" onClick={() => setPreviewId(null)} />
              <div className="relative bg-[#1e1c16] border-t border-[#2e2b20] rounded-t-2xl w-full max-h-[85vh] flex flex-col">
                <DocPreviewPanel
                  doc={previewDoc}
                  cases={cases}
                  clients={clients}
                  folderLabel={enabled ? folderPathLabel(docFolder(previewDoc), foldersById) : undefined}
                  onClose={() => setPreviewId(null)}
                  onAction={handleAction}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedDocs.length > 0 && (
        <div className="border-t border-[#2e2b20] bg-[#161410] px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-avocat-gold font-medium">{selectedDocs.length} seleccionado{selectedDocs.length !== 1 ? 's' : ''}</span>
          {enabled && <Button variant="BtnOutlineDark" size="sm" onClick={handleBulkMove}>Mover a…</Button>}
          <Button variant="BtnOutlineDark" size="sm" onClick={handleBulkLinkCase}>Vincular a caso</Button>
          <Button variant="BtnOutlineDark" size="sm" onClick={handleBulkZip}>Descargar ZIP</Button>
          <Button variant="BtnOutlineDark" size="sm" onClick={handleBulkDelete}>Eliminar</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-[#6b6050] hover:text-[#c8c0ac] transition-colors">
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'link-case' && (
        <LinkCaseModal
          cases={cases}
          currentCaseId={modal.docs[0]?.caseId}
          onLink={handleLinkCase}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'link-client' && (
        <LinkClientModal
          clients={clients}
          currentClientId={modal.docs[0]?.clientId}
          onLink={handleLinkClient}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal
          names={modal.docs.map(d => d.name)}
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
      {enabled && <FolderDialogs />}
    </div>
  );
}
