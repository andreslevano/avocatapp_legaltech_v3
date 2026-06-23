'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { downloadAsWord, downloadAsPdf, buildWordBlob } from '@/lib/agent-export';
import { saveDocumentToStorage } from '@/lib/storage-client';

type Tipo = 'unilateral' | 'bilateral';

interface Parte {
  nombre: string;
  empresa: string;
  cargo: string;
}

const DURACIONES = [
  { value: '1 año', label: '1 año' },
  { value: '2 años', label: '2 años' },
  { value: '3 años', label: '3 años' },
  { value: '5 años', label: '5 años' },
  { value: 'Indefinida mientras exista la relación comercial', label: 'Indefinida' },
];

function ParteFields({ label, value, onChange }: {
  label: string;
  value: Parte;
  onChange: (p: Parte) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-avocat-gold/70">
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Nombre completo *"
          value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })}
          className="bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
        />
        <input
          type="text"
          placeholder="Empresa / Organización"
          value={value.empresa}
          onChange={e => onChange({ ...value, empresa: e.target.value })}
          className="bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
        />
        <input
          type="text"
          placeholder="Cargo / Representación"
          value={value.cargo}
          onChange={e => onChange({ ...value, cargo: e.target.value })}
          className="bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
        />
      </div>
    </div>
  );
}

