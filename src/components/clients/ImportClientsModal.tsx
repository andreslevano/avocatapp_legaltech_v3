'use client';

// Clientes → "Importar desde Excel": 1) download the template / pick a file, 2) review (valid,
// warnings, duplicates, errors) before anything is written — including which clients get a data
// request, from the "Solicitar <documento>" Sí/No columns of the template (per client, like "Guardar y
// enviar" in the new-client form), 3) result with undo (which also
// cancels the links) and the rows that weren't imported as an Excel to fix and re-upload.
// Logic: src/lib/clients/import*.ts; requests go through the same /api/data-requests as the form.

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X, XCircle, Copy, Undo2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { ClientDoc } from '@/lib/firestore';
import {
  canRequest, fieldLabel, IMPORT_MAX_ROWS, parseClientRows, shortDocLabel,
  type ExistingClient, type ImportField, type ImportRow, type ParsedImport, type RowStatus,
} from '@/lib/clients/import';
import { buildErrorReport, buildTemplate, downloadBlob, ImportFileError, readClientFile } from '@/lib/clients/import-excel';
import { commitClientImport, mapLimit, newImportId, undoClientImport, type CommitResult } from '@/lib/clients/import-client';
import { createRequest, resendRequest, revokeRequest, type SentResult } from '@/components/clients/DataRequestControls';
import type { DocId, RequestableDoc } from '@/lib/data-requests/catalog';

interface Props {
  user: User;
  userId: string;
  /** Documents this account can request (availableDocs(user)); empty → no request option. */
  requestableDocs: RequestableDoc[];
  /** A request was created for an imported client (updates the status chip in the list). */
  onRequestSent: (clientId: string, result: SentResult, documents: DocId[]) => void;
  existing: ExistingClient[];
  /** Client ids that have cases (never deleted by "Deshacer"). */
  linkedClientIds: Set<string>;
  onClose: () => void;
  onImported: (created: ClientDoc[]) => void;
  onUndone: (ids: string[]) => void;
}

const STATUS: Record<RowStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok:        { label: 'Lista',           cls: 'text-success-text', Icon: CheckCircle2 },
  warning:   { label: 'Con avisos',      cls: 'text-warning-text', Icon: AlertTriangle },
  duplicate: { label: 'Posible duplicado', cls: 'text-info-text',  Icon: Copy },
  error:     { label: 'Con errores',     cls: 'text-danger-text',  Icon: XCircle },
};

type Step = 'pick' | 'review' | 'saving' | 'sending' | 'done';

/** Outcome of "Solicitar los datos" for one imported client. */
interface SendOutcome {
  client: ClientDoc;
  docs: DocId[];
  state: 'sent' | 'not_emailed' | 'failed';
  requestId?: string;
  error?: string;
}

/** Requests in flight at once (each one sends an email through the server). */
const SEND_CONCURRENCY = 3;

