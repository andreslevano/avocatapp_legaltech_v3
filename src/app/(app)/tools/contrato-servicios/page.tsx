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
import {
  MFW_EXTRA_CLAUSE_MAX_CHARS, MFW_SERVICES_TEMPLATE, renderMfwServices, validateMfwPayment,
  type MfwMilestone, type MfwPaymentModel, type MfwServicesInput,
} from '@/lib/org-templates/mobiforwork-services';
import { IconButton } from '@/components/ui/IconButton';
import { Plus, Trash2 } from 'lucide-react';
import { madridToday } from '@/lib/contracts/dates';
import { clientToColaborador } from '@/lib/data-requests/core';
import { linkRequestDocument, readRequestParams } from '@/lib/data-requests/client';
import type { Currency } from '@/lib/org-templates/spanish-numbers';

const INPUT = 'w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-small font-sans text-text  focus:border-accent-border';
const LABEL = 'block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-1.5';
const META: DocMeta = { authorName: MFW_SERVICES_TEMPLATE.company, authorNif: `CIF ${MFW_SERVICES_TEMPLATE.cif}` };

const MODALIDADES: { id: MfwPaymentModel; label: string }[] = [
  { id: 'horas', label: 'Por horas validadas (pool de recursos)' },
  { id: 'unico_fin', label: 'Pago único al finalizar el curso' },
  { id: 'hitos', label: 'Pagos parciales' },
];

type HitoTipo = MfwMilestone['tipo'];
interface HitoRow { valor: string; cuando: MfwMilestone['cuando']; fecha: string }
interface PactoRow { titulo: string; texto: string }

