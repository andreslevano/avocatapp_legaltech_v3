'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { downloadAsWord, downloadAsPdf, buildWordBlob } from '@/lib/agent-export';
import { saveDocumentToStorage, getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { getClients, type ClientDoc } from '@/lib/firestore';

type Tipo = 'unilateral' | 'bilateral';
type Lang = 'es' | 'en';

interface Parte {
  nombre: string;
  empresa: string;
  cargo: string;
  idType: string;
  idNumber: string;
  address: string;
}

const EMPTY_PARTE: Parte = { nombre: '', empresa: '', cargo: '', idType: 'RUT', idNumber: '', address: '' };

const DURACIONES = [
  { value: '1 año', label: '1 año / 1 year' },
  { value: '2 años', label: '2 años / 2 years' },
  { value: '3 años', label: '3 años / 3 years' },
  { value: '5 años', label: '5 años / 5 years' },
  { value: 'Indefinida mientras exista la relación comercial', label: 'Indefinida / Indefinite' },
];

const ID_TYPES = ['RUT', 'DNI', 'Pasaporte', 'Cédula', 'CUIT', 'NIF', 'Otro'];

const INPUT_CLS = 'bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

interface ParteFieldsProps {
  label: string;
  value: Parte;
  onChange: (p: Parte) => void;
  headerAction?: React.ReactNode;
}

function ParteFields({ label, value, onChange, headerAction }: ParteFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-avocat-gold/70">{label}</p>
        {headerAction}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input type="text" placeholder="Nombre completo *" value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })} className={INPUT_CLS} />
        <input type="text" placeholder="Empresa / Organización" value={value.empresa}
          onChange={e => onChange({ ...value, empresa: e.target.value })} className={INPUT_CLS} />
        <input type="text" placeholder="Cargo / Representación" value={value.cargo}
          onChange={e => onChange({ ...value, cargo: e.target.value })} className={INPUT_CLS} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select value={value.idType} onChange={e => onChange({ ...value, idType: e.target.value })}
          className={INPUT_CLS}>
          {ID_TYPES.map(t => <option key={t} value={t} className="bg-[#161410]">{t}</option>)}
        </select>
        <input type="text" placeholder="Número de identificación" value={value.idNumber}
          onChange={e => onChange({ ...value, idNumber: e.target.value })} className={INPUT_CLS} />
        <input type="text" placeholder="Dirección completa" value={value.address}
          onChange={e => onChange({ ...value, address: e.target.value })} className={INPUT_CLS} />
      </div>
    </div>
  );
}

