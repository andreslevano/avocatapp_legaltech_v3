'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { consumirCredito } from '@/lib/creditos';
import { getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { saveAnalysisDocument } from '@/lib/agent-export';
import { getCases, type CaseDoc } from '@/lib/firestore';
import type { OcrPdfProgress } from '@/lib/ocr-pdf-client';

interface AnalisisResult {
  resumen: string;
  tipo: string;
  partes: string[];
  fechasClave: string[];
  riesgos: string[];
  recomendaciones: string[];
  clausulasClave: string[];
}

const MIN_USEFUL_CHARS = 150;

function usefulChars(t: string) {
  return (t.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g) ?? []).length;
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

async function extractDocxText(file: File): Promise<string> {
  const ab  = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  const raw = buf.toString('latin1');
  const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
  return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
}

async function extractText(file: File): Promise<string> {
  const nameLc = file.name.toLowerCase();
  if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) {
    return file.text();
  }
  if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
    const t = await extractPdfTextLayer(file);
    if (usefulChars(t) >= MIN_USEFUL_CHARS) return t;
    const { extractTextFromPdfWithOcr } = await import('@/lib/ocr-pdf-client');
    return extractTextFromPdfWithOcr(file, (_p: OcrPdfProgress) => {});
  }
  if (nameLc.endsWith('.docx')) return extractDocxText(file);
  throw new Error('Formato no soportado. Usa PDF, DOCX o TXT.');
}

function resultToMarkdown(r: AnalisisResult, fileName: string): string {
  const lines = [
    `# Análisis de Documento — ${r.tipo || 'Documento legal'}`,
    `**Archivo:** ${fileName}`,
    '',
    '## Resumen ejecutivo',
    r.resumen,
  ];
  if (r.partes?.length)          { lines.push('', '## Partes involucradas');          r.partes.forEach(p => lines.push(`- ${p}`)); }
  if (r.fechasClave?.length)     { lines.push('', '## Fechas clave');                 r.fechasClave.forEach(f => lines.push(`- ${f}`)); }
  if (r.riesgos?.length)         { lines.push('', '## Riesgos y puntos de atención'); r.riesgos.forEach(ri => lines.push(`- ${ri}`)); }
  if (r.recomendaciones?.length) { lines.push('', '## Recomendaciones');              r.recomendaciones.forEach(rec => lines.push(`- ${rec}`)); }
  if (r.clausulasClave?.length)  { lines.push('', '## Cláusulas clave');              r.clausulasClave.forEach(c => lines.push(`- ${c}`)); }
  return lines.join('\n');
}

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

