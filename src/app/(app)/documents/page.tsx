'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getUserDocuments, uploadDocument, formatBytes, type DocumentRecord } from '@/lib/storage-client';
import { getCases, type CaseDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';

// ── helpers ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', default: '📎',
};
function typeIcon(ext: string): string { return TYPE_ICON[ext.toLowerCase()] ?? TYPE_ICON.default; }

function tsSeconds(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return (ts as { seconds: number }).seconds;
  return 0;
}

function formatDate(ts: unknown): string {
  const s = tsSeconds(ts);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function triggerEmbed(docId: string, idToken: string) {
  try {
    await fetch('/api/documents/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ docId }),
    });
  } catch { /* fire-and-forget */ }
}

// ── DocTile ──────────────────────────────────────────────────────────────────

function DocTile({ d, cases, showCase, onClick }: {
  d: DocumentRecord; cases: CaseDoc[]; showCase: boolean; onClick: () => void;
}) {
  const caseDoc = d.caseId ? cases.find(c => c.id === d.caseId) : null;
  return (
    <button
      onClick={onClick}
      className="text-left bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-4 hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors group w-full"
    >
      <div className="text-3xl mb-3">{typeIcon(d.type)}</div>
      <p className="text-[13px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] truncate mb-1">
        {d.name}
      </p>
      <p className="text-[11px] text-[#6b6050]">
        {d.type.toUpperCase()} · {formatBytes(d.size)}
      </p>
      <p className="text-[11px] text-[#3a3630] mt-0.5">{formatDate(d.createdAt)}</p>
      {showCase && d.caseId && (
        <p className="text-[10px] text-avocat-gold/60 mt-1 truncate">
          {[caseDoc?.ref, caseDoc?.title].filter(Boolean).join(' · ') || d.caseId}
        </p>
      )}
      {!showCase && caseDoc?.ref && (
        <p className="text-[10px] text-[#6b6050] mt-1">{caseDoc.ref}</p>
      )}
    </button>
  );
}

// ── PreviewModal ─────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const PDF_TYPE    = 'pdf';

