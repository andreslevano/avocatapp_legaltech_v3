'use client';

// Clientes → actions on the selected clients: Solicitar datos, Reenviar, Anular, Activar /
// Desactivar, Exportar a Excel, Eliminar. Who each action applies to (and why others are skipped):
// src/lib/clients/bulk.ts. Requests go through the same /api/data-requests as the single-client flow.
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Ban, CheckCircle2, Download, Power, PowerOff, RotateCw, Send, Trash2, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { ModalShell } from '@/components/documents/modals';
import type { ClientDoc } from '@/lib/firestore';
import type { DocId, RequestableDoc } from '@/lib/data-requests/catalog';
import { bulkLabel, hasPendingRequest, planBulk, type BulkAction, type BulkClient } from '@/lib/clients/bulk';
import { mapLimit } from '@/lib/clients/import-client';
import { buildClientsExport, downloadBlob } from '@/lib/clients/import-excel';
import { createRequest, DocPicker, requestStatus, resendRequest, revokeRequest, type SentResult } from './DataRequestControls';

interface Props {
  user: User;
  selected: ClientDoc[];
  /** Cases per client id (any status): clients with cases are never deleted. */
  casesByClient: Record<string, number>;
  requestableDocs: RequestableDoc[];
  onClear: () => void;
  onRequest: (clientId: string, r: SentResult | { id: string; status: SentResult['status'] }, docs?: DocId[]) => void;
  onStatus: (ids: string[], status: 'active' | 'inactive') => void;
  onDeleted: (ids: string[]) => void;
}

interface Outcome { done: number; failed: { name: string; error: string }[] }

const CHUNK = 200;

