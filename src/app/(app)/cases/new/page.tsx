'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { createCase, type CaseType } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import type { OcrPdfProgress } from '@/lib/ocr-pdf-client';

// ── Constants ──────────────────────────────────────────────────────

const MIN_USEFUL_CHARS = 150;

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: 'civil',       label: 'Civil' },
  { value: 'laboral',     label: 'Laboral' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'familia',     label: 'Familia' },
  { value: 'penal',       label: 'Penal' },
  { value: 'sucesoral',   label: 'Sucesoral' },
  { value: 'otro',        label: 'Otro' },
];

function generateRef(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `AVC-${year}-${num}`;
}

function normalizeTipo(raw: string): CaseType {
  const map: Record<string, CaseType> = {
    civil: 'civil', laboral: 'laboral', contractual: 'contractual',
    familia: 'familia', penal: 'penal', sucesoral: 'sucesoral', otro: 'otro',
  };
  return map[raw?.toLowerCase()] ?? 'otro';
}

function usefulChars(text: string): number {
  return (text.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g) ?? []).length;
}

// ── Types ──────────────────────────────────────────────────────────

interface IntakeResult {
  titulo: string; tipo: string; cliente: string; deadline: string | null;
  notas: string; resumen: string; partes: string[]; riesgos: string[];
  puntosClave: string[]; fechasClave: string[];
}

interface CaseForm {
  title: string; type: CaseType; client: string; ref: string; deadline: string; notes: string;
}

type FileStatus = 'waiting' | 'text-extract' | 'ocr' | 'done' | 'error';

interface FileState {
  name: string;
  status: FileStatus;
  ocrPercent: number;
  ocrPage: number;
  ocrTotal: number;
  strategy: string;
  error: string;
}

type Step = 'upload' | 'review';
type AnalyzePhase = 'idle' | 'extracting' | 'analyzing';

// ── Client-side text extraction ────────────────────────────────────

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

// ── Small UI sub-components ────────────────────────────────────────

function FileChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return (
    <div className="flex items-center gap-2 bg-[#252218] border border-[#2e2b20] rounded-lg px-3 py-1.5">
      <span className="text-[10px] font-sans font-semibold text-avocat-gold">{ext}</span>
      <span className="text-[12px] font-sans text-[#c8c0ac] max-w-[160px] truncate">{name}</span>
      <button type="button" onClick={onRemove} className="text-[#6b6050] hover:text-red-400 ml-1">×</button>
    </div>
  );
}

