'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';

const INPUT = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-small font-sans text-text  focus:border-accent-border';

// ── LinkCaseModal ────────────────────────────────────────────────

export function LinkCaseModal({
  cases, currentCaseId, onLink, onClose,
}: {
  cases: CaseDoc[];
  currentCaseId?: string | null;
  onLink: (caseId: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = cases.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <ModalShell title="Vincular a caso" onClose={onClose}>
      <input className={INPUT} placeholder="Buscar caso..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
        {currentCaseId && (
          <button onClick={() => onLink(null)}
            className="w-full text-left px-3 py-2 rounded-lg bg-danger-subtle border border-status-urgente-border hover:border-status-urgente-border text-caption text-danger-text transition-colors">
            Desvincular del caso actual
          </button>
        )}
        {filtered.length === 0 && <p className="text-caption text-text-muted py-4 text-center">Sin casos.</p>}
        {filtered.map(c => (
          <button key={c.id} onClick={() => onLink(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${c.id === currentCaseId ? 'bg-accent-subtle border-accent-border' : 'bg-bg border-border hover:border-accent-border'}`}>
            <p className="text-caption font-medium text-text truncate">{c.title}</p>
            <p className="text-caption text-text-muted mt-0.5">{c.ref} · {c.client || '—'}</p>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalShell>
  );
}

// ── LinkClientModal ──────────────────────────────────────────────

export function LinkClientModal({
  clients, currentClientId, onLink, onClose,
}: {
  clients: ClientDoc[];
  currentClientId?: string | null;
  onLink: (clientId: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  return (
    <ModalShell title="Vincular a cliente" onClose={onClose}>
      <input className={INPUT} placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
        {currentClientId && (
          <button onClick={() => onLink(null)}
            className="w-full text-left px-3 py-2 rounded-lg bg-danger-subtle border border-status-urgente-border hover:border-status-urgente-border text-caption text-danger-text transition-colors">
            Desvincular del cliente actual
          </button>
        )}
        {filtered.length === 0 && <p className="text-caption text-text-muted py-4 text-center">Sin clientes.</p>}
        {filtered.map(c => (
          <button key={c.id} onClick={() => onLink(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${c.id === currentClientId ? 'bg-accent-subtle border-accent-border' : 'bg-bg border-border hover:border-accent-border'}`}>
            <p className="text-caption font-medium text-text truncate">{c.name}</p>
            {c.company && <p className="text-caption text-text-muted mt-0.5">{c.company}</p>}
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalShell>
  );
}

// ── DeleteConfirmModal ───────────────────────────────────────────

export function DeleteConfirmModal({
  names, onConfirm, onClose, loading,
}: {
  names: string[];
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <ModalShell title="Confirmar eliminación" onClose={onClose}>
      <p className="text-small text-text">
        {names.length === 1
          ? <>¿Eliminar <span className="text-text-heading font-medium">&quot;{names[0]}&quot;</span>? Esta acción no se puede deshacer.</>
          : <>¿Eliminar <span className="text-text-heading font-medium">{names.length} documentos</span>? Esta acción no se puede deshacer.</>
        }
      </p>
      {names.length > 1 && (
        <ul className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
          {names.map((n, i) => <li key={i} className="text-caption text-text-muted truncate">• {n}</li>)}
        </ul>
      )}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="destructive" size="sm" loading={loading} onClick={onConfirm}>
          Eliminar
        </Button>
      </div>
    </ModalShell>
  );
}

// ── Shared shell ─────────────────────────────────────────────────

export function ModalShell({ title, onClose, children, sheetOnMobile = false }: {
  title: string; onClose: () => void; children: React.ReactNode;
  sheetOnMobile?: boolean;   // bottom sheet below md
}) {
  return (
    <div className={`fixed inset-0 z-50 flex justify-center ${sheetOnMobile ? 'items-end md:items-center md:p-4' : 'items-center p-4'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative bg-surface border border-border p-5 w-full max-w-md shadow-xl space-y-3 ${sheetOnMobile ? 'rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col' : 'rounded-2xl'}`}>
        <h2 className="font-sans font-semibold text-body-sm text-text-heading">{title}</h2>
        {children}
      </div>
    </div>
  );
}
