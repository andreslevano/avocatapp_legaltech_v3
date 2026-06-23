'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getUserDocuments, uploadDocument, formatBytes, type DocumentRecord } from '@/lib/storage-client';
import { getCases, type CaseDoc } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';

const TYPE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', default: '📎',
};

function typeIcon(ext: string): string {
  return TYPE_ICON[ext.toLowerCase()] ?? TYPE_ICON.default;
}

async function triggerEmbed(docId: string, idToken: string, text?: string) {
  try {
    await fetch('/api/documents/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ docId, ...(text ? { text } : {}) }),
    });
  } catch {
    // fire-and-forget
  }
}

function DocTile({ d, cases, showCase }: { d: DocumentRecord; cases: CaseDoc[]; showCase: boolean }) {
  const caseDoc = d.caseId ? cases.find(c => c.id === d.caseId) : null;
  return (
    <a
      href={d.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-4 hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors group"
    >
      <div className="text-3xl mb-3">{typeIcon(d.type)}</div>
      <p className="text-[13px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] truncate mb-1">
        {d.name}
      </p>
      <p className="text-[11px] text-[#6b6050]">
        {d.type.toUpperCase()} · {formatBytes(d.size)}
      </p>
      {showCase && d.caseId && (
        <p className="text-[10px] text-avocat-gold/60 mt-1 truncate">
          {[caseDoc?.ref, caseDoc?.title].filter(Boolean).join(' · ') || d.caseId}
        </p>
      )}
      {!showCase && caseDoc?.ref && (
        <p className="text-[10px] text-[#6b6050] mt-1">{caseDoc.ref}</p>
      )}
    </a>
  );
}

type ViewMode = 'flat' | 'folders';

export default function DocumentsPage() {
  const { user, userDoc } = useAppAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [caseFilter, setCaseFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userDoc.uid) return;
    Promise.all([
      getUserDocuments(userDoc.uid),
      getCases(userDoc.uid),
    ])
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
    setIndexing(true);
    setIndexMsg('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/documents/embed-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json() as { ok: boolean; embedded: number; failed: number; total: number };
      if (data.ok) {
        setIndexMsg(`✓ ${data.embedded} indexado${data.embedded !== 1 ? 's' : ''}${data.failed ? ` (${data.failed} con error)` : ''}`);
      } else {
        setIndexMsg('Error al indexar documentos.');
      }
    } catch {
      setIndexMsg('Error de red al indexar.');
    } finally {
      setIndexing(false);
    }
  };

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = caseFilter === '__none__'
    ? docs.filter(d => !d.caseId)
    : caseFilter
      ? docs.filter(d => d.caseId === caseFilter)
      : docs;

  // Build folder groups for folder view
  const folderGroups: { key: string; caseDoc: CaseDoc | null; docs: DocumentRecord[] }[] = [];
  if (viewMode === 'folders') {
    const map = new Map<string, DocumentRecord[]>();
    for (const d of filtered) {
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
        subtitle={`${filtered.length} archivo${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
              className="hidden"
              id="doc-upload"
            />
            <Button
              variant="BtnGold"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
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

        {/* Toolbar: filters + view toggle + index */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Case filter — only in flat mode */}
          {!inFolderMode && cases.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#6b6050] shrink-0">Filtrar por caso:</label>
              <select
                value={caseFilter}
                onChange={e => setCaseFilter(e.target.value)}
                className="text-[12px] bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-3 py-1.5 text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 min-w-0 max-w-xs"
              >
                <option value="">Todos los documentos</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
                <option value="__none__">Sin caso asociado</option>
              </select>
            </div>
          )}

          {/* View mode toggle */}
          {docs.length > 0 && (
            <div className="flex items-center gap-1 bg-[#1e1c16] border border-[#2e2b20] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                  viewMode === 'flat'
                    ? 'bg-avocat-gold/20 text-avocat-gold'
                    : 'text-[#6b6050] hover:text-[#c8c0ac]'
                }`}
                title="Vista en cuadrícula"
              >
                ⊞ Lista
              </button>
              <button
                onClick={() => { setViewMode('folders'); setCaseFilter(''); }}
                className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                  viewMode === 'folders'
                    ? 'bg-avocat-gold/20 text-avocat-gold'
                    : 'text-[#6b6050] hover:text-[#c8c0ac]'
                }`}
                title="Vista por carpetas de caso"
              >
                📁 Carpetas
              </button>
            </div>
          )}

          {docs.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {indexMsg && (
                <span className="text-[11px] text-[#6b6050]">{indexMsg}</span>
              )}
              <button
                onClick={handleIndexAll}
                disabled={indexing}
                className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors disabled:opacity-40"
                title="Indexar todos los documentos para búsqueda semántica"
              >
                {indexing ? '⏳ Indexando…' : '⚡ Reindexar'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
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
          /* Folder view */
          <div className="space-y-3">
            {folderGroups.map(({ key, caseDoc, docs: groupDocs }) => {
              const isExpanded = expandedFolders.has(key);
              const folderTitle = caseDoc ? caseDoc.title : 'Sin caso asociado';
              const folderRef = caseDoc?.ref ?? '';
              return (
                <div key={key} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFolder(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252218] transition-colors text-left"
                  >
                    <span className="text-xl shrink-0">{isExpanded ? '📂' : '📁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#e8d4a0] truncate">{folderTitle}</p>
                      {folderRef && (
                        <p className="text-[10px] text-avocat-gold/60">{folderRef}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[#6b6050]">
                        {groupDocs.length} archivo{groupDocs.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`w-4 h-4 text-[#6b6050] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#2e2b20] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                      {groupDocs.map(d => (
                        <DocTile key={d.id} d={d} cases={cases} showCase={false} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(d => (
              <DocTile key={d.id} d={d} cases={cases} showCase={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
