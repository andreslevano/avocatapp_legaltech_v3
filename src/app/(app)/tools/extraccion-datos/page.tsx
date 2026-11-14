'use client';

import { useState, useRef, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { consumirCredito } from '@/lib/creditos';
import { getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { saveAnalysisDocument } from '@/lib/agent-export';
import { useDocBranding } from '@/hooks/useDocBranding';
import type { OcrPdfProgress } from '@/lib/ocr-pdf-client';

interface ExtractedField { key: string; value: string; }
interface ExtractionResult {
  fileName: string;
  country: string;
  documentType: string;
  emisor: string;
  receptor: string;
  fields: ExtractedField[];
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

async function extractFileText(file: File): Promise<string> {
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
  return '';
}

function resultsToMarkdown(results: ExtractionResult[]): string {
  const lines: string[] = ['# Extracción de Datos — Informe', ''];
  for (const r of results) {
    lines.push(`## ${r.fileName}`, '');
    lines.push(`**Tipo:** ${r.documentType}`, `**País:** ${r.country}`, `**Emisor:** ${r.emisor}`, `**Receptor:** ${r.receptor}`, '');
    if (r.fields.length) {
      lines.push('| Campo | Valor |', '|---|---|');
      r.fields.forEach(f => lines.push(`| ${f.key} | ${f.value} |`));
    }
    lines.push('');
  }
  return lines.join('\n');
}

function exportXlsx(results: ExtractionResult[]) {
  import('xlsx').then(XLSX => {
    const wb = XLSX.utils.book_new();
    for (const r of results) {
      const rows: (string | number)[][] = [
        ['Campo', 'Valor'],
        ['Archivo', r.fileName],
        ['Tipo', r.documentType],
        ['País', r.country],
        ['Emisor', r.emisor],
        ['Receptor', r.receptor],
        [],
        ...r.fields.map(f => [f.key, f.value]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, r.fileName.slice(0, 31));
    }
    XLSX.writeFile(wb, `extraccion-${Date.now()}.xlsx`);
  });
}

export default function ExtraccionDatosPage() {
  const { user, userDoc } = useAppAuth();
  const brand = useDocBranding();

  const [files, setFiles]           = useState<File[]>([]);
  const [dragging, setDragging]     = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [processing, setProcessing] = useState<string>('');
  const [results, setResults]       = useState<ExtractionResult[]>([]);
  const [error, setError]           = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Document picker
  const [showPicker, setShowPicker]     = useState(false);
  const [docs, setDocs]                 = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...list.filter(f => !existing.has(f.name))];
    });
    setSaved(false); setResults([]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

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
    try {
      const res  = await fetch(doc.downloadUrl);
      const blob = await res.blob();
      const file = new File([blob], doc.name, { type: blob.type });
      addFiles([file]);
    } catch { setError('No se pudo cargar el documento.'); }
  };

  const handleExtract = async () => {
    if (!files.length) return setError('Añade al menos un documento.');
    setError(''); setResults([]); setExtracting(true); setSaved(false);

    const credit = await consumirCredito(await user.getIdToken(), 'Extracción de datos');
    if (!credit.ok) {
      setError('Créditos insuficientes.');
      setExtracting(false);
      return;
    }

    const extracted: ExtractionResult[] = [];
    for (const file of files) {
      setProcessing(`Extrayendo texto de ${file.name}...`);
      let text = '';
      try { text = await extractFileText(file); }
      catch { text = ''; }

      setProcessing(`Analizando ${file.name} con IA...`);
      const prompt = `Extrae los datos del siguiente documento y devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura:
{"country":"...","documentType":"Factura|Contrato|Recibo|Demanda|Sentencia|Escritura|Otro","emisor":"...","receptor":"...","fields":[{"key":"...","value":"..."}]}
Extrae máximo 20 campos relevantes. Usa "-" si no hay valor.
Documento: ${file.name}
${text.slice(0, 12000)}`;

      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, history: [], userPlan: userDoc.plan, caseContext: null }),
        });
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; acc += decoder.decode(value, { stream: true }); } }
        const clean = acc.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(clean);
        extracted.push({ fileName: file.name, ...parsed });
      } catch {
        extracted.push({ fileName: file.name, country: '—', documentType: 'Error', emisor: '—', receptor: '—', fields: [] });
      }
    }

    setResults(extracted);
    setProcessing('');
    setExtracting(false);
  };

  const handleSaveWord = async () => {
    if (!results.length) return;
    setSaving(true);
    try {
      await saveAnalysisDocument({
        content: resultsToMarkdown(results),
        title: `Extracción de datos — ${results.length} documento${results.length !== 1 ? 's' : ''}`,
        userId: userDoc.uid,
        plan: userDoc.plan ?? 'Abogados',
        branding: brand.word, pdfBranding: brand.pdf,
      });
      setSaved(true);
    } catch { /* silent */ }
    setSaving(false);
  };

  const filteredDocs = docs.filter(d =>
    !pickerSearch || d.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const INPUT = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border';

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Extracción de Datos"
        actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Upload area */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-semibold text-small text-text-heading">Documentos</h3>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" multiple className="hidden"
                  onChange={e => e.target.files && addFiles(e.target.files)} />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>+ Subir archivos</Button>
                <Button variant="ghost" size="sm" onClick={openPicker}>Mis documentos</Button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-accent bg-accent-subtle' : 'border-border hover:border-accent-border'
              }`}
            >
              <p className="text-caption text-text-muted">
                Arrastra aquí PDF, DOCX o TXT · múltiples archivos
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-1">
                {files.map(f => (
                  <div key={f.name} className="flex items-center justify-between px-3 py-1.5 bg-bg border border-border rounded-lg">
                    <span className="text-caption text-text truncate">{f.name}</span>
                    <button onClick={() => { setFiles(p => p.filter(x => x.name !== f.name)); setResults([]); setSaved(false); }}
                      className="text-text-muted hover:text-danger-text ml-2 shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-2 text-caption text-danger-text">{error}</p>}

            {extracting && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                <span className="text-caption text-text-muted">{processing}</span>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="accent" size="md" loading={extracting} disabled={!files.length} onClick={handleExtract}>
                {`Extraer datos${files.length > 1 ? ` (${files.length} archivos)` : ''}`}
              </Button>
            </div>
          </div>

          {/* Document picker */}
          {showPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowPicker(false)} />
              <div className="relative bg-surface border border-border rounded-2xl p-5 w-full max-w-md shadow-elevated space-y-3">
                <h2 className="font-sans font-semibold text-body-sm text-text-heading">Seleccionar documento</h2>
                <input className={INPUT} placeholder="Buscar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {loadingDocs && <p className="text-caption text-text-muted py-4 text-center">Cargando...</p>}
                  {!loadingDocs && filteredDocs.length === 0 && <p className="text-caption text-text-muted py-4 text-center">Sin documentos.</p>}
                  {filteredDocs.map(d => (
                    <button key={d.id} onClick={() => handlePickDoc(d)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-bg border border-border hover:border-accent-border text-caption text-text transition-colors">
                      <span className="font-medium truncate block">{d.name}</span>
                      <span className="text-label text-text-muted uppercase">{d.type}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)}>Cancelar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
                  {results.length} documento{results.length !== 1 ? 's' : ''} procesado{results.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  {saved ? (
                    <Link href="/documents" className="text-caption text-accent-text hover:underline">Ver documento →</Link>
                  ) : (
                    <Button variant="secondary" size="sm" loading={saving} onClick={handleSaveWord}>
                      Guardar Word
                    </Button>
                  )}
                  <Button variant="accent" size="sm" onClick={() => exportXlsx(results)}>
                    Exportar Excel
                  </Button>
                </div>
              </div>

              {results.map((r, ri) => (
                <div key={ri} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="text-small font-sans font-semibold text-text-heading">{r.fileName}</h3>
                    <p className="text-caption text-text-muted">{r.documentType} · {r.country}</p>
                  </div>
                  <div className="px-5 py-3 border-b border-border grid grid-cols-2 gap-3 text-caption">
                    <div><span className="text-text-muted">Emisor: </span><span className="text-text">{r.emisor}</span></div>
                    <div><span className="text-text-muted">Receptor: </span><span className="text-text">{r.receptor}</span></div>
                  </div>
                  <div className="divide-y divide-border">
                    {r.fields.map((f, i) => (
                      <div key={i} className="flex items-center px-5 py-2.5 text-caption">
                        <span className="w-1/2 text-text-muted font-medium">{f.key}</span>
                        <span className="w-1/2 text-text">{f.value}</span>
                      </div>
                    ))}
                    {r.fields.length === 0 && (
                      <p className="px-5 py-3 text-caption text-text-muted">Sin campos extraídos.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