function FileRow({ state }: { state: FileState }) {
  const statusIcon: Record<FileStatus, string> = {
    waiting:      '⏳',
    'text-extract': '📄',
    ocr:          '🔍',
    done:         '✓',
    error:        '✗',
  };
  const statusColor: Record<FileStatus, string> = {
    waiting:      'text-[#6b6050]',
    'text-extract': 'text-avocat-gold',
    ocr:          'text-amber-400',
    done:         'text-emerald-400',
    error:        'text-red-400',
  };
  const statusLabel: Record<FileStatus, string> = {
    waiting:      'En cola',
    'text-extract': 'Extrayendo texto...',
    ocr:          state.ocrTotal > 0
                    ? `OCR página ${state.ocrPage}/${state.ocrTotal} (${Math.round(state.ocrPercent)}%)`
                    : `Iniciando OCR...`,
    done:         state.strategy === 'ocr'
                    ? 'OCR completado'
                    : state.strategy === 'txt'
                    ? 'Texto leído'
                    : 'Texto extraído',
    error:        state.error || 'Error',
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`text-[14px] flex-shrink-0 ${statusColor[state.status]}`}>
        {statusIcon[state.status]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-sans text-[#c8c0ac] truncate">{state.name}</p>
        <p className={`text-[11px] font-sans ${statusColor[state.status]}`}>
          {statusLabel[state.status]}
        </p>
        {state.status === 'ocr' && state.ocrPercent > 0 && (
          <div className="mt-1 h-1 bg-[#2e2b20] rounded-full overflow-hidden w-full">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${state.ocrPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AssessmentPanel({ result }: { result: IntakeResult }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#161410] border border-[#2e2b20] rounded-xl p-4">
        <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">Resumen ejecutivo</p>
        <p className="text-[12px] text-[#c8c0ac] leading-relaxed">{result.resumen}</p>
        {result.partes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.partes.map((p, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-[#252218] border border-[#2e2b20] text-[11px] text-[#6b6050]">{p}</span>
            ))}
          </div>
        )}
      </div>

      {result.riesgos.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-red-400 mb-3">⚠ Riesgos y puntos de atención</p>
          <ul className="space-y-2">
            {result.riesgos.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                <span className="text-[12px] text-red-300 leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.puntosClave.length > 0 && (
        <div className="bg-avocat-gold/5 border border-avocat-gold/15 rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-avocat-gold mb-3">✦ Puntos jurídicos clave</p>
          <ul className="space-y-2">
            {result.puntosClave.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-avocat-gold mt-0.5 flex-shrink-0">•</span>
                <span className="text-[12px] text-[#c8c0ac] leading-snug">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.fechasClave.length > 0 && (
        <div className="bg-[#161410] border border-[#2e2b20] rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">📅 Fechas y plazos relevantes</p>
          <ul className="space-y-1.5">
            {result.fechasClave.map((f, i) => (
              <li key={i} className="text-[12px] text-[#c8c0ac]">• {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function NewCasePage() {
  const { userDoc } = useAppAuth();
  const router = useRouter();

  const [step,    setStep]    = useState<Step>('upload');
  const [files,   setFiles]   = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction + analysis state
  const [phase,        setPhase]        = useState<AnalyzePhase>('idle');
  const [fileStates,   setFileStates]   = useState<FileState[]>([]);
  const [analyzeError, setAnalyzeError] = useState('');

  const [intakeResult,  setIntakeResult]  = useState<IntakeResult | null>(null);
  const [intakeDocRefs, setIntakeDocRefs] = useState<Array<{ name: string; size: number; strategy: string }>>([]);

  const [form, setForm] = useState<CaseForm>({
    title: '', type: 'civil', client: '', ref: generateRef(), deadline: '', notes: '',
  });
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── File handling ──────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...list.filter(f => !existing.has(f.name))];
    });
  }, []);

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Update single file state helper ───────────────────────────

  const updateFile = (index: number, patch: Partial<FileState>) =>
    setFileStates(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

  // ── Main analysis pipeline ─────────────────────────────────────

  const handleAnalyze = async () => {
    if (!files.length) return;
    setAnalyzeError('');
    setPhase('extracting');

    // Initialize file states
    const initialStates: FileState[] = files.map(f => ({
      name: f.name, status: 'waiting', ocrPercent: 0,
      ocrPage: 0, ocrTotal: 0, strategy: '', error: '',
    }));
    setFileStates(initialStates);

    const extracted: Array<{ name: string; text: string; size: number; strategy: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file  = files[i];
      const nameLc = file.name.toLowerCase();

      try {
        // ── TXT / Markdown ──────────────────────────────────────
        if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) {
          updateFile(i, { status: 'text-extract', strategy: 'txt' });
          const text = await file.text();
          updateFile(i, { status: 'done', strategy: 'txt' });
          extracted.push({ name: file.name, text, size: file.size, strategy: 'txt' });
          continue;
        }

        // ── PDF ─────────────────────────────────────────────────
        if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
          // Step 1: try text layer extraction
          updateFile(i, { status: 'text-extract', strategy: 'text-pdf' });
          let text = '';
          try {
            text = await extractPdfTextLayer(file);
          } catch { /* pdf.js failed, will fallback to OCR */ }

          if (usefulChars(text) >= MIN_USEFUL_CHARS) {
            // Text PDF — good result
            updateFile(i, { status: 'done', strategy: 'text-pdf' });
            extracted.push({ name: file.name, text, size: file.size, strategy: 'text-pdf' });
            continue;
          }

          // Step 2: image PDF → run OCR
          updateFile(i, { status: 'ocr', strategy: 'ocr', ocrPercent: 0 });

          // Dynamic import to avoid loading Tesseract until needed
          const { extractTextFromPdfWithOcr } = await import('@/lib/ocr-pdf-client');
          const ocrText = await extractTextFromPdfWithOcr(file, (p: OcrPdfProgress) => {
            updateFile(i, {
              status:     'ocr',
              ocrPercent: p.percent,
              ocrPage:    p.page,
              ocrTotal:   p.total,
            });
          });

          updateFile(i, { status: 'done', strategy: 'ocr' });
          extracted.push({ name: file.name, text: ocrText, size: file.size, strategy: 'ocr' });
          continue;
        }

        // ── DOCX ────────────────────────────────────────────────
        if (nameLc.endsWith('.docx')) {
          updateFile(i, { status: 'text-extract', strategy: 'docx' });
          const ab  = await file.arrayBuffer();
          const buf = Buffer.from(ab);
          const raw = buf.toString('latin1');
          const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
          const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
          updateFile(i, { status: 'done', strategy: 'docx' });
          extracted.push({ name: file.name, text, size: file.size, strategy: 'docx' });
          continue;
        }

        // ── Unsupported ─────────────────────────────────────────
        updateFile(i, { status: 'done', strategy: 'unsupported' });
        extracted.push({ name: file.name, text: '', size: file.size, strategy: 'unsupported' });

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        updateFile(i, { status: 'error', error: msg });
        extracted.push({ name: file.name, text: '', size: file.size, strategy: 'error' });
      }
    }

    // ── Phase 2: GPT-4o analysis ──────────────────────────────
    setPhase('analyzing');
    try {
      const res  = await fetch('/api/cases/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ documents: extracted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');

      const r: IntakeResult = data.result;
      setIntakeResult(r);

      // Save document metadata to display in case detail
      setIntakeDocRefs(
        extracted
          .filter(d => d.strategy !== 'error')
          .map(d => ({
            name:     d.name,
            size:     d.size,
            strategy: d.strategy,
          }))
      );

      setForm(prev => ({
        ...prev,
        title:    r.titulo  || prev.title,
        type:     normalizeTipo(r.tipo),
        client:   r.cliente || prev.client,
        deadline: r.deadline ?? prev.deadline,
        notes:    r.notas   || prev.notes,
      }));

      setStep('review');
    } catch (err) {
      setAnalyzeError((err as Error).message || 'Error al analizar los documentos.');
    } finally {
      setPhase('idle');
    }
  };

  const handleSkipToForm = () => {
    setIntakeResult(null);
    setIntakeDocRefs([]);
    setStep('review');
  };

  // ── Create case ───────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setSaveError('El título es obligatorio.');
    setSaveError('');
    setSaving(true);
    try {
      const id = await createCase(userDoc.uid, {
        title:    form.title.trim(),
        type:     form.type,
        status:   'active',
        ref:      form.ref || generateRef(),
        client:   form.client.trim(),
        notes:    form.notes.trim(),
        deadline: null,
        // Persist AI analysis so it appears in case detail
        assessment: intakeResult ? {
          resumen:     intakeResult.resumen,
          partes:      intakeResult.partes,
          riesgos:     intakeResult.riesgos,
          puntosClave: intakeResult.puntosClave,
          fechasClave: intakeResult.fechasClave,
        } : undefined,
        // Persist document metadata (name, size, extraction strategy)
        documentRefs: intakeDocRefs.length > 0 ? intakeDocRefs.map(d => ({
          name:     d.name,
          type:     d.name.split('.').pop()?.toLowerCase() ?? '',
          size:     d.size,
          strategy: d.strategy,
        })) : undefined,
      });
      router.push(`/cases/${id}`);
    } catch {
      setSaveError('Error al crear el caso. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof CaseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const inputCls = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors';

  const isProcessing = phase !== 'idle';

  // ── RENDER ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Nuevo caso"
        subtitle={step === 'review' && intakeResult ? 'Análisis completado — revisa y confirma' : undefined}
        actions={
          <Link href="/cases">
            <Button variant="BtnGhost" size="sm">← Cancelar</Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ── STEP 1: Upload ─────────────────────────────────── */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-4">
                Documentos del caso (opcional)
              </p>

              {/* Drop zone — hidden while processing */}
              {!isProcessing && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                    dragging
                      ? 'border-avocat-gold bg-avocat-gold/5'
                      : 'border-[#2e2b20] hover:border-avocat-gold/40 hover:bg-[#252218]',
                  ].join(' ')}
                >
                  <div className="text-4xl mb-3">📎</div>
                  <p className="text-[13px] font-sans font-medium text-[#c8c0ac] mb-1">
                    Arrastra documentos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-[11px] text-[#6b6050]">
                    PDF (texto o escaneado), DOCX, TXT · Múltiples archivos
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                onChange={e => e.target.files && addFiles(e.target.files)}
                className="hidden"
              />

              {/* File chips (before processing) */}
              {!isProcessing && files.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {files.map(f => (
                    <FileChip key={f.name} name={f.name} onRemove={() => removeFile(f.name)} />
                  ))}
                </div>
              )}

              {/* ── Processing progress ── */}
              {isProcessing && (
                <div className="space-y-0 divide-y divide-[#2e2b20]">
                  {fileStates.map((fs, i) => <FileRow key={i} state={fs} />)}

                  {phase === 'analyzing' && (
                    <div className="flex items-center gap-3 pt-3 mt-1">
                      <div className="h-4 w-4 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin flex-shrink-0" />
                      <p className="text-[12px] font-sans text-avocat-gold">
                        Analizando con GPT-4o...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {analyzeError && (
                <p className="mt-3 text-[12px] text-red-400">{analyzeError}</p>
              )}
            </div>

            {/* Actions */}
            {!isProcessing && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="BtnGold"
                  size="lg"
                  fullWidth
                  disabled={files.length === 0}
                  onClick={handleAnalyze}
                >
                  {`Analizar con IA (${files.length} archivo${files.length !== 1 ? 's' : ''})`}
                </Button>
                <Button variant="BtnGhost" size="lg" fullWidth onClick={handleSkipToForm}>
                  Crear sin documentos
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Review ─────────────────────────────────── */}
        {step === 'review' && (
          <div className="max-w-6xl mx-auto">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="mb-5 flex items-center gap-1.5 text-[12px] text-[#6b6050] hover:text-[#c8c0ac] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Volver a documentos
            </button>

            <div className={intakeResult ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>

              {/* Assessment panel */}
              {intakeResult && (
                <div className="space-y-2">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
                    Análisis de documentos
                  </p>
                  <AssessmentPanel result={intakeResult} />
                </div>
              )}

              {/* Form */}
              <div>
                {intakeResult && (
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
                    Datos del caso — pre-rellenados, puedes editar
                  </p>
                )}
                <form onSubmit={handleSubmit} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-4">
                  {saveError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">
                      {saveError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Título *</label>
                    <input type="text" required value={form.title} onChange={set('title')} placeholder="Ej: Despido improcedente García López" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Tipo *</label>
                      <select value={form.type} onChange={set('type')} className={inputCls}>
                        {CASE_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#1e1c16]">{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Referencia</label>
                      <input type="text" value={form.ref} onChange={set('ref')} placeholder="AVC-2025-001" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Cliente</label>
                      <input type="text" value={form.client} onChange={set('client')} placeholder="Nombre del cliente" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">Fecha límite</label>
                      <input type="date" value={form.deadline} onChange={set('deadline')} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                      Notas{intakeResult ? ' — generadas por IA' : ''}
                    </label>
                    <textarea rows={5} value={form.notes} onChange={set('notes')} placeholder="Descripción, antecedentes, observaciones..." className={`${inputCls} resize-none leading-relaxed`} />
                  </div>

                  <Button type="submit" variant="BtnGold" size="lg" fullWidth loading={saving}>
                    Crear caso
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
