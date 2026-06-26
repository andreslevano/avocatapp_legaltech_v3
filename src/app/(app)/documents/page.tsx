'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/contexts/AppAuthContext';
import {
  getUserDocuments, uploadDocument, updateDocumentMeta, deleteDocumentRecord,
  type DocumentRecord,
} from '@/lib/storage-client';
import { getCases, getClients, type CaseDoc, type ClientDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import DocFiltersBar from '@/components/documents/DocFiltersBar';
import DocTable, { type DocAction } from '@/components/documents/DocTable';
import DocPreviewPanel from '@/components/documents/DocPreviewPanel';
import { LinkCaseModal, LinkClientModal, DeleteConfirmModal } from '@/components/documents/modals';
import {
  EMPTY_FILTERS, applyFilters, sortDocs, tsSeconds,
  type DocFilters, type SortCol, type SortDir,
} from '@/components/documents/helpers';

async function triggerEmbed(docId: string, idToken: string) {
  fetch('/api/documents/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ docId }),
  }).catch(() => {});
}

export default function DocumentsPage() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();

  const [docs,    setDocs]    = useState<DocumentRecord[]>([]);
  const [cases,   setCases]   = useState<CaseDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // View & sort
  const [sortCol, setSortCol] = useState<SortCol>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters
  const [filters, setFilters] = useState<DocFilters>(EMPTY_FILTERS);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Preview
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Upload
  const fileRef   = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadToast, setUploadToast] = useState('');
  const [dragOver,   setDragOver]   = useState(false);

  // Modals
  const [modal, setModal] = useState<{
    type: 'link-case' | 'link-client' | 'delete';
    docs: DocumentRecord[];
  } | null>(null);

  // Indexing
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState('');

  // ── Load data ──────────────────────────────────────────────────

  useEffect(() => {
    if (!userDoc.uid) return;
    Promise.all([getUserDocuments(userDoc.uid), getCases(userDoc.uid), getClients(userDoc.uid)])
      .then(([d, c, cl]) => { setDocs(d); setCases(c); setClients(cl); })
      .catch(err => setError(`Error al cargar: ${err?.message ?? err}`))
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  // ── Upload ────────────────────────────────────────────────────

  const doUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const activeCaseId = filters.caseId && filters.caseId !== '__none__' ? filters.caseId : undefined;
      const record = await uploadDocument(userDoc.uid, file, activeCaseId ?? null);
      setDocs(prev => [record, ...prev]);
      const idToken = await user.getIdToken();
      triggerEmbed(record.id, idToken);
      setUploadToast(record.id);
      setTimeout(() => setUploadToast(''), 6000);
    } catch { setError('Error al subir el documento.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }, [user, userDoc.uid, filters.caseId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  // ── Sort ──────────────────────────────────────────────────────

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

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

  const handleAction = (action: DocAction, doc: DocumentRecord) => {
    switch (action) {
      case 'preview':
        setPreviewDoc(prev => prev?.id === doc.id ? null : doc);
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
          if (previewDoc?.id === doc.id) setPreviewDoc(d => d ? { ...d, name: doc.name } : d);
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

  const handleLinkCase = async (caseId: string | null) => {
    if (!modal) return;
    const docIds = modal.docs.map(d => d.id);
    await Promise.all(docIds.map(id => updateDocumentMeta(id, { caseId })));
    setDocs(prev => prev.map(d => docIds.includes(d.id) ? { ...d, caseId } : d));
    if (previewDoc && docIds.includes(previewDoc.id)) setPreviewDoc(p => p ? { ...p, caseId } : p);
    setModal(null);
    setSelected(new Set());
  };

  const handleLinkClient = async (clientId: string | null) => {
    if (!modal) return;
    const docIds = modal.docs.map(d => d.id);
    await Promise.all(docIds.map(id => updateDocumentMeta(id, { clientId })));
    setDocs(prev => prev.map(d => docIds.includes(d.id) ? { ...d, clientId } : d));
    if (previewDoc && docIds.includes(previewDoc.id)) setPreviewDoc(p => p ? { ...p, clientId } : p);
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
      if (previewDoc && deletedIds.has(previewDoc.id)) setPreviewDoc(null);
      setSelected(prev => { const next = new Set(prev); deletedIds.forEach(id => next.delete(id)); return next; });
      setModal(null);
    } catch { setError('Error al eliminar.'); }
    finally { setDeleting(false); }
  };

  const handleBulkLinkCase  = () => { if (selected.size) setModal({ type: 'link-case',   docs: docs.filter(d => selected.has(d.id)) }); };
  const handleBulkDelete    = () => { if (selected.size) setModal({ type: 'delete',       docs: docs.filter(d => selected.has(d.id)) }); };

  const handleBulkZip = async () => {
    const selectedDocs = docs.filter(d => selected.has(d.id));
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

  // ── Derived ──────────────────────────────────────────────────

  const filtered     = applyFilters(docs, filters, cases, clients);
  const displayedDocs = sortDocs(filtered, sortCol, sortDir, cases, clients);
  const uploadedDoc   = uploadToast ? docs.find(d => d.id === uploadToast) : null;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-avocat-gold/10 border-4 border-dashed border-avocat-gold/40 rounded-2xl m-4" />
          <div className="relative bg-[#1e1c16] border border-avocat-gold/30 rounded-xl px-8 py-5 text-center shadow-xl">
            <p className="text-[14px] font-sans font-semibold text-avocat-gold">Suelta para subir</p>
            <p className="text-[12px] text-[#6b6050] mt-1">PDF, DOCX, XLSX, imágenes</p>
          </div>
        </div>
      )}

      <AppHeader
        title="Documentos"
        subtitle={`${displayedDocs.length}${docs.length !== displayedDocs.length ? ` de ${docs.length}` : ''} archivo${docs.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {indexMsg && <span className="text-[11px] text-[#6b6050]">{indexMsg}</span>}
            <button onClick={handleIndexAll} disabled={indexing}
              className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors disabled:opacity-40">
              {indexing ? 'Indexando…' : 'Reindexar'}
            </button>
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput} className="hidden" />
            <Button variant="BtnGold" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              Subir documento
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-[12px] text-red-400">{error}</div>
      )}

      {/* Upload toast */}
      {uploadedDoc && (
        <div className="mx-4 mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 flex items-center justify-between text-[12px]">
          <span className="text-emerald-400">Documento subido — <span className="font-medium">{uploadedDoc.name}</span></span>
          <button onClick={() => setModal({ type: 'link-case', docs: [uploadedDoc] })}
            className="text-avocat-gold hover:underline ml-4 flex-shrink-0">
            Vincular a caso →
          </button>
        </div>
      )}

      {/* Filters bar */}
      <DocFiltersBar filters={filters} onChange={setFilters} cases={cases} clients={clients} />

      {/* Content — split pane */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Table area */}
        <div className={`flex-1 min-w-0 overflow-y-auto ${previewDoc ? 'hidden md:block' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[13px] text-[#6b6050] mb-4">No hay documentos subidos aún.</p>
              <Button variant="BtnGold" size="md" onClick={() => fileRef.current?.click()}>
                Subir primer documento
              </Button>
            </div>
          ) : (
            <DocTable
              docs={displayedDocs}
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
                onClose={() => setPreviewDoc(null)}
                onAction={handleAction}
              />
            </div>
            {/* Mobile: full overlay */}
            <div className="md:hidden fixed inset-0 z-40 flex items-end">
              <div className="absolute inset-0 bg-black/70" onClick={() => setPreviewDoc(null)} />
              <div className="relative bg-[#1e1c16] border-t border-[#2e2b20] rounded-t-2xl w-full max-h-[85vh] flex flex-col">
                <DocPreviewPanel
                  doc={previewDoc}
                  cases={cases}
                  clients={clients}
                  onClose={() => setPreviewDoc(null)}
                  onAction={handleAction}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="border-t border-[#2e2b20] bg-[#161410] px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-avocat-gold font-medium">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
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
    </div>
  );
}
