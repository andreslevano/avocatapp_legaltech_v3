'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import {
  getCase, getConversations, updateCase, addCaseComment, getClients,
  type CaseDoc, type ConversationDoc, type ClientDoc,
} from '@/lib/firestore';
import { saveDocumentToStorage } from '@/lib/storage-client';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import type { Timestamp } from 'firebase/firestore';
import type { OcrPdfProgress } from '@/lib/ocr-pdf-client';

// ── Constants ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Activo' },
  { value: 'urgent',   label: 'Urgente' },
  { value: 'closed',   label: 'Cerrado' },
  { value: 'archived', label: 'Archivado' },
] as const;

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  urgent:   'bg-red-500/10 text-red-400 border-red-500/20',
  closed:   'bg-[#252218] text-[#6b6050] border-[#2e2b20]',
  archived: 'bg-[#1a1812] text-[#3a3630] border-[#2e2b20]',
};

const TYPE_LABELS: Record<string, string> = {
  civil: 'Civil', laboral: 'Laboral', contractual: 'Contractual',
  familia: 'Familia', penal: 'Penal', sucesoral: 'Sucesoral', otro: 'Otro',
};

const STRATEGY_LABEL: Record<string, string> = {
  'text-pdf': 'PDF con texto', ocr: 'PDF escaneado (OCR)',
  txt: 'Texto plano', docx: 'Word', unsupported: 'Formato no soportado',
};

const FILE_ICON: Record<string, string> = {
  pdf: '📄', txt: '📝', md: '📝', docx: '📝', doc: '📝',
};

const MIN_USEFUL_CHARS = 150;

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateTime(ts: Timestamp): string {
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(ext: string): string {
  return FILE_ICON[ext.toLowerCase()] ?? '📎';
}

function usefulChars(text: string): number {
  return (text.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g) ?? []).length;
}