export default function ClientsBulkBar(p: Props) {
  const [action, setAction] = useState<BulkAction | null>(null);
  const [docs, setDocs] = useState<DocId[]>(p.requestableDocs.length === 1 ? [p.requestableDocs[0].id] : []);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const bulk: BulkClient[] = p.selected.map(c => ({
    id: c.id, name: c.name, email: c.email, status: c.status,
    requestStatus: requestStatus(c.dataRequest), requestId: c.dataRequest?.id, cases: p.casesByClient[c.id] ?? 0,
  }));
  const plan = action ? planBulk(action, bulk) : null;

  const close = () => { if (!running) { setAction(null); setOutcome(null); setProgress(0); } };

  const run = async () => {
    if (!action || !plan) return;
    const targets = plan.targets;
    setRunning(true); setProgress(0); setOutcome(null);
    const failed: Outcome['failed'] = [];
    let done = 0;
    const tick = () => setProgress(++done);
    try {
      if (action === 'request' || action === 'resend' || action === 'revoke') {
        await mapLimit(targets, 3, async t => {
          try {
            const r = action === 'request' ? await createRequest(p.user, t.id, docs)
              : action === 'resend' ? await resendRequest(p.user, t.requestId!)
              : await revokeRequest(p.user, t.requestId!);
            p.onRequest(t.id, r, action === 'request' ? docs : undefined);
          } catch (e) { failed.push({ name: t.name, error: (e as Error).message }); }
          finally { tick(); }
        });
      } else if (action === 'activate' || action === 'deactivate') {
        if (!db) throw new Error('Base de datos no disponible.');
        const status = action === 'activate' ? 'active' : 'inactive';
        for (let i = 0; i < targets.length; i += CHUNK) {
          const batch = writeBatch(db);
          targets.slice(i, i + CHUNK).forEach(t => batch.update(doc(db!, 'clients', t.id), { status, updatedAt: serverTimestamp() }));
          await batch.commit();
          targets.slice(i, i + CHUNK).forEach(tick);
        }
        p.onStatus(targets.map(t => t.id), status);
      } else if (action === 'delete') {
        if (!db) throw new Error('Base de datos no disponible.');
        // Cancel pending links first: nobody should fill in a form for a deleted client.
        await mapLimit(targets.filter(hasPendingRequest), 3, t => revokeRequest(p.user, t.requestId!).catch(() => null));
        for (let i = 0; i < targets.length; i += CHUNK) {
          const batch = writeBatch(db);
          targets.slice(i, i + CHUNK).forEach(t => batch.delete(doc(db!, 'clients', t.id)));
          await batch.commit();
          targets.slice(i, i + CHUNK).forEach(tick);
        }
        p.onDeleted(targets.map(t => t.id));
      }
    } catch (e) {
      failed.push({ name: 'Todos', error: (e as Error).message });
    }
    const ok = done - failed.filter(f => f.name !== 'Todos').length;
    setOutcome({ done: failed.some(f => f.name === 'Todos') ? 0 : ok, failed });
    setRunning(false);
    if (!failed.length && (action === 'delete')) p.onClear();
  };

  const exportSelected = async () => {
    const blob = await buildClientsExport(p.selected, p.requestableDocs);
    downloadBlob(blob, `Clientes_Avocat_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const n = p.selected.length;
  const BTN = 'inline-flex items-center gap-1.5 min-h-touch sm:min-h-0 px-3 py-1.5 rounded-lg text-caption font-medium text-text hover:bg-surface-muted disabled:opacity-40';

  return (
    <>
      <div role="region" aria-label="Acciones sobre los clientes seleccionados"
        className="sticky bottom-0 z-20 border-t border-border bg-surface px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-small font-semibold text-text-heading mr-2">{n} seleccionado{n === 1 ? '' : 's'}</span>
        {p.requestableDocs.length > 0 && (
          <button type="button" className={BTN} onClick={() => setAction('request')}><Send size={16} aria-hidden /> Solicitar datos</button>
        )}
        <button type="button" className={BTN} onClick={() => setAction('resend')}><RotateCw size={16} aria-hidden /> Reenviar solicitud</button>
        <button type="button" className={BTN} onClick={() => setAction('revoke')}><Ban size={16} aria-hidden /> Anular solicitud</button>
        <button type="button" className={BTN} onClick={() => setAction('activate')}><Power size={16} aria-hidden /> Activar</button>
        <button type="button" className={BTN} onClick={() => setAction('deactivate')}><PowerOff size={16} aria-hidden /> Desactivar</button>
        <button type="button" className={BTN} onClick={exportSelected}><Download size={16} aria-hidden /> Exportar a Excel</button>
        <button type="button" className={`${BTN} hover:text-danger-text`} onClick={() => setAction('delete')}><Trash2 size={16} aria-hidden /> Eliminar</button>
        <button type="button" className={`${BTN} ml-auto text-text-muted`} onClick={p.onClear} aria-label="Quitar la selección">
          <X size={16} aria-hidden /> <span className="hidden sm:inline">Quitar selección</span>
        </button>
      </div>

      {action && plan && (
        <ModalShell title={bulkLabel(action, plan.targets.length)} onClose={close} sheetOnMobile>
          <div className="space-y-3 text-small font-sans overflow-y-auto">
            {outcome ? (
              <div role="status" className="space-y-2">
                {outcome.done > 0 && (
                  <p className="flex items-center gap-2 text-success-text"><CheckCircle2 size={18} aria-hidden /> Hecho en {outcome.done} cliente{outcome.done === 1 ? '' : 's'}.</p>
                )}
                {outcome.failed.length > 0 && (
                  <div className="text-danger-text">
                    <p>No se pudo en {outcome.failed.length}:</p>
                    <ul className="mt-1 space-y-0.5 text-caption">{outcome.failed.slice(0, 15).map(f => <li key={f.name}>{f.name}: {f.error}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                {action === 'request' && (
                  <>
                    <p className="text-text-muted">Cada cliente recibirá un email con un enlace para completar los datos de estos documentos. Caduca en 14 días; si tenía un enlace pendiente, el anterior deja de funcionar.</p>
                    <DocPicker docs={p.requestableDocs} value={docs} onChange={setDocs} />
                  </>
                )}
                {action === 'delete' && (
                  <p className="text-danger-text">Se eliminarán sus fichas. Sus documentos se conservan en Documentos. Esta acción no se puede deshacer.</p>
                )}
                {action === 'resend' && <p className="text-text-muted">Se enviará un enlace nuevo (14 días) y el anterior dejará de funcionar.</p>}
                {action === 'revoke' && <p className="text-text-muted">Los enlaces pendientes dejarán de funcionar.</p>}
                <p className="text-text">
                  {plan.targets.length
                    ? <>Se aplicará a <strong className="font-semibold">{plan.targets.map(t => t.name).slice(0, 8).join(', ')}{plan.targets.length > 8 ? ` y ${plan.targets.length - 8} más` : ''}</strong>.</>
                    : 'Ninguno de los clientes seleccionados cumple las condiciones.'}
                </p>
                {plan.skipped.length > 0 && (
                  <details className="text-caption text-text-muted">
                    <summary className="cursor-pointer">Se omiten {plan.skipped.length}</summary>
                    <ul className="mt-1 space-y-0.5">{plan.skipped.slice(0, 20).map(s => <li key={s.client.id}>{s.client.name}: {s.reason}</li>)}</ul>
                  </details>
                )}
                {running && <p role="status" className="text-text-muted">Procesando… {progress} de {plan.targets.length}</p>}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            {outcome ? (
              <Button variant="accent" size="sm" onClick={close}>Cerrar</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" disabled={running} onClick={close}>Cancelar</Button>
                <Button variant={action === 'delete' ? 'destructive' : 'accent'} size="sm" loading={running}
                  disabled={!plan.targets.length || (action === 'request' && !docs.length)} onClick={run}>
                  {bulkLabel(action, plan.targets.length)}
                </Button>
              </>
            )}
          </div>
        </ModalShell>
      )}
    </>
  );
}

