'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { downloadAsWord, downloadAsPdf, buildWordBlob, buildPdfBlob, type DocMeta } from '@/lib/agent-export';
import { saveDocumentToStorage, getUserDocuments, type DocumentRecord } from '@/lib/storage-client';
import { getClients, type ClientDoc } from '@/lib/firestore';
import { buildDocHtml } from '@/lib/doc-html';
import SignAndSendButton from '@/components/signatures/SignAndSendButton';
import { takeSignResume } from '@/lib/signatures/client';
import { canUseContracts } from '@/lib/contracts/config';
import { createNdaContract, watchContract } from '@/lib/contracts/client';
import { COUNTRIES } from '@/lib/contracts/types';
import { getNdaCheck } from '@/lib/legal/check-client';
import { updateInstructions } from '@/lib/legal/check';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { MFW_CONTRACT_DEFAULTS, MFW_NDA_TEMPLATE, renderMfwNda, type MfwReceptor } from '@/lib/org-templates/mobiforwork-nda';
import MfwNdaFields from '@/components/org-templates/MfwNdaFields';
import { clientToMfwReceptor, clientToNdaParte } from '@/lib/data-requests/core';
import { ndaDocFor } from '@/lib/data-requests/catalog';
import { linkRequestDocument, readRequestParams } from '@/lib/data-requests/client';

type Tipo = 'unilateral' | 'bilateral';
type Lang = 'es' | 'en';

interface Parte {
  nombre: string;
  empresa: string;
  cargo: string;
  idType: string;
  idNumber: string;
  address: string;
  email: string;      // only used for "Firmar y enviar" (not sent to the generator)
}

const EMPTY_PARTE: Parte = { nombre: '', empresa: '', cargo: '', idType: 'RUT', idNumber: '', address: '', email: '' };

const DURACIONES = [
  { value: '1 año', label: '1 año / 1 year' },
  { value: '2 años', label: '2 años / 2 years' },
  { value: '3 años', label: '3 años / 3 years' },
  { value: '5 años', label: '5 años / 5 years' },
  { value: 'Indefinida mientras exista la relación comercial', label: 'Indefinida / Indefinite' },
];

const ID_TYPES = ['RUT', 'DNI', 'Pasaporte', 'Cédula', 'CUIT', 'NIF', 'Otro'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const stripEmail = ({ email, ...rest }: Parte) => rest;

const INPUT_CLS = 'bg-bg border border-border rounded-lg px-3 py-2.5 text-small font-sans text-text  focus:border-accent-border';

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
        <p className="text-label font-sans font-semibold uppercase tracking-widest text-accent-text">{label}</p>
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
          {ID_TYPES.map(t => <option key={t} value={t} className="bg-bg">{t}</option>)}
        </select>
        <input type="text" placeholder="Número de identificación" value={value.idNumber}
          onChange={e => onChange({ ...value, idNumber: e.target.value })} className={INPUT_CLS} />
        <input type="text" placeholder="Dirección completa" value={value.address}
          onChange={e => onChange({ ...value, address: e.target.value })} className={INPUT_CLS} />
      </div>
      <input type="email" placeholder="Email (para enviar a firmar)" value={value.email}
        onChange={e => onChange({ ...value, email: e.target.value })} className={`${INPUT_CLS} w-full sm:w-1/3`} />
    </div>
  );
}

