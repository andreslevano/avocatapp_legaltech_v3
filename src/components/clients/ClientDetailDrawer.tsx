'use client';

// Clientes → click a client: everything about them in one panel — data, data request, cases and the
// documents linked to them (directly or through their cases), signature documents first with their
// status. Documents open in the full-screen viewer; "Ver en Documentos" opens the filtered repository.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileSignature, FileText, Pencil, X } from 'lucide-react';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import type { DocumentRecord } from '@/lib/storage-client';
import { awaitingSignedCopy, clientDocuments, signatureInfo } from '@/lib/clients/documents';
import UploadSignedCopy, { type SignedCopyResult } from '@/components/signatures/UploadSignedCopy';
import { statusChip } from '@/components/documents/helpers';
import DocViewerModal from '@/components/documents/DocViewerModal';
import { PrepareLinks, requestStatus, RequestStatusChip } from './DataRequestControls';

interface Props {
  client: ClientDoc;
  cases: CaseDoc[];
  /** All the user's documents (loaded by the page); null while loading. */
  documents: DocumentRecord[] | null;
  onEdit: () => void;
  onClose: () => void;
  initialTab?: Tab;
  /** A returned signed copy was uploaded: the page updates its document list. */
  onSignedCopy?: (r: SignedCopyResult) => void;
}

type Tab = 'firma' | 'todos';

const TONE: Record<string, string> = {
  done: 'text-success-text', pending: 'text-warning-text', problem: 'text-danger-text', info: 'text-info-text',
};

const fmtDate = (v: unknown) => {
  const secs = (v as { seconds?: number } | null)?.seconds;
  const d = secs ? new Date(secs * 1000) : typeof v === 'string' ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-label uppercase tracking-widest text-text-muted">{label}</dt>
      <dd className="text-small text-text break-words">{value}</dd>
    </div>
  );
}