/** Spanish or plain input: "2.000" → 2000, "1.200,50" → 1200.5, "35,5" / "35.5" → 35.5; '' or invalid → NaN. */
const parseNum = (raw: string) => {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t);
};
const money = (n: number, currency: Currency) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === 'EUR' ? '€' : 'USD'}`;

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
  const [modalidad, setModalidad] = useState<MfwPaymentModel>('horas');
  const [importeTotal, setImporteTotal] = useState('');
  const [fechaFinCurso, setFechaFinCurso] = useState('');
  const [hitoTipo, setHitoTipo] = useState<HitoTipo>('porcentaje');
  const [hitos, setHitos] = useState<HitoRow[]>([]);
  const [pactos, setPactos] = useState<PactoRow[]>([]);
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

  // "Preparar contrato" from Clientes (?clientId=…&requestId=…): preselect the client once the list loads.
  const [requestParams] = useState(readRequestParams);
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !requestParams.clientId) return;
    const c = clients.find(x => x.id === requestParams.clientId);
    if (!c) return;
    setClientId(c.id);
    setColab(clientToColaborador(c));
    setPrefilled(true);
  }, [clients, prefilled, requestParams.clientId]);

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
        <p className="p-6 text-small text-text-muted">Esta herramienta usa la plantilla de tu organización y no está disponible para tu cuenta.</p>
      </div>
    );
  }

  const setC = (p: Partial<MfwServicesInput['colaborador']>) => setColab(c => ({ ...c, ...p }));
  const fillFromClient = (id: string) => {
    setClientId(id);
    const c = clients.find(x => x.id === id);
    if (!c) return;
    setColab(clientToColaborador(c));
  };

  const setHito = (i: number, p: Partial<HitoRow>) => setHitos(hs => hs.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const setPacto = (i: number, p: Partial<PactoRow>) => setPactos(ps => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const chooseModalidad = (m: MfwPaymentModel) => {
    setModalidad(m);
    if (m === 'hitos' && hitos.length === 0) setHitos([{ valor: '', cuando: 'fecha', fecha: '' }, { valor: '', cuando: 'fin_curso', fecha: '' }]);
  };
  // Preset for teachers: part of the fee on a date, the rest when the course ends (values stay editable).
  const presetParcialYFin = () => {
    setModalidad('hitos');
    setHitoTipo('porcentaje');
    setHitos([{ valor: '50', cuando: 'fecha', fecha: '' }, { valor: '50', cuando: 'fin_curso', fecha: '' }]);
  };

  const total = parseNum(importeTotal);
  const hitosInput: MfwMilestone[] = hitos.map(h => ({
    tipo: hitoTipo, valor: parseNum(h.valor), cuando: h.cuando, fecha: h.cuando === 'fecha' ? h.fecha || null : null,
  }));
  const remainder = (() => {
    const sum = hitosInput.reduce((a, h) => a + (Number.isFinite(h.valor) ? h.valor : 0), 0);
    if (hitoTipo === 'porcentaje') {
      const left = Math.round((100 - sum) * 100) / 100;
      if (Math.abs(left) <= 0.01) return { text: 'Completo: 100 %', ok: true };
      return { text: `${left > 0 ? 'Faltan' : 'Sobran'} ${Math.abs(left).toLocaleString('es-ES')} %`, ok: false };
    }
    if (!(total > 0)) return { text: 'Indica el importe total', ok: false };
    const left = Math.round((total - sum) * 100) / 100;
    if (Math.abs(left) <= 0.01) return { text: `Completo: ${money(total, moneda)}`, ok: true };
    return { text: `${left > 0 ? 'Faltan' : 'Sobran'} ${money(Math.abs(left), moneda)}`, ok: false };
  })();

  const title = `Contrato de servicios — ${MFW_SERVICES_TEMPLATE.company} / ${colab.nombre?.trim() || 'Colaborador'}`;

  const generate = async () => {
    if (!user) return;
    if (!colab.nombre?.trim()) return setError('Indica el nombre del colaborador.');
    const rate = Number(tarifa.replace(',', '.'));
    if (modalidad === 'horas' && tarifa.trim() && !(rate > 0)) return setError('La tarifa por hora no es válida.');
    const m = Number(meses);
    if (modalidad === 'horas' && (!Number.isInteger(m) || m < 1 || m > 120)) return setError('La vigencia inicial debe ser un número de meses (1–120).');
    const input: MfwServicesInput = {
      fechaContrato, colaborador: colab, servicio, duracion, inicioPool,
      mesesIniciales: Number.isInteger(m) && m > 0 ? m : undefined,
      tarifaHora: modalidad === 'horas' && tarifa.trim() ? rate : null, moneda, empresaDni,
      modalidadPago: modalidad,
      ...(modalidad !== 'horas' ? { importeTotal: Number.isFinite(total) ? total : null, fechaFinCurso: fechaFinCurso || null } : {}),
      ...(modalidad === 'hitos' ? { hitos: hitosInput } : {}),
      pactosAdicionales: pactos.map(p => ({ titulo: p.titulo, texto: p.texto })),
    };
    const problems = validateMfwPayment(input);
    if (problems.length) return setError(problems.join(' '));
    setError(''); setNotice(''); setSavedDocId(null); setResumeSign(false);
    setGenerating(true);
    try {
      const md = renderMfwServices(input);
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
      if (requestParams.requestId) linkRequestDocument(user, requestParams.requestId, 'contrato_servicios_mfw', record.id);
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
        actions={<Link href="/tools"><Button variant="ghost" size="sm">← Herramientas</Button></Link>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-6">
            <div className="rounded-lg border border-accent-border bg-accent-subtle px-4 py-3 space-y-1">
              <p className="text-caption font-semibold text-accent-text">Plantilla de {MFW_SERVICES_TEMPLATE.company}</p>
              <p className="text-caption text-text">El contrato se genera con el texto de la plantilla, sin cambios en sus cláusulas. Solo completas los datos del colaborador y las condiciones económicas.</p>
              <p className="text-caption text-text-muted">
                Fijado por la plantilla: LA EMPRESA (Félix Dia Morales, CIF {MFW_SERVICES_TEMPLATE.cif}) · régimen mercantil · facturación y pago a 30 días de la factura ·
                confidencialidad · propiedad intelectual para LA EMPRESA · preaviso de 30 días · no competencia 12 meses (40 %) · Juzgados de Barbastro.
              </p>
              <p className="text-caption text-text-muted">
                Configurable: la modalidad de pago (por horas, pago único al finalizar o pagos parciales) y pactos adicionales en la cláusula decimotercera.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-label font-semibold uppercase tracking-widest text-accent-text">El colaborador (persona física)</p>
                {clients.length > 0 && (
                  <select value={clientId} onChange={e => fillFromClient(e.target.value)}
                    className="text-caption bg-bg border border-border text-text-muted px-2.5 py-1 rounded-md ">
                    <option value="">Seleccionar cliente…</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-bg">{c.name}</option>)}
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
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-label font-semibold uppercase tracking-widest text-accent-text">Condiciones económicas (cláusula tercera)</p>
                <Button variant="ghost" size="sm" onClick={presetParcialYFin}>Pago parcial + resto al finalizar</Button>
              </div>
              <div>
                <label className={LABEL} htmlFor="modalidad-pago">Modalidad de pago</label>
                <select id="modalidad-pago" className={INPUT} value={modalidad} onChange={e => chooseModalidad(e.target.value as MfwPaymentModel)}>
                  {MODALIDADES.map(o => <option key={o.id} value={o.id} className="bg-bg">{o.label}</option>)}
                </select>
              </div>

              {modalidad === 'horas' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <option value="USD" className="bg-bg">USD</option>
                        <option value="EUR" className="bg-bg">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Importe total</label>
                    <div className="flex gap-2">
                      <input inputMode="decimal" className={INPUT} placeholder="p. ej. 2.000" value={importeTotal} onChange={e => setImporteTotal(e.target.value)} />
                      <select className={`${INPUT} max-w-[90px]`} value={moneda} onChange={e => setMoneda(e.target.value as Currency)}>
                        <option value="USD" className="bg-bg">USD</option>
                        <option value="EUR" className="bg-bg">EUR</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Fecha de fin del curso (opcional)</label>
                    <input type="date" className={INPUT} value={fechaFinCurso} onChange={e => setFechaFinCurso(e.target.value)} />
                  </div>
                </div>
              )}

              {modalidad === 'hitos' && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-small font-semibold text-text-heading">Calendario de pagos</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-caption ${remainder.ok ? 'text-success-text' : 'text-warning-text'}`} aria-live="polite">{remainder.text}</span>
                      <div className="inline-flex rounded-md border border-border overflow-hidden" role="group" aria-label="Tipo de pago">
                        {(['importe', 'porcentaje'] as HitoTipo[]).map(t => (
                          <button key={t} type="button" aria-pressed={hitoTipo === t} onClick={() => setHitoTipo(t)}
                            className={`px-3 py-1 text-caption ${hitoTipo === t ? 'bg-accent-subtle text-accent-text' : 'text-text-muted hover:bg-surface-muted'}`}>
                            {t === 'importe' ? 'Importe' : '%'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {hitos.map((h, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[140px_1fr_1fr_auto] gap-2 items-center">
                      <input inputMode="decimal" className={INPUT} aria-label={`Pago ${i + 1}: ${hitoTipo === 'porcentaje' ? 'porcentaje' : 'importe'}`}
                        placeholder={hitoTipo === 'porcentaje' ? '%' : moneda} value={h.valor} onChange={e => setHito(i, { valor: e.target.value })} />
                      <IconButton icon={Trash2} size="sm" label={`Quitar pago ${i + 1}`} onClick={() => setHitos(hs => hs.filter((_, j) => j !== i))} className="sm:order-last" />
                      <select className={INPUT} aria-label={`Pago ${i + 1}: cuándo`} value={h.cuando} onChange={e => setHito(i, { cuando: e.target.value as HitoRow['cuando'] })}>
                        <option value="fecha" className="bg-bg">Fecha</option>
                        <option value="fin_curso" className="bg-bg">Al finalizar el curso</option>
                      </select>
                      {h.cuando === 'fecha'
                        ? <input type="date" className={INPUT} aria-label={`Pago ${i + 1}: fecha`} value={h.fecha} onChange={e => setHito(i, { fecha: e.target.value })} />
                        : <span className="text-caption text-text-muted">{fechaFinCurso ? 'En la fecha de fin del curso' : 'Cuando termine el curso'}</span>}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" icon={Plus} onClick={() => setHitos(hs => [...hs, { valor: '', cuando: 'fecha', fecha: '' }])}>Añadir pago</Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-accent-text">Pactos adicionales (opcional)</p>
                <p className="text-caption text-text-muted mt-1">Se incluyen tal cual en la cláusula DECIMOTERCERA. Revísalos antes de firmar.</p>
              </div>
              {pactos.map((p, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-caption text-text-muted">13.{i + 1}</span>
                    <input className={INPUT} placeholder="Título (opcional)" aria-label={`Pacto ${i + 1}: título`} value={p.titulo} onChange={e => setPacto(i, { titulo: e.target.value })} />
                    <IconButton icon={Trash2} size="sm" label={`Quitar pacto ${i + 1}`} onClick={() => setPactos(ps => ps.filter((_, j) => j !== i))} />
                  </div>
                  <textarea className={`${INPUT} min-h-[96px]`} aria-label={`Pacto ${i + 1}: texto`} maxLength={MFW_EXTRA_CLAUSE_MAX_CHARS}
                    placeholder="Texto del pacto" value={p.texto} onChange={e => setPacto(i, { texto: e.target.value })} />
                  <p className="text-caption text-text-muted text-right">{p.texto.length.toLocaleString('es-ES')} / {MFW_EXTRA_CLAUSE_MAX_CHARS.toLocaleString('es-ES')}</p>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPactos(ps => [...ps, { titulo: '', texto: '' }])}>Añadir pacto</Button>
            </div>

            <p className="text-caption text-text-muted">Los datos que dejes vacíos aparecerán entre corchetes en el documento para completarlos antes de firmar. Importes y plazos se escriben en letra y número.</p>

            {error && <p className="text-caption text-danger-text">{error}</p>}
            {notice && <p className="text-caption text-warning-text">{notice}</p>}
            <div className="flex items-center justify-between">
              <p className="text-caption text-text-muted">El contrato se guardará automáticamente en tus documentos (Word y PDF).</p>
              <Button variant="accent" size="md" loading={generating} onClick={generate}>Generar contrato</Button>
            </div>
          </div>

          {result && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-small font-semibold text-text-heading">{docTitle || title}</span>
                  {savedDocId && <span className="text-caption bg-accent-subtle border border-accent-border text-accent-text px-2 py-0.5 rounded-full">Guardado en documentos</span>}
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
                  <Button variant="ghost" size="sm" onClick={() => downloadAsWord(result, docTitle || title, undefined, META)}>Word</Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadAsPdf(result, docTitle || title, undefined, META)}>PDF</Button>
                </div>
              </div>
              <pre className="px-5 py-4 text-caption text-text whitespace-pre-wrap font-sans leading-relaxed max-h-[60vh] overflow-y-auto">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
