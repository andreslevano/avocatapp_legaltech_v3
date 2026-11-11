'use client';

// Generador de contrato de servicios — MOBIFORWORK template (src/lib/org-templates/mobiforwork-services.ts).
// Same flow as the NDA generator: form → deterministic document (template text verbatim) → Word + PDF
// saved in Documentos → Firmar y enviar con DocuSign. Only for users of that organisation.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { buildPdfBlob, buildWordBlob, downloadAsPdf, downloadAsWord, type DocMeta } from '@/lib/agent-export';
import { saveDocumentToStorage } from '@/lib/storage-client';
import { getClients, type ClientDoc } from '@/lib/firestore';
import SignAndSendButton from '@/components/signatures/SignAndSendButton';
import { takeSignResume } from '@/lib/signatures/client';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { MFW_SERVICES_TEMPLATE, renderMfwServices, type MfwServicesInput } from '@/lib/org-templates/mobiforwork-services';
import { madridToday } from '@/lib/contracts/dates';
import type { Currency } from '@/lib/org-templates/spanish-numbers';

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const LABEL = 'block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5';
const META: DocMeta = { authorName: MFW_SERVICES_TEMPLATE.company, authorNif: `CIF ${MFW_SERVICES_TEMPLATE.cif}` };

export default function ServicesContractPage() {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const enabled = orgNdaTemplateFor(user) === 'mobilityforwork';

  const [fechaContrato, setFechaContrato] = useState(madridToday());
  const [colab, setColab] = useState<MfwServicesInput['colaborador']>({});
  const [servicio, setServicio] = useState<string>(MFW_SERVICES_TEMPLATE.defaultService);
  const [duracion, setDuracion] = useState<string>(MFW_SERVICES_TEMPLATE.defaultDuration);
  const [inicioPool, setInicioPool] = useState(madridToday());
  const [meses, setMeses] = useState(String(MFW_SERVICES_TEMPLATE.defaultInitialMonths));
  const [tarifa, setTarifa] = useState('');
  const [moneda, setMoneda] = useState<Currency>(MFW_SERVICES_TEMPLATE.defaultCurrency);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [clientId, setClientId] = useState('');

  const [result, setResult] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resumeSign, setResumeSign] = useState(false);

  useEffect(() => { if (user?.uid) getClients(user.uid).then(setClients).catch(() => {}); }, [user?.uid]);

  // Template data kept out of the code (LA EMPRESA's representative DNI).
  const [empresaDni, setEmpresaDni] = useState<string | null>(null);
  useEffect(() => {
    if (!user || !enabled) return;
    user.getIdToken()
      .then(t => fetch(`/api/org-templates/${MFW_SERVICES_TEMPLATE.id}`, { headers: { Authorization: `Bearer ${t}` } }))
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEmpresaDni((d?.fixed?.representativeDni as string | undefined) ?? null))
      .catch(() => {});
  }, [user, enabled]);

  // Back from connecting DocuSign (returnTo=/tools/contrato-servicios): restore and reopen the sheet.
  useEffect(() => {
    const ds = new URLSearchParams(window.location.search).get('ds');
    if (!ds) return;
    const resume = takeSignResume();
    if (resume?.markdown) {
      setResult(resume.markdown);
      setSavedDocId(resume.documentId);
      setDocTitle(resume.title);
      setColab(c => ({ ...c, nombre: resume.counterparty.name, email: resume.counterparty.email }));
      setResumeSign(ds === 'connected');
    }
    if (ds !== 'connected') setNotice(ds === 'cancelled' ? 'Conexión con DocuSign cancelada.' : 'No pudimos conectar con DocuSign.');
    router.replace('/tools/contrato-servicios');
  }, [router]);

  if (!enabled) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader title="Generador de contrato de servicios" />
        <p className="p-6 text-[13px] text-[#6b6050]">Esta herramienta usa la plantilla de tu organización y no está disponible para tu cuenta.</p>
      </div>
    );
  }

  const setC = (p: Partial<MfwServicesInput['colaborador']>) => setColab(c => ({ ...c, ...p }));
  const fillFromClient = (id: string) => {
    setClientId(id);
    const c = clients.find(x => x.id === id);
    if (!c) return;
    setColab({
      nombre: c.name, domicilio: c.address || '', email: c.email || '',
      documento: c.idNumber ? `${c.idType || ''} ${c.idNumber}`.trim() : '',
    });
  };

  const title = `Contrato de servicios — ${MFW_SERVICES_TEMPLATE.company} / ${colab.nombre?.trim() || 'Colaborador'}`;

  const generate = async () => {
    if (!user) return;
    if (!colab.nombre?.trim()) return setError('Indica el nombre del colaborador.');
    const rate = Number(tarifa.replace(',', '.'));
    if (tarifa.trim() && !(rate > 0)) return setError('La tarifa por hora no es válida.');
    const m = Number(meses);
    if (!Number.isInteger(m) || m < 1 || m > 120) return setError('La vigencia inicial debe ser un número de meses (1–120).');
    setError(''); setNotice(''); setSavedDocId(null); setResumeSign(false);
    setGenerating(true);
    try {
      const md = renderMfwServices({
        fechaContrato, colaborador: colab, servicio, duracion, inicioPool, mesesIniciales: m,
        tarifaHora: tarifa.trim() ? rate : null, moneda, empresaDni,
      });
      setResult(md);
      setDocTitle(title);
      const fileBase = `Contrato_Servicios_MOBIFORWORK_${colab.nombre!.trim()}`.replace(/\s+/g, '_').slice(0, 60);
      const { blob } = buildWordBlob(md, fileBase, undefined, META);
      const pdf = await buildPdfBlob(md, fileBase, undefined, META).catch(() => null);
      const record = await saveDocumentToStorage({
        userId: user.uid, plan: userDoc.plan ?? 'Abogados', blob, name: `${fileBase}.doc`,
        caseId: null, source: 'generated', pdfBlob: pdf?.blob ?? undefined,
      });
      setSavedDocId(record.id);
      user.getIdToken().then(token => fetch('/api/documents/embed', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId: record.id, text: md.slice(0, 12000) }),
      })).catch(() => {});
    } catch (e) {
      setError((e as Error).message || 'No se pudo generar el contrato.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Generador de contrato de servicios"
        subtitle="Contrato de Prestación de Servicios · plantilla de MOBIFORWORK"
        actions={<Link href="/tools"><Button variant="BtnGhost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-6">
            <div className="rounded-lg border border-avocat-gold/30 bg-avocat-gold/5 px-4 py-3 space-y-1">
              <p className="text-[12px] font-semibold text-avocat-gold">Plantilla de {MFW_SERVICES_TEMPLATE.company}</p>
              <p className="text-[12px] text-[#c8c0ac]">El contrato se genera con el texto de la plantilla, sin cambios en sus cláusulas. Solo completas los datos del colaborador y las condiciones económicas.</p>
              <p className="text-[11px] text-[#6b6050]">
                Fijado por la plantilla: LA EMPRESA (Félix Dia Morales, CIF {MFW_SERVICES_TEMPLATE.cif}) · régimen mercantil · pago a 30 días ·
                confidencialidad · propiedad intelectual para LA EMPRESA · preaviso de 30 días · no competencia 12 meses (40 %) · Juzgados de Barbastro.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-avocat-gold/70">El colaborador (persona física)</p>
                {clients.length > 0 && (
                  <select value={clientId} onChange={e => fillFromClient(e.target.value)}
                    className="text-[11px] bg-[#161410] border border-[#2e2b20] text-[#6b6050] px-2.5 py-1 rounded-md focus:outline-none">
                    <option value="">Seleccionar cliente…</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input className={INPUT} placeholder="Nombre completo *" value={colab.nombre ?? ''} onChange={e => setC({ nombre: e.target.value })} />
                <input className={INPUT} placeholder="Nacionalidad (p. ej. española)" value={colab.nacionalidad ?? ''} onChange={e => setC({ nacionalidad: e.target.value })} />
                <input className={INPUT} placeholder="Documento (DNI, pasaporte, C.C.) y número" value={colab.documento ?? ''} onChange={e => setC({ documento: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input className={`${INPUT} sm:col-span-2`} placeholder="Domicilio" value={colab.domicilio ?? ''} onChange={e => setC({ domicilio: e.target.value })} />
                <input className={INPUT} type="email" placeholder="Email (para la firma)" value={colab.email ?? ''} onChange={e => setC({ email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Fecha del contrato</label>
                <input type="date" className={INPUT} value={fechaContrato} onChange={e => setFechaContrato(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Servicios (cláusula primera)</label>
                <input className={INPUT} value={servicio} onChange={e => setServicio(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Duración (cláusula segunda)</label>
                <input className={INPUT} value={duracion} onChange={e => setDuracion(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Inicio del Pool de Recursos</label>
                <input type="date" className={INPUT} value={inicioPool} onChange={e => setInicioPool(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Vigencia inicial (meses)</label>
                <input type="number" min={1} max={120} className={INPUT} value={meses} onChange={e => setMeses(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Tarifa por hora</label>
                <div className="flex gap-2">
                  <input inputMode="decimal" className={INPUT} placeholder="p. ej. 35" value={tarifa} onChange={e => setTarifa(e.target.value)} />
                  <select className={`${INPUT} max-w-[90px]`} value={moneda} onChange={e => setMoneda(e.target.value as Currency)}>
                    <option value="USD" className="bg-[#161410]">USD</option>
                    <option value="EUR" className="bg-[#161410]">EUR</option>
                  </select>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#6b6050]">Los datos que dejes vacíos aparecerán entre corchetes en el documento para completarlos antes de firmar. Importes y plazos se escriben en letra y número.</p>

            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {notice && <p className="text-[12px] text-amber-400">{notice}</p>}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#6b6050]">El contrato se guardará automáticamente en tus documentos (Word y PDF).</p>
              <Button variant="BtnGold" size="md" loading={generating} onClick={generate}>Generar contrato</Button>
            </div>
          </div>

          {result && (
            <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2e2b20] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#e8d4a0]">{docTitle || title}</span>
                  {savedDocId && <span className="text-[10px] bg-avocat-gold/10 border border-avocat-gold/20 text-avocat-gold/70 px-2 py-0.5 rounded-full">Guardado en documentos</span>}
                </div>
                <div className="flex gap-2">
                  {savedDocId && !generating && (
                    <SignAndSendButton
                      documentId={savedDocId}
                      markdown={result}
                      title={docTitle || title}
                      defaultCounterparty={{ name: colab.nombre ?? '', email: colab.email ?? '' }}
                      language="es"
                      returnTo="/tools/contrato-servicios"
                      autoOpen={resumeSign}
                    />
                  )}
                  <Button variant="BtnGhost" size="sm" onClick={() => downloadAsWord(result, docTitle || title, undefined, META)}>Word</Button>
                  <Button variant="BtnGhost" size="sm" onClick={() => downloadAsPdf(result, docTitle || title, undefined, META)}>PDF</Button>
                </div>
              </div>
              <pre className="px-5 py-4 text-[12px] text-[#c8c0ac] whitespace-pre-wrap font-sans leading-relaxed max-h-[60vh] overflow-y-auto">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
