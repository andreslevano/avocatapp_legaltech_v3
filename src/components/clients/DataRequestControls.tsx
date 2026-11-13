'use client';

// "Solicitar datos al cliente" controls for the clients page: document picker, status chip,
// request actions (Reenviar / Anular / Copiar enlace) and "Preparar {documento}" links.

import { useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { Ban, Check, CircleAlert, CircleCheck, Clock, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { docById, type DataRequestStatus, type DocId, type RequestableDoc } from '@/lib/data-requests/catalog';
import { effectiveStatus, STATUS_LABEL } from '@/lib/data-requests/core';
import type { ClientDataRequestSummary } from '@/lib/firestore';

export interface SentResult { id: string; status: DataRequestStatus; link: string; emailed: boolean; emailConfigured: boolean }

async function call<T>(user: User, path: string, body?: unknown): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'No se pudo completar la acción.');
  return data as T;
}

export const createRequest = (user: User, clientId: string, documents: DocId[]) =>
  call<SentResult>(user, '/api/data-requests', { clientId, documents });
export const resendRequest = (user: User, id: string) => call<SentResult>(user, `/api/data-requests/${encodeURIComponent(id)}/resend`);
export const revokeRequest = (user: User, id: string) =>
  call<{ id: string; status: DataRequestStatus }>(user, `/api/data-requests/${encodeURIComponent(id)}/revoke`);

/** Status shown for a client's latest request ("caducada" once past the expiry). */
export function requestStatus(dr: ClientDataRequestSummary | undefined): DataRequestStatus | null {
  if (!dr) return null;
  return dr.expiresAt ? effectiveStatus({ status: dr.status, expiresAt: dr.expiresAt }) : dr.status;
}

const CHIP: Record<DataRequestStatus, { cls: string; icon: typeof Clock }> = {
  enviada: { cls: 'bg-status-proximo-bg text-status-proximo-fg border-status-proximo-border', icon: Clock },
  abierta: { cls: 'bg-status-proximo-bg text-status-proximo-fg border-status-proximo-border', icon: Clock },
  completada: { cls: 'bg-status-a-tiempo-bg text-status-a-tiempo-fg border-status-a-tiempo-border', icon: CircleCheck },
  caducada: { cls: 'bg-status-vencido-bg text-status-vencido-fg border-status-vencido-border', icon: CircleAlert },
  revocada: { cls: 'bg-surface-raised text-text-muted border-border', icon: Ban },
};

export function RequestStatusChip({ status }: { status: DataRequestStatus }) {
  const { cls, icon: Icon } = CHIP[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-caption font-medium border whitespace-nowrap ${cls}`}>
      <Icon size={12} aria-hidden />{STATUS_LABEL[status]}
    </span>
  );
}

export function DocPicker({ docs, value, onChange }: { docs: RequestableDoc[]; value: DocId[]; onChange: (v: DocId[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-caption text-text-muted mb-1">Documentos que vas a preparar</legend>
      {docs.map(d => (
        <label key={d.id} className="flex items-center gap-2 text-small text-text cursor-pointer">
          <input type="checkbox" checked={value.includes(d.id)}
            onChange={e => onChange(e.target.checked ? [...value, d.id] : value.filter(x => x !== d.id))} />
          {d.label}
        </label>
      ))}
    </fieldset>
  );
}

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button type="button" variant="secondary" size="sm" icon={copied ? Check : Copy}
      onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}>
      {copied ? 'Copiado' : 'Copiar enlace'}
    </Button>
  );
}

/** Line under a sent request: where it went, and the link when it's available (right after sending). */
export function SentNotice({ email, result }: { email: string; result: SentResult }) {
  return (
    <div className="space-y-2">
      <p className={`text-caption ${result.emailed ? 'text-success-text' : 'text-warning-text'}`}>
        {result.emailed
          ? `Enlace enviado a ${email}.`
          : result.emailConfigured
            ? `No pudimos enviar el email a ${email}. Copia el enlace y envíaselo tú.`
            : 'El envío de emails no está configurado. Copia el enlace y envíaselo al cliente.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton link={result.link} />
        <span className="text-caption text-text-muted">Solo se puede copiar ahora; si lo pierdes, usa «Reenviar».</span>
      </div>
    </div>
  );
}

export function PrepareLinks({ clientId, dr }: { clientId: string; dr: ClientDataRequestSummary }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(dr.documents ?? []).map(id => (
        <Link key={id} href={`${docById(id).tool}?clientId=${encodeURIComponent(clientId)}&requestId=${encodeURIComponent(dr.id)}`}
          className="text-caption font-medium text-accent-text border border-accent-border rounded-md px-2 py-0.5 hover:bg-accent-subtle whitespace-nowrap">
          Preparar {docById(id).label}
        </Link>
      ))}
    </div>
  );
}