export default function AnalisisPage() {
  const { user, userDoc } = useAppAuth();

  // Source selection
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [selectedName, setSelectedName]   = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [extracting, setExtracting]       = useState(false);
  const [extractError, setExtractError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Document picker
  const [showPicker, setShowPicker]       = useState(false);
  const [docs, setDocs]                   = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [pickerSearch, setPickerSearch]   = useState('');

  // Analysis
  const [analyzing, setAnalyzing]         = useState(false);
  const [result, setResult]               = useState<AnalisisResult | null>(null);
  const [analyzeError, setAnalyzeError]   = useState('');

  // Save + case assignment
  const [saving, setSaving]               = useState(false);
  const [savedDocId, setSavedDocId]       = useState('');
  const [cases, setCases]                 = useState<CaseDoc[]>([]);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [caseSearch, setCaseSearch]       = useState('');
  const [assignedCase, setAssignedCase]   = useState<CaseDoc | null>(null);

  useEffect(() => {
    getCases(userDoc.uid).then(setCases).catch(() => {});
  }, [userDoc.uid]);

  // ── File from local ──────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedName(file.name);
    setExtractedText('');
    setExtractError('');
    setResult(null);
    setSavedDocId('');
    setAssignedCase(null);
    setExtracting(true);
    try {
      const text = await extractText(file);
      setExtractedText(text);
    } catch (err) {
      setExtractError((err as Error).message);
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, []);

  // ── File from Mis Documentos ─────────────────────────────────────

  const openPicker = async () => {
    setShowPicker(true);
    if (docs.length) return;
    setLoadingDocs(true);
    try { setDocs(await getUserDocuments(userDoc.uid)); }
    catch { /* ignore */ }
    setLoadingDocs(false);
  };

  const handlePickDoc = async (doc: DocumentRecord) => {
    setShowPicker(false);
    setSelectedName(doc.name);
    setExtractedText('');
    setExtractError('');
    setResult(null);
    setSavedDocId('');
    setAssignedCase(null);
    setExtracting(true);
    try {
      const res  = await fetch(doc.downloadUrl);
      const blob = await res.blob();
      const file = new File([blob], doc.name, { type: blob.type });
      setSelectedFile(file);
      setExtractedText(await extractText(file));
    } catch (err) {
      setExtractError((err as Error).message || 'No se pudo cargar el documento.');
    } finally {
      setExtracting(false);
    }
  };

  // ── Analysis ─────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!extractedText.trim()) return;
    setAnalyzeError('');
    setAnalyzing(true);
    setResult(null);
    setSavedDocId('');
    setAssignedCase(null);
    try {
      const idToken = await user.getIdToken();
      const credit  = await consumirCredito(idToken, 'Análisis de documentos');
      if (!credit.ok) {
        setAnalyzeError('Créditos insuficientes. Recarga tu saldo desde la página de Herramientas.');
        return;
      }
      const res  = await fetch('/api/tools/analisis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: extractedText, fileName: selectedName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setAnalyzeError((err as Error).message || 'Error al analizar el documento.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save document ────────────────────────────────────────────────

  const handleSave = async (caseId?: string) => {
    if (!result) return;
    setSaving(true);
    try {
      const md = resultToMarkdown(result, selectedName || 'Documento');
      await saveAnalysisDocument({
        content: md,
        title:   `Análisis — ${result.tipo || selectedName || 'Documento'}`,
        userId:  userDoc.uid,
        plan:    userDoc.plan ?? 'Abogados',
        caseId:  caseId ?? null,
      });
      setSavedDocId('done');
      if (caseId) {
        const c = cases.find(x => x.id === caseId);
        if (c) setAssignedCase(c);
      }
      setShowCasePicker(false);
    } catch { /* silent */ }
    setSaving(false);
  };

  // ── Derived ──────────────────────────────────────────────────────

  const ready      = !!extractedText && !extracting;
  const filteredDocs   = docs.filter(d => !pickerSearch || d.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  const filteredCases  = cases.filter(c => !caseSearch || c.title.toLowerCase().includes(caseSearch.toLowerCase()) || c.ref.toLowerCase().includes(caseSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Análisis de Documentos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Source card ────────────────────────────────── */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0]">Documento a analizar</h3>
              <button onClick={openPicker} className="text-[12px] text-[#6b6050] hover:text-avocat-gold transition-colors">
                Mis documentos
              </button>
            </div>

            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleFileChange} />

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-avocat-gold/40', 'bg-avocat-gold/5'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-avocat-gold/40', 'bg-avocat-gold/5'); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-avocat-gold/40', 'bg-avocat-gold/5');
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const fakeEvent = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileChange(fakeEvent);
                }
              }}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#2e2b20] rounded-xl py-10 text-center cursor-pointer hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors"
            >
              <p className="text-[13px] text-[#6b6050]">Arrastra aquí un PDF, DOCX o TXT</p>
              <p className="text-[11px] text-[#3a3630] mt-1">o haz clic para seleccionar</p>
            </div>

            {/* Status */}
            {extracting && (
              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin shrink-0" />
                <span className="text-[12px] text-[#6b6050]">Extrayendo texto de {selectedName}...</span>
              </div>
            )}

            {extractError && <p className="mt-4 text-[12px] text-red-400">{extractError}</p>}

            {ready && (
              <div className="mt-4 flex items-center justify-between gap-4 bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[18px] shrink-0">
                    {selectedName.endsWith('.pdf') ? '📄' : selectedName.endsWith('.docx') || selectedName.endsWith('.doc') ? '📝' : '📋'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#c8c0ac] truncate">{selectedName}</p>
                    <p className="text-[11px] text-emerald-400">Texto extraído — listo para analizar</p>
                  </div>
                </div>
                <Button variant="BtnGold" size="md" loading={analyzing} onClick={handleAnalyze}>
                  Analizar
                </Button>
              </div>
            )}

            {analyzeError && <p className="mt-3 text-[12px] text-red-400">{analyzeError}</p>}
          </div>

          {/* ── Results ────────────────────────────────────── */}
          {result && (
            <div className="space-y-4">
              {/* Header card with save actions */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Resumen ejecutivo</p>
                    {result.tipo && <p className="text-[12px] text-avocat-gold mb-2">Tipo: {result.tipo}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {savedDocId ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-emerald-400">
                          Guardado{assignedCase ? ` en caso "${assignedCase.title}"` : ''}
                        </span>
                        <Link href="/documents" className="text-[12px] text-avocat-gold hover:underline">Ver en documentos →</Link>
                      </div>
                    ) : (
                      <>
                        <Button variant="BtnOutlineDark" size="sm" loading={saving} onClick={() => setShowCasePicker(v => !v)}>
                          Guardar y asignar a caso
                        </Button>
                        <Button variant="BtnGold" size="sm" loading={saving} onClick={() => handleSave()}>
                          Guardar documento
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Case picker */}
                {showCasePicker && !savedDocId && (
                  <div className="mt-4 pt-4 border-t border-[#2e2b20] space-y-2">
                    <p className="text-[11px] text-[#6b6050]">Selecciona el caso:</p>
                    <input className={INPUT} placeholder="Buscar caso..." value={caseSearch} onChange={e => setCaseSearch(e.target.value)} />
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {filteredCases.length === 0 && (
                        <p className="text-[12px] text-[#3a3630] px-2">Sin casos activos.</p>
                      )}
                      {filteredCases.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSave(c.id)}
                          disabled={saving}
                          className="w-full text-left px-3 py-2 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 text-[12px] text-[#c8c0ac] transition-colors disabled:opacity-40"
                        >
                          <span className="font-medium">{c.title}</span>
                          <span className="text-[#6b6050] ml-2">{c.ref}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => setShowCasePicker(false)} className="text-[11px] text-[#6b6050] hover:text-[#c8c0ac]">Cancelar</button>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-[13px] text-[#c8c0ac] leading-relaxed">{result.resumen}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: 'riesgos',         label: 'Riesgos y puntos de atención', color: 'text-red-400' },
                  { key: 'recomendaciones', label: 'Recomendaciones',              color: 'text-emerald-400' },
                  { key: 'clausulasClave',  label: 'Cláusulas clave',             color: 'text-avocat-gold' },
                  { key: 'partes',          label: 'Partes involucradas',          color: 'text-[#c8c0ac]' },
                  { key: 'fechasClave',     label: 'Fechas clave',                color: 'text-amber-400' },
                ] as { key: keyof AnalisisResult; label: string; color: string }[]).map(({ key, label, color }) => {
                  const items = result[key] as string[];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">{label}</p>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className={`text-[12px] leading-snug ${color}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Document picker modal ──────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPicker(false)} />
          <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 w-full max-w-md shadow-xl space-y-3">
            <h2 className="font-sans font-semibold text-[14px] text-[#e8d4a0]">Mis documentos</h2>
            <input className={INPUT} placeholder="Buscar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {loadingDocs && (
                <div className="py-6 flex justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
                </div>
              )}
              {!loadingDocs && filteredDocs.length === 0 && (
                <p className="text-[12px] text-[#3a3630] py-6 text-center">Sin documentos guardados.</p>
              )}
              {filteredDocs.map(d => (
                <button key={d.id} onClick={() => handlePickDoc(d)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 transition-colors">
                  <p className="text-[12px] font-medium text-[#c8c0ac] truncate">{d.name}</p>
                  <p className="text-[10px] text-[#3a3630] uppercase mt-0.5">{d.type}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="BtnGhost" size="sm" onClick={() => setShowPicker(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