export default function ImportClientsModal({
  user, userId, requestableDocs, onRequestSent, existing, linkedClientIds, onClose, onImported, onUndone,
}: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'template' | 'read' | 'report' | 'undo' | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [filter, setFilter] = useState<RowStatus | 'all'>('all');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [undone, setUndone] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // "Solicitar datos": what each client gets comes from the Excel; this switch can hold all of them back.
  const [requestOn, setRequestOn] = useState(true);
  const [sends, setSends] = useState<SendOutcome[]>([]);
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0 });
  const [emailOff, setEmailOff] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importId = useRef(newImportId());
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes (not while writing); focus moves into the dialog.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && step !== 'saving' && step !== 'sending') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { ok: 0, warning: 0, duplicate: 0, error: 0 };
    parsed?.rows.forEach(r => { c[r.status]++; });
    return c;
  }, [parsed]);
  const toImport = useMemo(
    () => parsed?.rows.filter(r => r.status === 'ok' || r.status === 'warning' || (includeDuplicates && r.status === 'duplicate')) ?? [],
    [parsed, includeDuplicates],
  );
  const requestTargets = useMemo(() => (requestOn ? toImport.filter(canRequest) : []), [toImport, requestOn]);
  const markedRows = useMemo(() => toImport.filter(canRequest), [toImport]);
  const docLabel = (id: DocId) => requestableDocs.find(d => d.id === id);
  const notImported = useMemo(() => {
    const skipped = parsed?.rows.filter(r => !toImport.includes(r)) ?? [];
    return [...skipped, ...(result?.failed ?? [])];
  }, [parsed, toImport, result]);

  const downloadTemplate = async () => {
    setBusy('template'); setError('');
    try { downloadBlob(await buildTemplate(requestableDocs), 'Plantilla_clientes_Avocat.xlsx'); }
    catch { setError('No se pudo generar la plantilla. Intenta de nuevo.'); }
    finally { setBusy(null); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('read'); setError(''); setFileName(file.name);
    try {
      const { matrix } = await readClientFile(file);
      const p = parseClientRows(matrix, existing, requestableDocs);
      if ('error' in p) { setError(p.error); return; }
      if (p.rows.length === 0) { setError('El archivo no tiene clientes: rellena al menos una fila debajo de los encabezados.'); return; }
      setParsed(p); setFilter('all'); setIncludeDuplicates(false); setRequestOn(true); setStep('review');
    } catch (e) {
      setError(e instanceof ImportFileError ? e.message : 'No se pudo leer el archivo. Comprueba que es la plantilla en .xlsx.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Creates (or, for a link whose email didn't go out, re-sends) the request of each client. */
  const sendRequests = async (targets: { client: ClientDoc; docs: DocId[]; resendId?: string }[]) => {
    if (!targets.length) return;
    setStep('sending');
    setSendProgress({ done: 0, total: targets.length });
    let done = 0;
    const outcomes = await mapLimit(targets, SEND_CONCURRENCY, async ({ client, docs, resendId }): Promise<SendOutcome> => {
      try {
        const r = resendId ? await resendRequest(user, resendId) : await createRequest(user, client.id, docs);
        onRequestSent(client.id, r, docs);
        if (!r.emailConfigured) setEmailOff(true);
        return { client, docs, state: r.emailed ? 'sent' : 'not_emailed', requestId: r.id };
      } catch (e) {
        return { client, docs, state: 'failed', error: (e as Error).message };
      } finally {
        setSendProgress({ done: ++done, total: targets.length });
      }
    });
    setSends(prev => [...prev.filter(p => !outcomes.some(o => o.client.id === p.client.id)), ...outcomes]);
  };

  const doImport = async (rows: ImportRow[]) => {
    if (!rows.length) return;
    setStep('saving'); setProgress(0); setError('');
    const r = await commitClientImport(userId, rows, importId.current, setProgress)
      .catch(e => ({ importId: importId.current, created: [], failed: rows, error: (e as Error).message }) as CommitResult);
    setResult(prev => prev ? { ...r, created: [...prev.created, ...r.created] } : r);
    if (r.created.length) onImported(r.created);
    // created[i] is rows[i] (chunks are written in order; a failed chunk stops the rest).
    if (requestOn) {
      await sendRequests(r.created
        .map((client, i) => ({ client, docs: rows[i].requestDocs, row: rows[i] }))
        .filter(t => canRequest(t.row))
        .map(({ client, docs }) => ({ client, docs })));
    }
    setStep('done');
  };

  const retrySends = async () => {
    await sendRequests(sends.filter(s => s.state !== 'sent')
      .map(s => ({ client: s.client, docs: s.docs, resendId: s.state === 'not_emailed' ? s.requestId : undefined })));
    setStep('done');
  };

  const undo = async () => {
    if (!result) return;
    const ids = result.created.map(c => c.id).filter(id => !linkedClientIds.has(id));
    setBusy('undo'); setError('');
    try {
      // Cancel the links first so nobody fills in a form for a client that no longer exists.
      const toRevoke = sends.filter(s => s.requestId && ids.includes(s.client.id));
      await mapLimit(toRevoke, SEND_CONCURRENCY, s => revokeRequest(user, s.requestId!).catch(() => null));
      await undoClientImport(ids);
      onUndone(ids);
      setUndone(ids.length);
    } catch {
      setError('No se pudo deshacer la importación. Intenta de nuevo.');
    } finally { setBusy(null); }
  };

  const downloadReport = async () => {
    setBusy('report');
    try { downloadBlob(await buildErrorReport(notImported, requestableDocs), `Clientes_no_importados_${fileName.replace(/\.[^.]+$/, '') || 'archivo'}.xlsx`); }
    catch { setError('No se pudo generar el archivo.'); }
    finally { setBusy(null); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); };
  const shown = parsed?.rows.filter(r => filter === 'all' || r.status === filter) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => step !== 'saving' && step !== 'sending' && onClose()} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="import-title"
        className="relative bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col shadow-elevated">
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-border">
          <div>
            <h2 id="import-title" className="font-display text-h3 text-text-heading">Importar clientes desde Excel</h2>
            <p className="text-caption text-text-muted mt-1">
              {step === 'pick' && `Crea hasta ${IMPORT_MAX_ROWS} clientes de una vez con la plantilla de Avocat.`}
              {step === 'review' && `${fileName} · revisa antes de importar. Todavía no se ha creado ningún cliente.`}
              {step === 'saving' && 'Creando clientes…'}
              {step === 'sending' && 'Enviando las solicitudes de datos…'}
              {step === 'done' && 'Importación terminada.'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={step === 'saving' || step === 'sending'} aria-label="Cerrar"
            className="min-h-touch min-w-touch sm:min-h-0 sm:min-w-0 p-1.5 rounded-md text-text-muted hover:text-text disabled:opacity-40">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && <Alert tone="danger">{error}</Alert>}

          {step === 'pick' && (
            <>
              <ol className="space-y-4 text-small text-text">
                <li className="flex gap-3">
                  <span className="text-label font-semibold text-accent-text mt-0.5">1</span>
                  <div className="flex-1">
                    <p>
                      Descarga la plantilla y rellena una fila por cliente. Solo el nombre es obligatorio.
                      {requestableDocs.length > 0 && ' Para pedirle sus datos a un cliente, pon su email y marca «Sí» en los documentos que vas a preparar.'}
                    </p>
                    <Button variant="secondary" size="sm" className="mt-2 min-h-touch sm:min-h-0" loading={busy === 'template'} onClick={downloadTemplate}>
                      <Download size={16} aria-hidden /> Descargar plantilla (.xlsx)
                    </Button>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-label font-semibold text-accent-text mt-0.5">2</span>
                  <p className="flex-1">Sube el archivo. Antes de crear nada verás qué filas están listas, cuáles tienen errores y cuáles parecen clientes que ya tienes.</p>
                </li>
              </ol>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`rounded-xl border border-dashed p-6 flex flex-col items-center text-center gap-3 transition-colors ${dragOver ? 'border-accent-border bg-accent-subtle' : 'border-border-strong bg-bg'}`}
              >
                <FileSpreadsheet size={24} aria-hidden className="text-text-muted" />
                <p className="text-small text-text">Arrastra aquí tu Excel</p>
                <p className="text-caption text-text-muted">.xlsx o .csv · máximo 2 MB y {IMPORT_MAX_ROWS} clientes</p>
                <input ref={fileRef} id="import-file" type="file" className="sr-only"
                  accept=".xlsx,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={e => onFile(e.target.files?.[0])} />
                <Button variant="accent" size="sm" className="min-h-touch sm:min-h-0" loading={busy === 'read'} loadingText="Leyendo…"
                  onClick={() => fileRef.current?.click()}>
                  <Upload size={16} aria-hidden /> Seleccionar archivo
                </Button>
              </div>
            </>
          )}

          {step === 'review' && parsed && (
            <>
              <div role="group" aria-label="Filtrar filas" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['ok', 'warning', 'duplicate', 'error'] as RowStatus[]).map(s => {
                  const { label, cls, Icon } = STATUS[s];
                  const active = filter === s;
                  return (
                    <button key={s} type="button" aria-pressed={active} onClick={() => setFilter(active ? 'all' : s)}
                      className={`min-h-touch rounded-lg border px-3 py-2 text-left transition-colors ${active ? 'border-accent-border bg-accent-subtle' : 'border-border bg-bg hover:border-border-strong'}`}>
                      <span className={`flex items-center gap-1.5 text-caption ${cls}`}><Icon size={16} aria-hidden /> {label}</span>
                      <span className="block text-h4 text-text-heading">{counts[s]}</span>
                    </button>
                  );
                })}
              </div>

              {parsed.tooMany && (
                <Alert tone="warning" title={`Solo se leen los primeros ${IMPORT_MAX_ROWS} clientes`}>
                  El archivo tiene más filas. Importa estas y sube el resto en otro archivo.
                </Alert>
              )}
              {(parsed.header.unknown.length > 0 || parsed.header.repeated.length > 0) && (
                <Alert tone="info" title="Columnas que no se importan">
                  {[
                    parsed.header.unknown.length ? `No reconocidas: ${parsed.header.unknown.join(', ')}.` : '',
                    parsed.header.repeated.length ? `Repetidas (se usa la primera): ${parsed.header.repeated.map(f => fieldLabel(f as ImportField)).join(', ')}.` : '',
                  ].filter(Boolean).join(' ')}
                </Alert>
              )}
              {counts.duplicate > 0 && (
                <label className="flex items-start gap-3 min-h-touch cursor-pointer text-small text-text">
                  <input type="checkbox" className="mt-1 accent-accent" checked={includeDuplicates} onChange={e => setIncludeDuplicates(e.target.checked)} />
                  <span>
                    Importar también los {counts.duplicate} posibles duplicados
                    <span className="block text-caption text-text-muted">Tienen el mismo email o documento que un cliente que ya tienes (o que otra fila del archivo). Se crearán como clientes nuevos.</span>
                  </span>
                </label>
              )}

              {requestableDocs.length > 0 && (markedRows.length > 0 ? (
                <div className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-3 space-y-2">
                  <p className="text-label font-semibold uppercase tracking-widest text-accent-text">Solicitar los datos a los clientes</p>
                  <label className="flex items-center justify-between gap-3 min-h-touch sm:min-h-0 text-small text-text cursor-pointer">
                    <span>Enviar las solicitudes marcadas en el Excel ({markedRows.length} cliente{markedRows.length !== 1 ? 's' : ''})</span>
                    <input type="checkbox" role="switch" aria-checked={requestOn} checked={requestOn}
                      onChange={e => setRequestOn(e.target.checked)} className="h-4 w-4 flex-shrink-0" />
                  </label>
                  {requestOn ? (
                    <>
                      <ul className="text-caption text-text space-y-0.5">
                        {requestableDocs.map(d => {
                          const n = markedRows.filter(r => r.requestDocs.includes(d.id)).length;
                          return n > 0 && <li key={d.id}>{d.label}: {n} cliente{n !== 1 ? 's' : ''}</li>;
                        })}
                      </ul>
                      <p className="text-caption text-text-muted">
                        Cada cliente recibirá un enlace para completar los datos de los documentos marcados en su fila. Caduca en 14 días.
                      </p>
                    </>
                  ) : (
                    <p className="text-caption text-text-muted">Se crearán los clientes sin enviar nada. Podrás solicitar los datos después desde la lista.</p>
                  )}
                </div>
              ) : parsed.header.requestCols.size === 0 && (
                <Alert tone="info" title="Sin solicitudes de datos">
                  Este archivo no tiene las columnas «Solicitar …». Si quieres que los clientes completen sus datos, descarga la plantilla de nuevo, marca «Sí» en los documentos de cada cliente y vuelve a subirla.
                </Alert>
              ))}

              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-caption">
                  <thead>
                    <tr className="border-b border-border text-left text-label uppercase tracking-widest text-text-muted">
                      <th scope="col" className="px-3 py-2">Fila</th>
                      <th scope="col" className="px-3 py-2">Cliente</th>
                      <th scope="col" className="px-3 py-2">Email</th>
                      <th scope="col" className="px-3 py-2">Documento</th>
                      {parsed.header.requestCols.size > 0 && <th scope="col" className="px-3 py-2">Solicitar</th>}
                      <th scope="col" className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.slice(0, 300).map(r => {
                      const { label, cls, Icon } = STATUS[r.status];
                      const notes = [
                        ...Object.entries(r.errors).map(([f, m]) => `${fieldLabel(f as ImportField)}: ${m}`),
                        ...(r.status === 'duplicate' ? [`Coincide con ${r.duplicateOf}`] : []),
                        ...Object.entries(r.warnings).map(([f, m]) => `${fieldLabel(f as ImportField)}: ${m}`),
                      ];
                      return (
                        <tr key={r.rowNumber} className="border-b border-border last:border-0 align-top">
                          <td className="px-3 py-2 text-text-muted font-mono">{r.rowNumber}</td>
                          <td className="px-3 py-2 text-text">{r.values.name || <span className="text-text-muted">—</span>}
                            {r.values.company && <span className="block text-text-muted">{r.values.company}</span>}</td>
                          <td className="px-3 py-2 text-text-muted break-all">{r.values.email || '—'}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.values.idNumber ? `${r.values.idType ?? ''} ${r.values.idNumber}` : '—'}</td>
                          {parsed.header.requestCols.size > 0 && (
                            <td className="px-3 py-2 text-text">
                              {r.requestDocs.length
                                ? r.requestDocs.map(id => <span key={id} className="block whitespace-nowrap">{shortDocLabel(docLabel(id) ?? { label: id })}</span>)
                                : <span className="text-text-muted">—</span>}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <span className={`flex items-center gap-1 ${cls}`}><Icon size={16} aria-hidden /> {label}</span>
                            {notes.map(n => <span key={n} className="block text-text-muted mt-0.5">{n}</span>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {shown.length > 300 && <p className="px-3 py-2 text-caption text-text-muted">Se muestran 300 de {shown.length} filas.</p>}
                {shown.length === 0 && <p className="px-3 py-4 text-caption text-text-muted">No hay filas en este estado.</p>}
              </div>
            </>
          )}

          {step === 'saving' && (
            <div className="py-10 text-center" role="status" aria-live="polite">
              <div className="mx-auto h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-small text-text mt-3">Creando clientes… {progress} de {toImport.length}</p>
              <p className="text-caption text-text-muted mt-1">No cierres esta ventana.</p>
            </div>
          )}

          {step === 'sending' && (
            <div className="py-10 text-center" role="status" aria-live="polite">
              <div className="mx-auto h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-small text-text mt-3">Enviando solicitudes… {sendProgress.done} de {sendProgress.total}</p>
              <p className="text-caption text-text-muted mt-1">Los clientes ya están creados. No cierres esta ventana.</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-4" role="status" aria-live="polite">
              {undone !== null ? (
                <Alert tone="info" title="Importación deshecha">
                  Se han eliminado {undone} cliente{undone !== 1 ? 's' : ''}.
                  {result.created.length - undone > 0 && ` ${result.created.length - undone} no se eliminaron porque ya tienen casos.`}
                </Alert>
              ) : result.created.length > 0 && (
                <Alert tone="success" title={`${result.created.length} cliente${result.created.length !== 1 ? 's' : ''} creado${result.created.length !== 1 ? 's' : ''}`}>
                  Ya aparecen en tu lista de clientes.
                </Alert>
              )}
              {result.failed.length > 0 && (
                <Alert tone="danger" title={`${result.failed.length} cliente${result.failed.length !== 1 ? 's' : ''} no se pudieron guardar`}
                  action={<Button variant="secondary" size="sm" onClick={() => doImport(result.failed)}>Reintentar</Button>}>
                  Hubo un problema de conexión. Los demás sí se guardaron. Puedes reintentar solo los que faltan.
                </Alert>
              )}
              {undone === null && sends.length > 0 && (() => {
                const sent = sends.filter(x => x.state === 'sent').length;
                const pending = sends.filter(x => x.state !== 'sent');
                return (
                  <>
                    {sent > 0 && (
                      <Alert tone="success" title={`${sent} solicitud${sent !== 1 ? 'es' : ''} de datos enviada${sent !== 1 ? 's' : ''}`}>
                        Cada cliente ha recibido un email con su enlace. Verás el estado en la lista y te avisaremos cuando completen sus datos.
                      </Alert>
                    )}
                    {emailOff && (
                      <Alert tone="warning" title="El envío de emails no está configurado">
                        Los enlaces se han creado, pero no se han enviado. Usa «Reenviar» en cada cliente cuando el email esté disponible.
                      </Alert>
                    )}
                    {pending.length > 0 && (
                      <Alert tone="warning" title={`${pending.length} solicitud${pending.length !== 1 ? 'es' : ''} sin enviar`}
                        action={emailOff ? undefined : <Button variant="secondary" size="sm" icon={Send} onClick={retrySends}>Reintentar envíos</Button>}>
                        <ul className="mt-1 space-y-0.5">
                          {pending.slice(0, 15).map(p => (
                            <li key={p.client.id}>
                              {p.client.name} ({p.client.email}): {p.state === 'failed' ? (p.error || 'no se pudo crear la solicitud') : 'el email no salió'}
                            </li>
                          ))}
                          {pending.length > 15 && <li>y {pending.length - 15} más.</li>}
                        </ul>
                      </Alert>
                    )}
                  </>
                );
              })()}
              {notImported.length > 0 && (
                <p className="text-small text-text">
                  {notImported.length} fila{notImported.length !== 1 ? 's' : ''} no se importaron (errores o duplicados). Descárgalas en un Excel con el motivo, corrígelas y vuelve a subirlo.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 p-5 sm:p-6 border-t border-border">
          {step === 'review' && (
            <>
              <Button variant="ghost" size="sm" className="min-h-touch sm:min-h-0" onClick={() => { setStep('pick'); setParsed(null); }}>Elegir otro archivo</Button>
              <Button variant="accent" className="min-h-touch sm:min-h-0" disabled={toImport.length === 0} onClick={() => doImport(toImport)}>
                {toImport.length === 0
                  ? 'No hay clientes para importar'
                  : `Importar ${toImport.length} cliente${toImport.length !== 1 ? 's' : ''}${requestTargets.length ? ` y enviar ${requestTargets.length} solicitud${requestTargets.length !== 1 ? 'es' : ''}` : ''}`}
              </Button>
            </>
          )}
          {step === 'done' && result && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                {result.created.length > 0 && undone === null && (
                  <Button variant="ghost" size="sm" className="min-h-touch sm:min-h-0" loading={busy === 'undo'} onClick={undo}>
                    <Undo2 size={16} aria-hidden /> {sends.some(x => x.requestId) ? 'Deshacer importación y anular enlaces' : 'Deshacer importación'}
                  </Button>
                )}
                {notImported.length > 0 && (
                  <Button variant="secondary" size="sm" className="min-h-touch sm:min-h-0" loading={busy === 'report'} onClick={downloadReport}>
                    <Download size={16} aria-hidden /> Descargar filas no importadas
                  </Button>
                )}
              </div>
              <Button variant="accent" className="min-h-touch sm:min-h-0" onClick={onClose}>Cerrar</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