function PreviewModal({ d, cases, onClose }: { d: DocumentRecord; cases: CaseDoc[]; onClose: () => void }) {
  const caseDoc = d.caseId ? cases.find(c => c.id === d.caseId) : null;
  const ext = d.type.toLowerCase();
  const isPdf   = ext === PDF_TYPE;
  const isImage = IMAGE_TYPES.has(ext);
  const canPreview = isPdf || isImage;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#2e2b20] flex-shrink-0">
          <span className="text-3xl mt-0.5">{typeIcon(d.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-sans font-semibold text-[#e8d4a0] truncate">{d.name}</p>
            <p className="text-[11px] text-[#6b6050] mt-0.5">
              {d.type.toUpperCase()} · {formatBytes(d.size)} · {formatDate(d.createdAt)}
              {d.source === 'generated' ? ' · Generado por IA' : ' · Subido'}
            </p>
            {caseDoc && (
              <p className="text-[10px] text-avocat-gold/60 mt-0.5">
                {[caseDoc.ref, caseDoc.title].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#6b6050] hover:text-[#c8c0ac] transition-colors p-1 flex-shrink-0"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto min-h-0">
          {isPdf && (
            <iframe
              src={d.downloadUrl}
              title={d.name}
              className="w-full h-full min-h-[400px] sm:min-h-[500px] border-0"
            />
          )}
          {isImage && (
            <div className="flex items-center justify-center p-4 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.downloadUrl} alt={d.name} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
          )}
          {!canPreview && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="text-5xl">{typeIcon(d.type)}</span>
              <p className="text-[13px] text-[#6b6050]">
                Vista previa no disponible para archivos {d.type.toUpperCase()}.
              </p>
              <p className="text-[11px] text-[#3a3630]">Descarga el archivo para abrirlo con su aplicación.</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#2e2b20] flex-shrink-0">
          {isPdf && !d.pdfDownloadUrl && (
            <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="BtnGhost" size="sm">Abrir en nueva pestaña</Button>
            </a>
          )}
          {d.pdfDownloadUrl ? (
            <>
              <a href={d.pdfDownloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Button variant="BtnOutlineDark" size="sm">Descargar PDF</Button>
              </a>
              <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Button variant="BtnGold" size="sm">Descargar Word</Button>
              </a>
            </>
          ) : (
            <a href={d.downloadUrl} download={d.name} target="_blank" rel="noopener noreferrer">
              <Button variant="BtnGold" size="sm">Descargar</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type ViewMode  = 'flat' | 'folders';
type SortOrder = 'newest' | 'oldest';

export default function DocumentsPage() {
  const { user, userDoc } = useAppAuth();
  const [docs, setDocs]       = useState<DocumentRecord[]>([]);
  const [cases, setCases]     = useState<CaseDoc[]>([]);
  const [caseFilter, setCaseFilter] = useState<string>('');
  const [viewMode, setViewMode]     = useState<ViewMode>('flat');
  const [sortOrder, setSortOrder]   = useState<SortOrder>('newest');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing]   = useState(false);
  const [indexMsg, setIndexMsg]   = useState('');
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userDoc.uid) return;
    Promise.all([getUserDocuments(userDoc.uid), getCases(userDoc.uid)])
      .then(([d, c]) => { setDocs(d); setCases(c); })
      .catch(err => setError(`Error al cargar documentos: ${err?.message ?? err}`))
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const record = await uploadDocument(userDoc.uid, file);
      setDocs(prev => [record, ...prev]);
      const idToken = await user.getIdToken();
      triggerEmbed(record.id, idToken);
    } catch {
      setError('Error al subir el documento. Verifica los permisos de Firebase Storage.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleIndexAll = async () => {
    setIndexing(true); setIndexMsg('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/documents/embed-all', {
        method: 'POST', headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json() as { ok: boolean; embedded: number; failed: number };
      setIndexMsg(data.ok
        ? `✓ ${data.embedded} indexado${data.embedded !== 1 ? 's' : ''}${data.failed ? ` (${data.failed} con error)` : ''}`
        : 'Error al indexar documentos.');
    } catch { setIndexMsg('Error de red al indexar.'); }
    finally  { setIndexing(false); }
  };

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Filter
  const filtered = caseFilter === '__none__'
    ? docs.filter(d => !d.caseId)
    : caseFilter ? docs.filter(d => d.caseId === caseFilter) : docs;

  // Sort
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'newest'
      ? tsSeconds(b.createdAt) - tsSeconds(a.createdAt)
      : tsSeconds(a.createdAt) - tsSeconds(b.createdAt)
  );

  // Folder groups
  const folderGroups: { key: string; caseDoc: CaseDoc | null; docs: DocumentRecord[] }[] = [];
  if (viewMode === 'folders') {
    const map = new Map<string, DocumentRecord[]>();
    for (const d of sorted) {
      const key = d.caseId ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    for (const [key, groupDocs] of map.entries()) {
      const caseDoc = key !== '__none__' ? (cases.find(c => c.id === key) ?? null) : null;
      folderGroups.push({ key, caseDoc, docs: groupDocs });
    }
    folderGroups.sort((a, b) => {
      if (a.key === '__none__') return 1;
      if (b.key === '__none__') return -1;
      return (a.caseDoc?.title ?? '').localeCompare(b.caseDoc?.title ?? '');
    });
  }

  const inFolderMode = viewMode === 'folders';

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Documentos"
        subtitle={`${sorted.length} archivo${sorted.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload} className="hidden" id="doc-upload" />
            <Button variant="BtnGold" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              Subir documento
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Case filter — only in flat mode */}
          {!inFolderMode && cases.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#6b6050] shrink-0">Filtrar por caso:</label>
              <select value={caseFilter} onChange={e => setCaseFilter(e.target.value)}
                className="text-[12px] bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-3 py-1.5 text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 min-w-0 max-w-xs">
                <option value="">Todos los documentos</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                <option value="__none__">Sin caso asociado</option>
              </select>
            </div>
          )}

          {/* View toggle */}
          {docs.length > 0 && (
            <div className="flex items-center gap-1 bg-[#1e1c16] border border-[#2e2b20] rounded-lg p-0.5">
              <button onClick={() => setViewMode('flat')}
                className={`px-3 py-1 rounded-md text-[11px] transition-colors ${viewMode === 'flat' ? 'bg-avocat-gold/20 text-avocat-gold' : 'text-[#6b6050] hover:text-[#c8c0ac]'}`}>
                ⊞ Lista
              </button>
              <button onClick={() => { setViewMode('folders'); setCaseFilter(''); }}
                className={`px-3 py-1 rounded-md text-[11px] transition-colors ${viewMode === 'folders' ? 'bg-avocat-gold/20 text-avocat-gold' : 'text-[#6b6050] hover:text-[#c8c0ac]'}`}>
                📁 Carpetas
              </button>
            </div>
          )}

          {/* Sort by date */}
          {docs.length > 0 && (
            <button
              onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-1.5 text-[11px] text-[#6b6050] hover:text-[#c8c0ac] border border-[#2e2b20] hover:border-[#3a3630] rounded-lg px-3 py-1.5 transition-colors"
              title="Cambiar orden de fecha"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              {sortOrder === 'newest' ? 'Más recientes' : 'Más antiguos'}
            </button>
          )}

          {/* Reindex */}
          {docs.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {indexMsg && <span className="text-[11px] text-[#6b6050]">{indexMsg}</span>}
              <button onClick={handleIndexAll} disabled={indexing}
                className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors disabled:opacity-40">
                {indexing ? '⏳ Indexando…' : '⚡ Reindexar'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#6b6050] mb-4">
              {caseFilter ? 'No hay documentos para este filtro.' : 'No hay documentos subidos aún.'}
            </p>
            {!caseFilter && (
              <Button variant="BtnGold" size="md" onClick={() => fileRef.current?.click()}>
                Subir primer documento
              </Button>
            )}
          </div>
        ) : inFolderMode ? (
          <div className="space-y-3">
            {folderGroups.map(({ key, caseDoc, docs: groupDocs }) => {
              const isExpanded = expandedFolders.has(key);
              const folderTitle = caseDoc ? caseDoc.title : 'Sin caso asociado';
              const folderRef   = caseDoc?.ref ?? '';
              return (
                <div key={key} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
                  <button onClick={() => toggleFolder(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252218] transition-colors text-left">
                    <span className="text-xl shrink-0">{isExpanded ? '📂' : '📁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#e8d4a0] truncate">{folderTitle}</p>
                      {folderRef && <p className="text-[10px] text-avocat-gold/60">{folderRef}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[#6b6050]">
                        {groupDocs.length} archivo{groupDocs.length !== 1 ? 's' : ''}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`w-4 h-4 text-[#6b6050] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#2e2b20] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                      {groupDocs.map(d => (
                        <DocTile key={d.id} d={d} cases={cases} showCase={false} onClick={() => setPreview(d)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sorted.map(d => (
              <DocTile key={d.id} d={d} cases={cases} showCase={true} onClick={() => setPreview(d)} />
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <PreviewModal d={preview} cases={cases} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