export default function NdaPage() {
  const { user, userDoc } = useAppAuth();

  // Form state
  const [tipo, setTipo] = useState<Tipo>('unilateral');
  const [divulgante, setDivulgante] = useState<Parte>({ nombre: '', empresa: '', cargo: '' });
  const [receptora, setReceptora] = useState<Parte>({ nombre: '', empresa: '', cargo: '' });
  const [objeto, setObjeto] = useState('');
  const [duracion, setDuracion] = useState('2 años');
  const [jurisdiccion, setJurisdiccion] = useState(
    (userDoc as Record<string, unknown>).country as string || 'Chile'
  );
  const [noCompetencia, setNoCompetencia] = useState(false);
  const [penalizacion, setPenalizacion] = useState(false);

  // Status
  const [generating, setGenerating] = useState(false);
  const [repoStatus, setRepoStatus] = useState<{ found: number; names: string[] } | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!divulgante.nombre.trim()) return setError('Ingresa el nombre de la parte divulgante.');
    if (!receptora.nombre.trim())  return setError('Ingresa el nombre de la parte receptora.');
    if (!objeto.trim())            return setError('Describe el objeto de la confidencialidad.');

    setError('');
    setResult('');
    setRepoStatus(null);
    setSaved(false);
    setGenerating(true);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/tools/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ tipo, divulgante, receptora, objeto, duracion, jurisdiccion, noCompetencia, penalizacion }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split('\n\n');
          sseBuffer = parts.pop() ?? '';

          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            let ev: Record<string, unknown>;
            try { ev = JSON.parse(part.slice(6).trim()); } catch { continue; }

            if (ev.type === 'repo_check') {
              setRepoStatus({ found: ev.found as number, names: ev.names as string[] });
            } else if (ev.type === 'text') {
              accumulated += ev.delta as string;
              setResult(accumulated);
            } else if (ev.type === 'error') {
              throw new Error(ev.message as string);
            }
          }
        }
      }

      // Auto-save to documents repository
      if (accumulated.length > 200) {
        try {
          const ndaName = `NDA_${divulgante.empresa || divulgante.nombre}_${receptora.empresa || receptora.nombre}`.replace(/\s+/g, '_').slice(0, 60);
          const { blob } = buildWordBlob(accumulated, ndaName);
          const record = await saveDocumentToStorage({
            userId: user.uid,
            plan: userDoc.plan ?? 'Autoservicio',
            blob,
            name: `${ndaName}.doc`,
            caseId: null,
            source: 'generated',
          });
          setSaved(true);
          user.getIdToken().then(token =>
            fetch('/api/documents/embed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ docId: record.id, text: accumulated.slice(0, 12000) }),
            })
          ).catch(() => {});
        } catch {
          // auto-save failed — user can still download manually
        }
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error al generar el NDA. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const ndaTitle = `NDA — ${divulgante.empresa || divulgante.nombre || 'Divulgante'} / ${receptora.empresa || receptora.nombre || 'Receptora'}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Generador de NDA"
        subtitle="Acuerdo de Confidencialidad asistido por IA"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Form */}
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-6">

            {/* Tipo */}
            <div>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
                Tipo de NDA
              </p>
              <div className="flex gap-3">
                {(['unilateral', 'bilateral'] as Tipo[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`px-4 py-2.5 rounded-lg text-[12px] font-sans border transition-colors ${
                      tipo === t
                        ? 'border-avocat-gold/50 bg-avocat-gold/10 text-avocat-gold'
                        : 'border-[#2e2b20] text-[#6b6050] hover:text-[#c8c0ac] hover:border-[#3a3630]'
                    }`}
                  >
                    {t === 'unilateral' ? 'Unilateral' : 'Bilateral / Mutuo'}
                    <span className="ml-2 text-[10px] opacity-60">
                      {t === 'unilateral' ? '(1 parte divulga)' : '(ambas partes divulgan)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Partes */}
            <div className="space-y-4">
              <ParteFields
                label="Parte divulgante (quien comparte información)"
                value={divulgante}
                onChange={setDivulgante}
              />
              <ParteFields
                label="Parte receptora (quien recibe y se obliga)"
                value={receptora}
                onChange={setReceptora}
              />
            </div>

            {/* Objeto */}
            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Objeto de la confidencialidad *
              </label>
              <textarea
                rows={4}
                value={objeto}
                onChange={e => setObjeto(e.target.value)}
                placeholder="Describe el proyecto, negociación o información que se quiere proteger.&#10;Ej: Proyecto de desarrollo de software para gestión de inventarios. Se compartirán especificaciones técnicas, código fuente, datos de clientes y proyecciones financieras con el propósito de evaluar una potencial alianza comercial."
                className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed"
              />
            </div>

            {/* Duración + Jurisdicción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Duración de la confidencialidad
                </label>
                <select
                  value={duracion}
                  onChange={e => setDuracion(e.target.value)}
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40"
                >
                  {DURACIONES.map(d => (
                    <option key={d.value} value={d.value} className="bg-[#161410]">{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Jurisdicción / Ley aplicable
                </label>
                <input
                  type="text"
                  value={jurisdiccion}
                  onChange={e => setJurisdiccion(e.target.value)}
                  placeholder="Ej: Chile, España, Argentina..."
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
                />
              </div>
            </div>

            {/* Cláusulas adicionales */}
            <div>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">
                Cláusulas adicionales
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'noCompetencia', label: 'No competencia', value: noCompetencia, set: setNoCompetencia },
                  { key: 'penalizacion', label: 'Cláusula penal por incumplimiento', value: penalizacion, set: setPenalizacion },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => opt.set(!opt.value)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        opt.value ? 'bg-avocat-gold border-avocat-gold' : 'border-[#3a3630] bg-[#161410]'
                      }`}
                    >
                      {opt.value && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="#161410" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] font-sans text-[#c8c0ac]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-[12px] text-red-400">{error}</p>}

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#6b6050]">
                Buscará NDAs previos en tu repositorio para usarlos como referencia
              </p>
              <Button variant="BtnGold" size="md" loading={generating} onClick={handleGenerate}>
                Generar NDA
              </Button>
            </div>
          </div>

          {/* Repository check result */}
          {repoStatus !== null && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[12px] font-sans ${
              repoStatus.found > 0
                ? 'bg-avocat-gold/5 border-avocat-gold/20 text-avocat-gold/80'
                : 'bg-[#1e1c16] border-[#2e2b20] text-[#6b6050]'
            }`}>
              <span>{repoStatus.found > 0 ? '📂' : '🔍'}</span>
              {repoStatus.found > 0
                ? `${repoStatus.found} NDA${repoStatus.found > 1 ? 's' : ''} previo${repoStatus.found > 1 ? 's' : ''} encontrado${repoStatus.found > 1 ? 's' : ''}: ${repoStatus.names.join(', ')} — usados como referencia`
                : 'No se encontraron NDAs previos en el repositorio — generando desde plantilla estándar'}
            </div>
          )}

          {/* Streaming result */}
          {result && (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2e2b20] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-sans font-semibold text-[#e8d4a0]">{ndaTitle}</span>
                  {saved && (
                    <span className="text-[10px] bg-avocat-gold/10 border border-avocat-gold/20 text-avocat-gold/70 px-2 py-0.5 rounded-full">
                      Guardado en documentos
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="BtnGhost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(result)}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="BtnOutlineDark"
                    size="sm"
                    onClick={() => downloadAsWord(result, ndaTitle)}
                  >
                    Word
                  </Button>
                  <Button
                    variant="BtnOutlineDark"
                    size="sm"
                    onClick={() => downloadAsPdf(result, ndaTitle)}
                  >
                    PDF
                  </Button>
                </div>
              </div>
              <pre className="px-5 py-4 text-[12px] font-sans text-[#c8c0ac] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto">
                {result}
                {generating && (
                  <span className="inline-block w-1 h-3 bg-avocat-gold animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
