'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { createCase, type CaseType } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────

interface IntakeResult {
  titulo: string;
  tipo: string;
  cliente: string;
  deadline: string | null;
  notas: string;
  resumen: string;
  partes: string[];
  riesgos: string[];
  puntosClave: string[];
  fechasClave: string[];
}

interface CaseForm {
  title: string;
  type: CaseType;
  client: string;
  ref: string;
  deadline: string;
  notes: string;
}

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

// ── File item component ────────────────────────────────────────────

function FileChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return (
    <div className="flex items-center gap-2 bg-[#252218] border border-[#2e2b20] rounded-lg px-3 py-1.5">
      <span className="text-[10px] font-sans font-semibold text-avocat-gold">{ext}</span>
      <span className="text-[12px] font-sans text-[#c8c0ac] max-w-[160px] truncate">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[#6b6050] hover:text-red-400 transition-colors leading-none ml-1"
      >×</button>
    </div>
  );
}

// ── Assessment panel ───────────────────────────────────────────────

function AssessmentPanel({ result }: { result: IntakeResult }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[#161410] border border-[#2e2b20] rounded-xl p-4">
        <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">
          Resumen ejecutivo
        </p>
        <p className="text-[12px] text-[#c8c0ac] leading-relaxed">{result.resumen}</p>
        {result.partes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.partes.map((p, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-[#252218] border border-[#2e2b20] text-[11px] text-[#6b6050]">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Risks */}
      {result.riesgos.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-red-400 mb-3">
            ⚠ Riesgos y puntos de atención
          </p>
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

      {/* Key points */}
      {result.puntosClave.length > 0 && (
        <div className="bg-avocat-gold/5 border border-avocat-gold/15 rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-avocat-gold mb-3">
            ✦ Puntos jurídicos clave
          </p>
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

      {/* Key dates */}
      {result.fechasClave.length > 0 && (
        <div className="bg-[#161410] border border-[#2e2b20] rounded-xl p-4">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
            📅 Fechas y plazos relevantes
          </p>
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

type Step = 'upload' | 'review';

export default function NewCasePage() {
  const { userDoc } = useAppAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [intakeResult, setIntakeResult] = useState<IntakeResult | null>(null);
  const [intakeMeta, setIntakeMeta] = useState<{
    strategies: { file: string; strategy: string }[];
    requiresOcr: boolean;
    extractionQuality: 'full' | 'partial';
  } | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  const [form, setForm] = useState<CaseForm>({
    title: '', type: 'civil', client: '', ref: generateRef(), deadline: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── AI Analysis ───────────────────────────────────────────────

  const handleAnalyze = async () => {
    setAnalyzeError('');
    setAnalyzing(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));

      const res = await fetch('/api/cases/intake', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');

      const r: IntakeResult = data.result;
      setIntakeResult(r);
      setIntakeMeta(data.meta ?? null);

      // Pre-fill form
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
      setAnalyzing(false);
    }
  };

  const handleSkipToForm = () => {
    setIntakeResult(null);
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

  // ── INPUT CLASSES ──────────────────────────────────────────────

  const inputCls =
    'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors';

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

              {/* Drop zone */}
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
                  PDF, DOCX, TXT · Múltiples archivos permitidos
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                onChange={e => e.target.files && addFiles(e.target.files)}
                className="hidden"
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {files.map(f => (
                    <FileChip key={f.name} name={f.name} onRemove={() => removeFile(f.name)} />
                  ))}
                </div>
              )}

              {analyzeError && (
                <p className="mt-3 text-[12px] text-red-400">{analyzeError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="BtnGold"
                size="lg"
                fullWidth
                loading={analyzing}
                disabled={files.length === 0 || analyzing}
                onClick={handleAnalyze}
              >
                {analyzing ? 'Analizando documentos...' : `Analizar con IA (${files.length} archivo${files.length !== 1 ? 's' : ''})`}
              </Button>
              <Button
                variant="BtnGhost"
                size="lg"
                fullWidth
                onClick={handleSkipToForm}
              >
                Crear sin documentos
              </Button>
            </div>

            {analyzing && (
              <p className="text-center text-[11px] text-[#6b6050]">
                GPT-4o está leyendo los documentos y extrayendo datos del caso...
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Review ─────────────────────────────────── */}
        {step === 'review' && (
          <div className="max-w-6xl mx-auto">
            {/* Back to upload */}
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

              {/* Assessment panel (left/top) */}
              {intakeResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">
                      Análisis de documentos
                    </p>
                    {intakeMeta && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                        intakeMeta.extractionQuality === 'full'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {intakeMeta.extractionQuality === 'full' ? 'Extracción completa' : 'Extracción parcial'}
                      </span>
                    )}
                  </div>

                  {/* OCR warning banner */}
                  {intakeMeta?.requiresOcr && (
                    <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 mb-3">
                      <p className="text-[12px] font-sans font-semibold text-amber-400 mb-1">
                        ⚠ Documento escaneado detectado
                      </p>
                      <p className="text-[11px] text-amber-300/80 leading-relaxed">
                        Uno o más archivos son PDFs de imagen (sin capa de texto). La extracción se basa en
                        metadatos y nombre de archivo. Para análisis completo usa{' '}
                        <a href="/tools/extraccion-datos" className="underline hover:text-amber-200">
                          Extracción de Datos con OCR
                        </a>
                        {' '}o sube una versión con texto seleccionable.
                      </p>
                      {intakeMeta.strategies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {intakeMeta.strategies.map((s, i) => (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-sans ${
                              s.strategy === 'image-pdf'
                                ? 'border-amber-500/30 text-amber-400/80'
                                : 'border-emerald-500/20 text-emerald-400/70'
                            }`}>
                              {s.file.length > 20 ? s.file.slice(0, 18) + '…' : s.file}
                              {' '}· {s.strategy === 'image-pdf' ? 'imagen' : s.strategy === 'txt' ? 'texto' : 'texto-PDF'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <AssessmentPanel result={intakeResult} />
                </div>
              )}

              {/* Form (right/bottom) */}
              <div>
                {intakeResult && (
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
                    Datos del caso {intakeResult ? '— pre-rellenados, puedes editar' : ''}
                  </p>
                )}
                <form onSubmit={handleSubmit} className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-4">
                  {saveError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">
                      {saveError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={set('title')}
                      placeholder="Ej: Despido improcedente García López"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                        Tipo *
                      </label>
                      <select value={form.type} onChange={set('type')} className={inputCls}>
                        {CASE_TYPES.map(t => (
                          <option key={t.value} value={t.value} className="bg-[#1e1c16]">{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                        Referencia
                      </label>
                      <input type="text" value={form.ref} onChange={set('ref')} placeholder="AVC-2025-001" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                        Cliente
                      </label>
                      <input type="text" value={form.client} onChange={set('client')} placeholder="Nombre del cliente" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                        Fecha límite
                      </label>
                      <input type="date" value={form.deadline} onChange={set('deadline')} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                      Notas {intakeResult ? '— generadas por IA' : ''}
                    </label>
                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={set('notes')}
                      placeholder="Descripción, antecedentes, observaciones..."
                      className={`${inputCls} resize-none leading-relaxed`}
                    />
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