export default function NdaPage() {
  const { user, userDoc } = useAppAuth();
  const ud = userDoc as Record<string, unknown>;

  // Form state
  const [language, setLanguage]       = useState<Lang>('es');
  const [tipo, setTipo]               = useState<Tipo>('unilateral');
  const [divulgante, setDivulgante]   = useState<Parte>(EMPTY_PARTE);
  const [receptora, setReceptora]     = useState<Parte>(EMPTY_PARTE);
  const [objeto, setObjeto]           = useState('');
  const [duracion, setDuracion]       = useState('2 años');
  const [jurisdiccion, setJurisdiccion] = useState(
    (ud.country as string) || 'Chile'
  );
  const [noCompetencia, setNoCompetencia] = useState(false);
  const [penalizacion, setPenalizacion]   = useState(false);

  // Reference doc
  const [userDocs, setUserDocs]         = useState<DocumentRecord[]>([]);
  const [referenceDocId, setReferenceDocId] = useState('');

  // Client selector for receptora
  const [clients, setClients]           = useState<ClientDoc[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Status
  const [generating, setGenerating]   = useState(false);
  const [result, setResult]           = useState('');
  const [error, setError]             = useState('');
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserDocuments(user.uid).then(setUserDocs).catch(() => {});
    getClients(user.uid).then(setClients).catch(() => {});
  }, [user?.uid]);

  const fillFromProfile = () => {
    setDivulgante({
      nombre: (ud.displayName as string) || userDoc.displayName || '',
      empresa: (ud.legalCompanyName as string) || '',
      cargo: (ud.legalRepresentativeCapacity as string) || '',
      idType: (ud.legalIdType as string) || 'RUT',
      idNumber: (ud.legalIdNumber as string) || '',
      address: (ud.legalAddress as string) || '',
    });
  };

  const fillFromClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setReceptora({
      nombre: client.name,
      empresa: client.company || '',
      cargo: client.representativeCapacity || '',
      idType: client.idType || 'RUT',
      idNumber: client.idNumber || '',
      address: client.address || '',
    });
  };

  const handleGenerate = async () => {
    if (!divulgante.nombre.trim()) return setError('Ingresa el nombre de la parte divulgante.');
    if (!receptora.nombre.trim())  return setError('Ingresa el nombre de la parte receptora.');
    if (!objeto.trim())            return setError('Describe el objeto de la confidencialidad.');

    setError('');
    setResult('');
    setSaved(false);
    setGenerating(true);

    try {
      const idToken = await user.getIdToken();

      const selectedDoc = userDocs.find(d => d.id === referenceDocId);

      const res = await fetch('/api/tools/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          tipo, divulgante, receptora, objeto, duracion, jurisdiccion,
          noCompetencia, penalizacion, language,
          referenceDocUrl: selectedDoc?.downloadUrl || undefined,
          referenceDocName: selectedDoc?.name || undefined,
        }),
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

            if (ev.type === 'text') {
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

            {/* Language + Tipo row */}
            <div className="flex flex-wrap gap-4 items-start">
              {/* Language toggle */}
              <div>
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">
                  Idioma / Language
                </p>
                <div className="flex gap-2">
                  {(['es', 'en'] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-sans border transition-colors ${
                        language === l
                          ? 'border-avocat-gold/50 bg-avocat-gold/10 text-avocat-gold'
                          : 'border-[#2e2b20] text-[#6b6050] hover:text-[#c8c0ac]'
                      }`}>
                      {l === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-2">
                  Tipo de NDA
                </p>
                <div className="flex gap-2">
                  {(['unilateral', 'bilateral'] as Tipo[]).map(t => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-sans border transition-colors ${
                        tipo === t
                          ? 'border-avocat-gold/50 bg-avocat-gold/10 text-avocat-gold'
                          : 'border-[#2e2b20] text-[#6b6050] hover:text-[#c8c0ac]'
                      }`}>
                      {t === 'unilateral' ? 'Unilateral' : 'Bilateral / Mutuo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Partes */}
            <div className="space-y-5">
              <ParteFields
                label="Parte divulgante (quien comparte información)"
                value={divulgante}
                onChange={setDivulgante}
                headerAction={
                  <button
                    type="button"
                    onClick={fillFromProfile}
                    className="text-[11px] font-sans text-avocat-gold/70 hover:text-avocat-gold border border-avocat-gold/20 hover:border-avocat-gold/40 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Usar mis datos de perfil
                  </button>
                }
              />

              <ParteFields
                label="Parte receptora (quien recibe y se obliga)"
                value={receptora}
                onChange={setReceptora}
                headerAction={
                  clients.length > 0 ? (
                    <select
                      value={selectedClientId}
                      onChange={e => fillFromClient(e.target.value)}
                      className="text-[11px] font-sans bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 text-[#6b6050] px-2.5 py-1 rounded-md transition-colors focus:outline-none"
                    >
                      <option value="">Seleccionar cliente…</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#161410]">
                          {c.name}{c.company ? ` — ${c.company}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : null
                }
              />
            </div>

            {/* Objeto */}
            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                Objeto de la confidencialidad *
              </label>
              <textarea rows={4} value={objeto} onChange={e => setObjeto(e.target.value)}
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
                <select value={duracion} onChange={e => setDuracion(e.target.value)}
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40">
                  {DURACIONES.map(d => (
                    <option key={d.value} value={d.value} className="bg-[#161410]">{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Jurisdicción / Ley aplicable
                </label>
                <input type="text" value={jurisdiccion} onChange={e => setJurisdiccion(e.target.value)}
                  placeholder="Ej: Chile, España, Argentina..."
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
                />
              </div>
            </div>

            {/* Reference document */}
            {userDocs.length > 0 && (
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5">
                  Documento de referencia (opcional)
                </label>
                <select value={referenceDocId} onChange={e => setReferenceDocId(e.target.value)}
                  className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-2.5 text-[13px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40">
                  <option value="" className="bg-[#161410]">Sin referencia</option>
                  {userDocs.map(d => (
                    <option key={d.id} value={d.id} className="bg-[#161410]">{d.name}</option>
                  ))}
                </select>
                {referenceDocId && (
                  <p className="mt-1 text-[11px] font-sans text-[#6b6050]">
                    La IA usará este documento como referencia de estilo y estructura.
                  </p>
                )}
              </div>
            )}

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
                    <div onClick={() => opt.set(!opt.value)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        opt.value ? 'bg-avocat-gold border-avocat-gold' : 'border-[#3a3630] bg-[#161410]'
                      }`}>
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
                El NDA se guardará automáticamente en tu repositorio de documentos
              </p>
              <Button variant="BtnGold" size="md" loading={generating} onClick={handleGenerate}>
                Generar NDA
              </Button>
            </div>
          </div>

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
                  <Button variant="BtnGhost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>
                    Copiar
                  </Button>
                  <Button variant="BtnOutlineDark" size="sm" onClick={() => downloadAsWord(result, ndaTitle)}>
                    Word
                  </Button>
                  <Button variant="BtnOutlineDark" size="sm" onClick={() => downloadAsPdf(result, ndaTitle)}>
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