export default function ClientDetailDrawer({ client: c, cases, documents, onEdit, onClose, initialTab = 'firma', onSignedCopy }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [viewing, setViewing] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !viewing) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [onClose, viewing]);

  const clientCases = cases.filter(k => k.clientId === c.id);
  const docs = useMemo(() => {
    if (!documents) return null;
    const all = clientDocuments(documents, c.id, clientCases.map(k => k.id))
      .sort((a, b) => ((b.createdAt as { seconds?: number })?.seconds ?? 0) - ((a.createdAt as { seconds?: number })?.seconds ?? 0));
    return { all, firma: all.filter(d => signatureInfo(d as never) || d.negotiation) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, c.id, clientCases.map(k => k.id).join('|')]);
  const shown = docs ? (tab === 'firma' ? docs.firma : docs.all) : [];
  const st = requestStatus(c.dataRequest);
  const sociedad = c.personType === 'sociedad' || (!c.personType && !!c.company);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="client-detail-title"
        className="relative h-full w-full sm:max-w-xl bg-surface border-l border-border shadow-xl flex flex-col">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 id="client-detail-title" className="font-sans text-h4 font-semibold text-text-heading truncate">{c.name}</h2>
            <p className="text-caption text-text-muted">
              {sociedad ? `Sociedad${c.company ? ` · ${c.company}` : ''}` : 'Persona física'} · {c.status === 'active' ? 'Activo' : 'Inactivo'}
            </p>
          </div>
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 min-h-touch sm:min-h-0 px-3 py-1.5 rounded-lg border border-border-strong text-caption text-text hover:bg-surface-muted">
            <Pencil size={16} aria-hidden /> Editar
          </button>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted"><X size={20} aria-hidden /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section aria-labelledby="cd-datos">
            <h3 id="cd-datos" className="text-small font-semibold text-text-heading mb-2">Datos</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Email" value={c.email} />
              <Field label="Teléfono" value={c.phone} />
              <Field label="Documento" value={c.idNumber ? `${c.idType ?? ''} ${c.idNumber}`.trim() : ''} />
              <Field label="Nacionalidad" value={c.nationality} />
              <Field label="Domicilio" value={c.address} />
              {sociedad && <>
                <Field label="Empresa" value={c.company} />
                <Field label="NIF de la empresa" value={c.companyTaxId} />
                <Field label="Domicilio social" value={c.companyAddress} />
                <Field label="Cargo" value={c.representativeCapacity} />
                <Field label="Poderes" value={c.powers} />
              </>}
            </dl>
            {!c.email && !c.phone && !c.idNumber && !c.address && <p className="text-caption text-text-muted">Sin datos todavía.</p>}
          </section>

          <section aria-labelledby="cd-solicitud">
            <h3 id="cd-solicitud" className="text-small font-semibold text-text-heading mb-2">Solicitud de datos</h3>
            {st && c.dataRequest ? (
              <div className="space-y-2">
                <RequestStatusChip status={st} />
                {st === 'completada' && <PrepareLinks clientId={c.id} dr={c.dataRequest} />}
              </div>
            ) : <p className="text-caption text-text-muted">No se le han pedido datos.</p>}
          </section>

          <section aria-labelledby="cd-casos">
            <h3 id="cd-casos" className="text-small font-semibold text-text-heading mb-2">Casos ({clientCases.length})</h3>
            {clientCases.length ? (
              <ul className="divide-y divide-border border border-border rounded-lg">
                {clientCases.map(k => (
                  <li key={k.id}>
                    <Link href={`/cases/${k.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-small text-text hover:bg-surface-muted">
                      <span className="truncate">{k.title}</span>
                      <span className="text-caption text-text-muted whitespace-nowrap">{{ active: 'Activo', urgent: 'Urgente', closed: 'Cerrado', archived: 'Archivado' }[k.status] ?? k.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-caption text-text-muted">Sin casos.</p>}
          </section>

          <section aria-labelledby="cd-docs">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 id="cd-docs" className="text-small font-semibold text-text-heading">Documentos</h3>
              <Link href={`/documents?cliente=${encodeURIComponent(c.id)}`} className="inline-flex items-center gap-1 text-caption text-accent-text hover:underline">
                Ver en Documentos <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div role="tablist" aria-label="Documentos del cliente" className="inline-flex gap-1 p-1 rounded-lg bg-surface-muted mb-3">
              {([['firma', 'De firma', docs?.firma.length], ['todos', 'Todos', docs?.all.length]] as const).map(([id, label, n]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`min-h-touch sm:min-h-0 px-3 py-1.5 rounded-md text-caption font-medium ${tab === id ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
                  {label}{n !== undefined ? ` (${n})` : ''}
                </button>
              ))}
            </div>
            {!docs ? (
              <p role="status" className="text-caption text-text-muted">Cargando documentos…</p>
            ) : shown.length === 0 ? (
              <p className="text-caption text-text-muted">
                {tab === 'firma' ? 'Ningún documento en negociación ni enviado a firma todavía.' : 'Sin documentos vinculados a este cliente ni a sus casos.'}
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg">
                {shown.map(d => {
                  const sig = signatureInfo(d as never);
                  const chip = statusChip(d);
                  return (
                    <li key={d.id}>
                      <button type="button" onClick={() => setViewing(d)} className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-surface-muted">
                        {sig ? <FileSignature size={18} aria-hidden className="mt-0.5 text-accent-text flex-shrink-0" /> : <FileText size={18} aria-hidden className="mt-0.5 text-text-muted flex-shrink-0" />}
                        <span className="flex-1 min-w-0">
                          <span className="block text-small text-text truncate">{d.name}</span>
                          <span className="block text-caption text-text-muted">
                            {fmtDate(d.createdAt)}
                            {sig && <> · <span className={TONE[sig.tone]}>{sig.label}</span>{sig.via && ` · ${sig.via}`}</>}
                          </span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-caption font-medium border whitespace-nowrap ${chip.className}`}>{chip.label}</span>
                      </button>
                      {d.negotiation && (
                        <div className="px-3 pb-2.5 pl-10">
                          <Link href={`/negociaciones/${encodeURIComponent(d.negotiation.id)}`} className="inline-flex items-center gap-1 min-h-touch sm:min-h-0 text-caption text-accent-text hover:underline">
                            {d.negotiation.role === 'draft' ? 'Ver negociación' : 'Versión acordada · ver negociación'} <ArrowRight size={16} aria-hidden />
                          </Link>
                        </div>
                      )}
                      {awaitingSignedCopy(d) && (
                        <div className="px-3 pb-2.5 pl-10">
                          <UploadSignedCopy doc={d} compact onDone={onSignedCopy} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {viewing && (
        <DocViewerModal doc={viewing} list={shown} onNavigate={setViewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