async function extractPdfTextLayer(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.mjs`;
  }
  const ab  = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab, verbosity: 0 }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += (content.items as { str: string }[]).map(it => it.str).join(' ') + '\n';
  }
  return text;
}

// ── Component ──────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { user, userDoc } = useAppAuth();
  const params  = useParams<{ id: string }>() ?? { id: '' };
  const router  = useRouter();

  const [caseDoc,       setCaseDoc]       = useState<CaseDoc | null>(null);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [clients,       setClients]       = useState<ClientDoc[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [notFound,      setNotFound]      = useState(false);

  // Comments
  const [commentText,   setCommentText]   = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Document upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Client picker
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch,     setClientSearch]     = useState('');
  const [savingClient,     setSavingClient]     = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      getCase(params.id),
      getConversations(userDoc.uid, params.id),
      getClients(userDoc.uid),
    ])
      .then(([c, convs, cls]) => {
        if (!c || c.userId !== userDoc.uid) { setNotFound(true); return; }
        setCaseDoc(c);
        setConversations(convs);
        setClients(cls);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id, userDoc.uid]);

  const handleStatusChange = async (status: string) => {
    if (!caseDoc) return;
    setSaving(true);
    try {
      await updateCase(caseDoc.id, { status: status as CaseDoc['status'] });
      setCaseDoc(prev => prev ? { ...prev, status: status as CaseDoc['status'] } : prev);
    } catch {}
    setSaving(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !caseDoc) return;
    setAddingComment(true);
    try {
      await addCaseComment(caseDoc.id, commentText.trim());
      const updated = await getCase(caseDoc.id);
      if (updated) setCaseDoc(updated);
      setCommentText('');
    } catch {}
    setAddingComment(false);
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !files.length || !caseDoc) return;
    setUploading(true);
    setUploadMsg('');
    const arr = Array.from(files);
    try {
      for (const file of arr) {
        const nameLc = file.name.toLowerCase();
        let text = '';
        let strategy = 'unsupported';

        if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) {
          text = await file.text(); strategy = 'txt';
        } else if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
          try {
            const t = await extractPdfTextLayer(file);
            if (usefulChars(t) >= MIN_USEFUL_CHARS) { text = t; strategy = 'text-pdf'; }
            else {
              const { extractTextFromPdfWithOcr } = await import('@/lib/ocr-pdf-client');
              text = await extractTextFromPdfWithOcr(file, (_p: OcrPdfProgress) => {});
              strategy = 'ocr';
            }
          } catch { strategy = 'text-pdf'; }
        } else if (nameLc.endsWith('.docx')) {
          strategy = 'docx';
        }

        const record = await saveDocumentToStorage({
          userId: userDoc.uid,
          plan:   userDoc.plan ?? 'Abogados',
          blob:   file,
          name:   file.name,
          caseId: caseDoc.id,
          source: 'uploaded',
        });

        // Embed for RAG
        if (text) {
          const idToken = await user.getIdToken();
          fetch('/api/documents/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ docId: record.id, text }),
          }).catch(() => {});
        }

        // Update documentRefs on case
        const existing = caseDoc.documentRefs ?? [];
        const newRef = { name: file.name, type: file.name.split('.').pop()?.toLowerCase() ?? '', size: file.size, strategy };
        await updateCase(caseDoc.id, { documentRefs: [...existing, newRef] });
        setCaseDoc(prev => prev ? { ...prev, documentRefs: [...(prev.documentRefs ?? []), newRef] } : prev);
      }
      setUploadMsg(`${arr.length} archivo${arr.length !== 1 ? 's' : ''} subido${arr.length !== 1 ? 's' : ''}`);
      setTimeout(() => setUploadMsg(''), 4000);
    } catch (err) {
      setUploadMsg('Error al subir el archivo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [caseDoc, user, userDoc]);

  const handleLinkClient = async (client: ClientDoc) => {
    if (!caseDoc) return;
    setSavingClient(true);
    await updateCase(caseDoc.id, { client: client.name, clientId: client.id });
    setCaseDoc(prev => prev ? { ...prev, client: client.name, clientId: client.id } : prev);
    setSavingClient(false);
    setShowClientPicker(false);
  };

  const handleUnlinkClient = async () => {
    if (!caseDoc) return;
    setSavingClient(true);
    await updateCase(caseDoc.id, { clientId: undefined, client: '' });
    setCaseDoc(prev => prev ? { ...prev, clientId: undefined, client: '' } : prev);
    setSavingClient(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Caso" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !caseDoc) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Caso no encontrado" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-[13px] text-[#6b6050]">Este caso no existe o no tienes acceso.</p>
          <Link href="/cases" className="text-avocat-gold text-[13px] hover:underline">← Volver a casos</Link>
        </div>
      </div>
    );
  }

  const { assessment, documentRefs, comments } = caseDoc;
  const linkedClient = caseDoc.clientId ? clients.find(c => c.id === caseDoc.clientId) : null;
  const filteredClients = clients.filter(c =>
    !clientSearch.trim() ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title={caseDoc.title}
        subtitle={`${caseDoc.ref}${caseDoc.client ? ` · ${caseDoc.client}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/agent?caseId=${caseDoc.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-avocat-gold/10 border border-avocat-gold/20 text-avocat-gold text-[12px] font-sans font-medium hover:bg-avocat-gold/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Consultar con IA
            </Link>
            <button onClick={() => router.push('/cases')} className="px-3 py-1.5 rounded-lg text-[12px] font-sans text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218] transition-colors">
              ← Casos
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Case info ─────────────────────────────────── */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex flex-wrap items-start gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-[20px] text-[#e8d4a0] leading-snug">{caseDoc.title}</h2>
                <p className="text-[12px] text-[#6b6050] mt-1">{caseDoc.ref}</p>
              </div>
              <select
                value={caseDoc.status}
                onChange={e => handleStatusChange(e.target.value)}
                disabled={saving}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-sans font-medium border cursor-pointer focus:outline-none ${STATUS_STYLE[caseDoc.status]} bg-transparent`}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#1e1c16] text-[#c8c0ac]">{o.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Tipo</p>
                <p className="text-[13px] text-[#c8c0ac]">{TYPE_LABELS[caseDoc.type] ?? caseDoc.type}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Cliente</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {linkedClient ? (
                    <Link href={`/clients`} className="text-[13px] text-avocat-gold hover:underline">{linkedClient.name}</Link>
                  ) : caseDoc.client ? (
                    <span className="text-[13px] text-[#c8c0ac]">{caseDoc.client}</span>
                  ) : (
                    <span className="text-[13px] text-[#3a3630]">—</span>
                  )}
                  <button
                    onClick={() => setShowClientPicker(v => !v)}
                    className="text-[10px] text-[#6b6050] hover:text-avocat-gold transition-colors"
                  >
                    {linkedClient ? '↔ cambiar' : '+ vincular'}
                  </button>
                  {linkedClient && (
                    <button onClick={handleUnlinkClient} className="text-[10px] text-[#3a3630] hover:text-red-400 transition-colors">desvincular</button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Vencimiento</p>
                <p className="text-[13px] text-[#c8c0ac]">{formatDate(caseDoc.deadline)}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Actualizado</p>
                <p className="text-[13px] text-[#c8c0ac]">{formatDate(caseDoc.updatedAt)}</p>
              </div>
            </div>

            {/* Client picker */}
            {showClientPicker && (
              <div className="mt-4 pt-4 border-t border-[#2e2b20]">
                <p className="text-[11px] text-[#6b6050] mb-2">Selecciona un cliente existente:</p>
                <input
                  className={`${INPUT} mb-2`}
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredClients.length === 0 && (
                    <p className="text-[12px] text-[#3a3630] px-2">
                      Sin coincidencias —{' '}
                      <Link href="/clients" className="text-avocat-gold hover:underline">crear nuevo cliente</Link>
                    </p>
                  )}
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleLinkClient(c)}
                      disabled={savingClient}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 text-[12px] text-[#c8c0ac] transition-colors disabled:opacity-40"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.company && <span className="text-[#6b6050] ml-2">{c.company}</span>}
                      <span className="text-[#3a3630] ml-2">{c.email}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <Link href="/clients" className="text-[11px] text-avocat-gold hover:underline">+ Crear nuevo cliente</Link>
                  <button onClick={() => setShowClientPicker(false)} className="text-[11px] text-[#6b6050] hover:text-[#c8c0ac]">Cerrar</button>
                </div>
              </div>
            )}

            {caseDoc.notes && (
              <div className="mt-5 pt-5 border-t border-[#2e2b20]">
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">Notas</p>
                <p className="text-[13px] text-[#c8c0ac] whitespace-pre-wrap leading-relaxed">{caseDoc.notes}</p>
              </div>
            )}
          </div>

          {/* ── Documents ─────────────────────────────────── */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2b20] flex items-center justify-between">
              <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">Documentos adjuntos</h3>
              <div className="flex items-center gap-2">
                {uploadMsg && <span className={`text-[11px] ${uploadMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{uploadMsg}</span>}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <Button
                  variant="BtnGold"
                  size="sm"
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Subiendo...' : '+ Adjuntar'}
                </Button>
              </div>
            </div>
            {(!documentRefs || documentRefs.length === 0) ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[12px] text-[#3a3630]">Sin documentos adjuntos.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2e2b20]">
                {documentRefs.map((d, i) => {
                  const ext = d.name.split('.').pop() ?? '';
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-xl flex-shrink-0">{fileIcon(ext)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-sans font-medium text-[#c8c0ac] truncate">{d.name}</p>
                        <p className="text-[10px] text-[#6b6050] mt-0.5">
                          {ext.toUpperCase()} · {formatBytes(d.size)} · {STRATEGY_LABEL[d.strategy] ?? d.strategy}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-sans border ${
                        d.strategy === 'ocr'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {d.strategy === 'ocr' ? 'OCR' : 'Texto'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Comments ──────────────────────────────────── */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2b20]">
              <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">Comentarios</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <textarea
                rows={3}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Añade una nota o comentario al caso..."
                className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed"
              />
              <div className="flex justify-end">
                <Button
                  variant="BtnGold"
                  size="sm"
                  loading={addingComment}
                  disabled={!commentText.trim()}
                  onClick={handleAddComment}
                >
                  Añadir comentario
                </Button>
              </div>
            </div>
            {comments && comments.length > 0 && (
              <div className="divide-y divide-[#2e2b20] border-t border-[#2e2b20]">
                {[...comments].reverse().map((c, i) => (
                  <div key={i} className="px-5 py-3">
                    <p className="text-[12px] text-[#c8c0ac] whitespace-pre-wrap leading-relaxed">{c.text}</p>
                    <p className="text-[10px] text-[#3a3630] mt-1.5">
                      {c.createdAt ? formatDateTime(c.createdAt) : 'Ahora'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── AI Assessment ──────────────────────────────── */}
          {assessment && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Assessment de documentos</h3>
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">Resumen ejecutivo</p>
                <p className="text-[13px] text-[#c8c0ac] leading-relaxed">{assessment.resumen}</p>
                {assessment.partes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {assessment.partes.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-[#252218] border border-[#2e2b20] text-[11px] text-[#6b6050]">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assessment.riesgos.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-5">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-red-400 mb-3">⚠ Riesgos y puntos de atención</p>
                    <ul className="space-y-2">{assessment.riesgos.map((r, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-red-400 mt-0.5 flex-shrink-0 text-[12px]">•</span><span className="text-[12px] text-red-300 leading-snug">{r}</span></li>
                    ))}</ul>
                  </div>
                )}
                {assessment.puntosClave.length > 0 && (
                  <div className="bg-avocat-gold/5 border border-avocat-gold/15 rounded-xl p-5">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-avocat-gold mb-3">✦ Puntos jurídicos clave</p>
                    <ul className="space-y-2">{assessment.puntosClave.map((p, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-avocat-gold mt-0.5 flex-shrink-0 text-[12px]">•</span><span className="text-[12px] text-[#c8c0ac] leading-snug">{p}</span></li>
                    ))}</ul>
                  </div>
                )}
              </div>
              {assessment.fechasClave.length > 0 && (
                <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">📅 Fechas y plazos relevantes</p>
                  <ul className="space-y-1.5">{assessment.fechasClave.map((f, i) => (
                    <li key={i} className="text-[12px] text-[#c8c0ac]">• {f}</li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}

          {/* ── Conversations ──────────────────────────────── */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e2b20] flex items-center justify-between">
              <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">Conversaciones con IA</h3>
              <span className="text-[11px] text-[#6b6050]">{conversations.length}</span>
            </div>
            {conversations.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px] text-[#6b6050] mb-3">Sin conversaciones registradas para este caso.</p>
                <Link href={`/agent?caseId=${caseDoc.id}`} className="text-avocat-gold text-[12px] hover:underline">
                  Iniciar consulta con IA →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#2e2b20]">
                {conversations.map(conv => (
                  <div key={conv.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#6b6050]">{conv.messages.length} mensaje{conv.messages.length !== 1 ? 's' : ''}</span>
                      <span className="text-[11px] text-[#3a3630]">{formatDateTime(conv.updatedAt)}</span>
                    </div>
                    {conv.messages[0] && (
                      <p className="text-[12px] text-[#c8c0ac] line-clamp-2 leading-snug">{conv.messages[0].content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