export default function NdaPage() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const ud = userDoc as unknown as Record<string, unknown>;
  const signatureUrl = (ud.signatureUrl as string) || undefined;
  const meta: DocMeta = {
    authorName: (ud.legalCompanyName as string) || userDoc.displayName || '',
    authorNif: (ud.legalIdNumber as string)
      ? `${(ud.legalIdType as string) || ''} ${(ud.legalIdNumber as string)}`.trim()
      : undefined,
  };

  // Form state
  const [language, setLanguage]       = useState<Lang>('es');
  const [tipo, setTipo]               = useState<Tipo>('unilateral');
  const [divulgante, setDivulgante]   = useState<Parte>(EMPTY_PARTE);
  const [receptora, setReceptora]     = useState<Parte>(EMPTY_PARTE);
  const [objeto, setObjeto]           = useState('');
  // Organisation template (MOBIFORWORK, lawyer-validated): deterministic text, only these fields vary.
  const orgTpl = orgNdaTemplateFor(user);
  const [mfwReceptor, setMfwReceptor] = useState<MfwReceptor>({ tipo: 'sociedad' });
  const [duracion, setDuracion]       = useState('2 años');
  const [jurisdiccion, setJurisdiccion] = useState(
    (ud.country as string) || 'Chile'
  );
  const [noCompetencia, setNoCompetencia]       = useState(false);
  const [penalizacion, setPenalizacion]         = useState(false);
  const [penalizacionMonto, setPenalizacionMonto] = useState('5.000');
  const [ciudadJurisdiccion, setCiudadJurisdiccion] = useState('');

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
  const [savedDocId, setSavedDocId]   = useState<string | null>(null);
  const [docTitle, setDocTitle]       = useState('');
  const [resumeSign, setResumeSign]   = useState(false);
  const [notice, setNotice]           = useState('');

  // Back from connecting DocuSign (returnTo=/tools/nda): restore the generated NDA and reopen the sheet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ds = params.get('ds');
    if (!ds) return;
    const resume = takeSignResume();
    if (resume?.markdown) {
      setResult(resume.markdown);
      setSavedDocId(resume.documentId);
      setSaved(true);
      setDocTitle(resume.title);
      setReceptora(r => ({ ...r, nombre: resume.counterparty.name, email: resume.counterparty.email }));
      setResumeSign(ds === 'connected');
    }
    if (ds !== 'connected') setNotice(ds === 'cancelled' ? 'Conexión con DocuSign cancelada.' : 'No pudimos conectar con DocuSign.');
    router.replace('/tools/nda');
  }, [router]);

  // F3 "Renovar": /tools/nda?renew=<contractId> prefills the parties, term and jurisdiction of the
  // expiring NDA; the new contract record replaces it (old one → "Renovado").
  const contractsOn = canUseContracts(userDoc.plan, user);
  const [renewsContractId, setRenewsContractId] = useState<string | null>(null);
  // F2 "Generar versión actualizada": ?renew=<contractId>&check=<checkId> also carries the legal fixes.
  const [legalUpdates, setLegalUpdates] = useState<string[]>([]);
  useEffect(() => {
    const checkId = new URLSearchParams(window.location.search).get('check');
    if (!checkId || !contractsOn) return;
    getNdaCheck(checkId).then(ch => { if (ch) setLegalUpdates(updateInstructions(ch.findings)); }).catch(() => {});
  }, [contractsOn]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('renew');
    if (!id || !contractsOn) return;
    return watchContract(id, c => {
      if (!c) return;
      setRenewsContractId(c.id);
      if (c.ndaKind) setTipo(c.ndaKind);
      setLanguage(c.language);
      const toParte = (i: number): Parte => {
        const p = c.parties[i];
        return p ? { ...EMPTY_PARTE, nombre: p.name, empresa: p.company ?? '', idType: p.idType || EMPTY_PARTE.idType, idNumber: p.idNumber ?? '', email: p.email ?? '' } : EMPTY_PARTE;
      };
      setDivulgante(toParte(0));
      setReceptora(toParte(1));
      const rp = c.parties[1];
      if (rp) setMfwReceptor({ tipo: rp.company ? 'sociedad' : 'persona', razonSocial: rp.company ?? '', nombre: rp.name, email: rp.email ?? '' });
      if (c.term?.durationText && DURACIONES.some(d => d.value === c.term.durationText)) setDuracion(c.term.durationText);
      if (c.governingLaw) setJurisdiccion(c.governingLaw);
      else if (c.jurisdiction?.country) setJurisdiccion(COUNTRIES.find(x => x.code === c.jurisdiction.country)?.label ?? jurisdiccion);
      if (c.jurisdiction?.region) setCiudadJurisdiccion(c.jurisdiction.region);
      if (c.purpose) setObjeto(c.purpose);
      setNotice(new URLSearchParams(window.location.search).get('check')
        ? `Nueva versión de «${c.title}» con los ajustes legales. Revisa los datos y genera el NDA.`
        : `Renovación de «${c.title}». Revisa los datos y genera el nuevo NDA.`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractsOn]);

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
      email: user?.email || '',
    });
  };

  const fillFromClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setMfwReceptor(clientToMfwReceptor(client));
    setReceptora(clientToNdaParte(client));
  };

  // "Preparar NDA" from Clientes (?clientId=…&requestId=…): preselect the client once the list loads.
  const [requestParams] = useState(readRequestParams);
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !requestParams.clientId || !clients.some(c => c.id === requestParams.clientId)) return;
    fillFromClient(requestParams.clientId);
    setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, prefilled, requestParams.clientId]);

  const handleGenerate = async () => {
    if (!divulgante.nombre.trim()) return setError('Ingresa el nombre de la parte divulgante.');
    if (!receptora.nombre.trim())  return setError('Ingresa el nombre de la parte receptora.');
    if (!objeto.trim())            return setError('Describe el objeto de la confidencialidad.');

    setError('');
    setResult('');
    setSaved(false);
    setSavedDocId(null);
    setResumeSign(false);
    setNotice('');
    setDocTitle(ndaTitle);
    setGenerating(true);

    try {
      const idToken = await user.getIdToken();

      const selectedDoc = userDocs.find(d => d.id === referenceDocId);

      const res = await fetch('/api/tools/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          tipo, divulgante: stripEmail(divulgante), receptora: stripEmail(receptora), objeto, duracion, jurisdiccion,
          ciudadJurisdiccion: ciudadJurisdiccion || undefined,
          noCompetencia, penalizacion,
          penalizacionMonto: penalizacion ? penalizacionMonto : undefined,
          language,
          referenceDocUrl: selectedDoc?.downloadUrl || undefined,
          referenceDocName: selectedDoc?.name || undefined,
          legalUpdates: legalUpdates.length ? legalUpdates : undefined,
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

      await saveGenerated(accumulated);
    } catch (err) {
      setError((err as Error).message ?? 'Error al generar el NDA. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  /** MOBIFORWORK: the validated template, filled in — no AI drafting, so clauses never drift. */
  const handleGenerateFromTemplate = async () => {
    const r = mfwReceptor;
    if (r.tipo === 'sociedad' && !r.razonSocial?.trim()) return setError('Indica la razón social de la Parte Receptora.');
    if (!r.nombre?.trim()) return setError(r.tipo === 'sociedad' ? 'Indica el nombre del representante.' : 'Indica el nombre de la Parte Receptora.');
    if (!objeto.trim()) return setError('Describe los Productos Protegidos.');
    setError(''); setSaved(false); setSavedDocId(null); setResumeSign(false); setNotice('');
    setDocTitle(ndaTitle);
    setGenerating(true);
    try {
      const md = renderMfwNda({ receptor: r, productos: objeto });
      setResult(md);
      await saveGenerated(md);
    } catch (err) {
      setError((err as Error).message ?? 'Error al generar el NDA.');
    } finally {
      setGenerating(false);
    }
  };

  /** Word + PDF to the documents repository, contract record (F0) and search index. */
  const saveGenerated = async (accumulated: string) => {
      if (accumulated.length > 200) {
        try {
          const ndaName = (orgTpl
            ? `NDA_MOBIFORWORK_${mfwReceptor.tipo === 'sociedad' ? mfwReceptor.razonSocial : mfwReceptor.nombre}`
            : `NDA_${divulgante.empresa || divulgante.nombre}_${receptora.empresa || receptora.nombre}`).replace(/\s+/g, '_').slice(0, 60);
          // The template's first signature block is MOBIFORWORK's CEO: never stamp the user's own signature there.
          const sig = orgTpl ? undefined : signatureUrl;
          const docMeta: DocMeta = orgTpl ? { authorName: MFW_NDA_TEMPLATE.company, authorNif: `CIF ${MFW_NDA_TEMPLATE.cif}` } : meta;
          const { blob } = buildWordBlob(accumulated, ndaName, sig, docMeta);
          // Generate PDF in parallel (fire — don't block if it fails)
          const pdfBlobResult = await buildPdfBlob(accumulated, ndaName, sig, docMeta).catch(() => null);
          const record = await saveDocumentToStorage({
            userId: user.uid,
            plan: userDoc.plan ?? 'Autoservicio',
            blob,
            name: `${ndaName}.doc`,
            caseId: null,
            source: 'generated',
            pdfBlob: pdfBlobResult?.blob ?? undefined,
          });
          setSaved(true);
          setSavedDocId(record.id);
          if (requestParams.requestId) linkRequestDocument(user, requestParams.requestId, ndaDocFor(user), record.id);
          // F0: structured contract record from the form (dates, parties) for expiry alerts.
          if (contractsOn) {
            createNdaContract(user, orgTpl ? {
              documentId: record.id, title: ndaTitle, tipo: 'unilateral', language: 'es', objeto,
              divulgante: { nombre: 'Félix Dia Morales', empresa: MFW_NDA_TEMPLATE.company, idType: 'CIF', idNumber: MFW_NDA_TEMPLATE.cif },
              receptora: { nombre: mfwReceptor.nombre ?? '', empresa: mfwReceptor.tipo === 'sociedad' ? mfwReceptor.razonSocial : '', email: mfwReceptor.email },
              ...MFW_CONTRACT_DEFAULTS, clientId: selectedClientId || null, renewsContractId,
              supersedes: legalUpdates.length > 0,
            } : {
              documentId: record.id, title: ndaTitle, tipo, language, objeto,
              divulgante: stripEmail(divulgante), receptora: { ...stripEmail(receptora), email: receptora.email },
              duracion, jurisdiccion, ciudadJurisdiccion: ciudadJurisdiccion || undefined,
              noCompetencia, penalizacion, clientId: selectedClientId || null, renewsContractId,
              supersedes: legalUpdates.length > 0,
            }).catch(err => console.warn('[nda] contract record', (err as Error).message));
          }
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
  };

  const ndaTitle = orgTpl
    ? `NDA — ${MFW_NDA_TEMPLATE.company} / ${(mfwReceptor.tipo === 'sociedad' ? mfwReceptor.razonSocial : mfwReceptor.nombre) || 'Receptora'}`
    : `NDA — ${divulgante.empresa || divulgante.nombre || 'Divulgante'} / ${receptora.empresa || receptora.nombre || 'Receptora'}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Generador de NDA"
        subtitle="Acuerdo de Confidencialidad asistido por IA"
        actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Form */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-6">

            {orgTpl ? (
              <MfwNdaFields receptor={mfwReceptor} onReceptor={setMfwReceptor} productos={objeto} onProductos={setObjeto}
                clients={clients} selectedClientId={selectedClientId} onClient={fillFromClient} />
            ) : (<>
            {/* Language + Tipo row */}
            <div className="flex flex-wrap gap-4 items-start">
              {/* Language toggle */}
              <div>
                <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">
                  Idioma / Language
                </p>
                <div className="flex gap-2">
                  {(['es', 'en'] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className={`px-3 py-1.5 rounded-lg text-caption font-sans border transition-colors ${
                        language === l
                          ? 'border-accent-border bg-accent-subtle text-accent-text'
                          : 'border-border text-text-muted hover:text-text'
                      }`}>
                      {l === 'es' ? 'Español' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2">
                  Tipo de NDA
                </p>
                <div className="flex gap-2">
                  {(['unilateral', 'bilateral'] as Tipo[]).map(t => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`px-3 py-1.5 rounded-lg text-caption font-sans border transition-colors ${
                        tipo === t
                          ? 'border-accent-border bg-accent-subtle text-accent-text'
                          : 'border-border text-text-muted hover:text-text'
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
                    className="text-caption font-sans text-accent-text hover:text-accent-text border border-accent-border hover:border-accent-border px-2.5 py-1 rounded-md transition-colors"
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
                      className="text-caption font-sans bg-bg border border-border hover:border-accent-border text-text-muted px-2.5 py-1 rounded-md transition-colors "
                    >
                      <option value="">Seleccionar cliente…</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-bg">
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
              <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                Objeto de la confidencialidad *
              </label>
              <textarea rows={4} value={objeto} onChange={e => setObjeto(e.target.value)}
                placeholder="Describe el proyecto, negociación o información que se quiere proteger.&#10;Ej: Proyecto de desarrollo de software para gestión de inventarios. Se compartirán especificaciones técnicas, código fuente, datos de clientes y proyecciones financieras con el propósito de evaluar una potencial alianza comercial."
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-small font-sans text-text  focus:border-accent-border resize-none leading-relaxed"
              />
            </div>

            {/* Duración + Jurisdicción + Ciudad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                  Duración de la confidencialidad
                </label>
                <select value={duracion} onChange={e => setDuracion(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-small font-sans text-text  focus:border-accent-border">
                  {DURACIONES.map(d => (
                    <option key={d.value} value={d.value} className="bg-bg">{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                  Jurisdicción / Ley aplicable
                </label>
                <input type="text" value={jurisdiccion} onChange={e => setJurisdiccion(e.target.value)}
                  placeholder="Ej: España, Chile, Argentina..."
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-small font-sans text-text  focus:border-accent-border"
                />
              </div>
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                  Ciudad de los tribunales
                </label>
                <input type="text" value={ciudadJurisdiccion} onChange={e => setCiudadJurisdiccion(e.target.value)}
                  placeholder={`Ej: Madrid, Barcelona…`}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-small font-sans text-text  focus:border-accent-border"
                />
              </div>
            </div>

            {/* Reference document */}
            {userDocs.length > 0 && (
              <div>
                <label className="block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                  Documento de referencia (opcional)
                </label>
                <select value={referenceDocId} onChange={e => setReferenceDocId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-small font-sans text-text  focus:border-accent-border">
                  <option value="" className="bg-bg">Sin referencia</option>
                  {userDocs.map(d => (
                    <option key={d.id} value={d.id} className="bg-bg">{d.name}</option>
                  ))}
                </select>
                {referenceDocId && (
                  <p className="mt-1 text-caption font-sans text-text-muted">
                    La IA usará este documento como referencia de estilo y estructura.
                  </p>
                )}
              </div>
            )}

            {/* Cláusulas adicionales */}
            <div>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-3">
                Cláusulas adicionales
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                {[
                  { key: 'noCompetencia', label: 'No competencia', value: noCompetencia, set: setNoCompetencia },
                  { key: 'penalizacion', label: 'Cláusula penal por incumplimiento', value: penalizacion, set: setPenalizacion },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => opt.set(!opt.value)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        opt.value ? 'bg-accent border-accent' : 'border-border-strong bg-bg'
                      }`}>
                      {opt.value && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-small font-sans text-text">{opt.label}</span>
                  </label>
                ))}
                {penalizacion && (
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-text-muted">€</span>
                    <input
                      type="text"
                      value={penalizacionMonto}
                      onChange={e => setPenalizacionMonto(e.target.value)}
                      placeholder="5.000"
                      className="w-24 bg-bg border border-border rounded-lg px-3 py-1.5 text-small font-sans text-text  focus:border-accent-border"
                    />
                    <span className="text-caption text-text-muted">por infracción</span>
                  </div>
                )}
              </div>
            </div>

            </>)}

            {error && <p className="text-caption text-danger-text">{error}</p>}
            {notice && <p className="text-caption text-warning-text">{notice}</p>}
            {legalUpdates.length > 0 && (
              <div className="rounded-lg border border-status-en-revision-border bg-info-subtle px-3 py-2 space-y-1">
                <p className="text-caption text-info-text font-medium">
                  {orgTpl
                    ? `La plantilla validada no se modifica automáticamente. Revisa estos ${legalUpdates.length} ${legalUpdates.length === 1 ? 'ajuste' : 'ajustes'} con vuestro abogado:`
                    : `Versión actualizada: se incluirán ${legalUpdates.length} ${legalUpdates.length === 1 ? 'ajuste legal' : 'ajustes legales'}`}
                </p>
                <ul className="text-caption text-text list-disc pl-4 space-y-0.5">
                  {legalUpdates.map((u, i) => <li key={i} className="line-clamp-2">{u}</li>)}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-caption text-text-muted">
                  El NDA se guardará automáticamente en tu repositorio de documentos
                </p>
                {signatureUrl && !orgTpl && (
                  <p className="text-caption text-accent-text">
                    Tu firma se incluirá en la sección de firmas del Word y PDF
                  </p>
                )}
              </div>
              <Button variant="accent" size="md" loading={generating} onClick={orgTpl ? handleGenerateFromTemplate : handleGenerate}>
                {orgTpl ? 'Generar NDA (plantilla validada)' : 'Generar NDA'}
              </Button>
            </div>
          </div>

          {/* Streaming result */}
          {result && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-small font-sans font-semibold text-text-heading">{ndaTitle}</span>
                  {saved && (
                    <span className="text-caption bg-accent-subtle border border-accent-border text-accent-text px-2 py-0.5 rounded-full">
                      Guardado en documentos
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {savedDocId && !generating && (
                    <SignAndSendButton
                      documentId={savedDocId}
                      markdown={result}
                      title={docTitle || ndaTitle}
                      defaultCounterparty={orgTpl
                        ? { name: mfwReceptor.nombre ?? '', email: mfwReceptor.email ?? '' }
                        : { name: receptora.nombre, email: receptora.email }}
                      language={language}
                      returnTo="/tools/nda"
                      autoOpen={resumeSign}
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>
                    Copiar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => downloadAsWord(result, ndaTitle, signatureUrl, meta)}>
                    Word
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => downloadAsPdf(result, ndaTitle, signatureUrl, meta)}>
                    PDF
                  </Button>
                </div>
              </div>
              {/* AI drafts only — the org template is lawyer-validated text, not AI output. */}
              {!orgTpl && <AIDisclaimer className="mx-5 mt-4" />}
              {generating ? (
                <pre className="px-5 py-4 text-caption font-sans text-text whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto">
                  {result}
                  <span className="inline-block w-1 h-3 bg-accent animate-pulse ml-0.5 align-middle" />
                </pre>
              ) : (
                // Same HTML as the Word/PDF downloads — what the lawyer sees is what gets sent.
                <div className="bg-bg p-3 sm:p-5">
                  <iframe
                    title={ndaTitle}
                    srcDoc={buildDocHtml(result, ndaTitle, signatureUrl, meta)
                      .replace('</head>', '<style>body{margin:0;padding:1.5cm 1.8cm}</style></head>')}
                    sandbox=""
                    className="w-full h-[600px] rounded-lg bg-white border-0"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
