'use client';

import { useState, useRef, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { consumirCredito } from '@/lib/creditos';
import { getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { saveAnalysisDocument } from '@/lib/agent-export';
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

function resultToMarkdown(r: AnalisisResult, fileName: string): string {
  const lines = [
    `# Análisis de Documento — ${r.tipo || 'Documento legal'}`,
    `**Archivo:** ${fileName}`,
    '',
    '## Resumen ejecutivo',
    r.resumen,
  ];
  if (r.partes?.length)          { lines.push('', '## Partes involucradas');     r.partes.forEach(p => lines.push(`- ${p}`)); }
  if (r.fechasClave?.length)     { lines.push('', '## Fechas clave');            r.fechasClave.forEach(f => lines.push(`- ${f}`)); }
  if (r.riesgos?.length)         { lines.push('', '## Riesgos y puntos de atención'); r.riesgos.forEach(ri => lines.push(`- ${ri}`)); }
  if (r.recomendaciones?.length) { lines.push('', '## Recomendaciones');         r.recomendaciones.forEach(rec => lines.push(`- ${rec}`)); }
  if (r.clausulasClave?.length)  { lines.push('', '## Cláusulas clave');         r.clausulasClave.forEach(c => lines.push(`- ${c}`)); }
  return lines.join('\n');
}

export default function AnalisisPage() {
  const { user, userDoc } = useAppAuth();
  const [text, setText]         = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult]     = useState<AnalisisResult | null>(null);
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Document picker
  const [showPicker, setShowPicker]   = useState(false);
  const [docs, setDocs]               = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Save result
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText('');
    setError('');
    setExtracting(true);
    try {
      const nameLc = file.name.toLowerCase();
      if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) {
        setText(await file.text());
      } else if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
        const t = await extractPdfTextLayer(file);
        if (usefulChars(t) >= MIN_USEFUL_CHARS) {
          setText(t);
        } else {
          const { extractTextFromPdfWithOcr } = await import('@/lib/ocr-pdf-client');
          const ocrText = await extractTextFromPdfWithOcr(file, (_p: OcrPdfProgress) => {});
          setText(ocrText);
        }
      } else if (nameLc.endsWith('.docx')) {
        setText(await extractDocxText(file));
      } else {
        setError('Formato no soportado. Usa PDF, DOCX o TXT.');
      }
    } catch { setError('Error al extraer texto del archivo.'); }
    finally { setExtracting(false); }
    if (fileRef.current) fileRef.current.value = '';
  }, []);

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
    setFileName(doc.name);
    setText('');
    setError('');
    setExtracting(true);
    try {
      const res = await fetch(doc.downloadUrl);
      const blob = await res.blob();
      const file = new File([blob], doc.name, { type: blob.type });
      const nameLc = doc.name.toLowerCase();
      if (nameLc.endsWith('.pdf')) {
        const t = await extractPdfTextLayer(file);
        setText(usefulChars(t) >= MIN_USEFUL_CHARS ? t : '(PDF sin texto seleccionable)');
      } else if (nameLc.endsWith('.docx') || nameLc.endsWith('.doc')) {
        setText(await extractDocxText(file));
      } else {
        setText(await file.text());
      }
    } catch { setError('No se pudo cargar el documento.'); }
    setExtracting(false);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return setError('Introduce o carga el texto del documento.');
    setError(''); setAnalyzing(true); setResult(null); setSaved(false);
    try {
      const idToken = await user.getIdToken();
      const credit = await consumirCredito(idToken, 'Análisis de documentos');
      if (!credit.ok) {
        setError('Créditos insuficientes. Recarga tu saldo desde la página de Herramientas.');
        return;
      }
      const res  = await fetch('/api/tools/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setError((err as Error).message || 'Error al analizar el documento.');
    } finally { setAnalyzing(false); }
  };

  const handleSaveDoc = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const md = resultToMarkdown(result, fileName || 'Documento');
      await saveAnalysisDocument({
        content: md,
        title: `Análisis — ${result.tipo || fileName || 'Documento'}`,
        userId: userDoc.uid,
        plan: userDoc.plan ?? 'Abogados',
      });
      setSaved(true);
    } catch { /* silent */ }
    setSaving(false);
  };

  const filteredDocs = docs.filter(d =>
    !pickerSearch || d.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Análisis de Documentos"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Input area */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-sans font-semibold text-[13px] text-[#e8d4a0]">Documento a analizar</h3>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={handleFile} className="hidden" />
                <Button variant="BtnOutlineDark" size="sm" loading={extracting} onClick={() => fileRef.current?.click()}>
                  {extracting ? 'Extrayendo...' : 'Subir archivo'}
                </Button>
                <Button variant="BtnGhost" size="sm" onClick={openPicker}>
                  Mis documentos
                </Button>
              </div>
            </div>
            {fileName && !extracting && (
              <p className="text-[11px] text-avocat-gold mb-2">Archivo: {fileName}</p>
            )}
            {extracting && (
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
                <span className="text-[11px] text-[#6b6050]">Extrayendo texto...</span>
              </div>
            )}
            <textarea
              rows={8}
              value={text}
              onChange={e => { setText(e.target.value); setSaved(false); }}
              placeholder="Pega aquí el texto del documento legal a analizar, o usa los botones de arriba para cargar un archivo (PDF, DOCX, TXT)."
              className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors resize-none leading-relaxed"
            />
            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
            <div className="mt-3 flex justify-end">
              <Button variant="BtnGold" size="md" loading={analyzing} onClick={handleAnalyze}>
                Analizar documento
              </Button>
            </div>
          </div>

          {/* Document picker modal */}
          {showPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowPicker(false)} />
              <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 w-full max-w-md shadow-elevated space-y-3">
                <h2 className="font-sans font-semibold text-[14px] text-[#e8d4a0]">Seleccionar documento</h2>
                <input className={INPUT} placeholder="Buscar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {loadingDocs && <p className="text-[12px] text-[#6b6050] py-4 text-center">Cargando...</p>}
                  {!loadingDocs && filteredDocs.length === 0 && <p className="text-[12px] text-[#3a3630] py-4 text-center">Sin documentos.</p>}
                  {filteredDocs.map(d => (
                    <button key={d.id} onClick={() => handlePickDoc(d)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 text-[12px] text-[#c8c0ac] transition-colors">
                      <span className="font-medium truncate block">{d.name}</span>
                      <span className="text-[10px] text-[#3a3630] uppercase">{d.type}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button variant="BtnGhost" size="sm" onClick={() => setShowPicker(false)}>Cancelar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1">Resumen ejecutivo</p>
                    {result.tipo && <p className="text-[12px] text-avocat-gold mb-2">Tipo: {result.tipo}</p>}
                  </div>
                  {saved ? (
                    <Link href="/documents" className="text-[12px] text-avocat-gold hover:underline shrink-0">Ver documento →</Link>
                  ) : (
                    <Button variant="BtnOutlineDark" size="sm" loading={saving} onClick={handleSaveDoc}>
                      Guardar análisis
                    </Button>
                  )}
                </div>
                <p className="text-[13px] text-[#c8c0ac] leading-relaxed">{result.resumen}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'riesgos',         label: 'Riesgos y puntos de atención', color: 'text-red-400' },
                  { key: 'recomendaciones', label: 'Recomendaciones',              color: 'text-emerald-400' },
                  { key: 'clausulasClave',  label: 'Cláusulas clave',             color: 'text-avocat-gold' },
                  { key: 'partes',          label: 'Partes involucradas',          color: 'text-[#c8c0ac]' },
                  { key: 'fechasClave',     label: 'Fechas clave',                color: 'text-amber-400' },
                ].map(({ key, label, color }) => {
                  const items = result[key as keyof AnalisisResult] as string[];
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
    </div>
  );
}
