'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { CaseDoc, ClientDoc } from '@/lib/firestore';

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';

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
            className="w-full text-left px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15 hover:border-red-500/30 text-[12px] text-red-400 transition-colors">
            Desvincular del caso actual
          </button>
        )}
        {filtered.length === 0 && <p className="text-[12px] text-[#3a3630] py-4 text-center">Sin casos.</p>}
        {filtered.map(c => (
          <button key={c.id} onClick={() => onLink(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${c.id === currentCaseId ? 'bg-avocat-gold/10 border-avocat-gold/30' : 'bg-[#161410] border-[#2e2b20] hover:border-avocat-gold/30'}`}>
            <p className="text-[12px] font-medium text-[#c8c0ac] truncate">{c.title}</p>
            <p className="text-[10px] text-[#6b6050] mt-0.5">{c.ref} · {c.client || '—'}</p>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
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
            className="w-full text-left px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15 hover:border-red-500/30 text-[12px] text-red-400 transition-colors">
            Desvincular del cliente actual
          </button>
        )}
        {filtered.length === 0 && <p className="text-[12px] text-[#3a3630] py-4 text-center">Sin clientes.</p>}
        {filtered.map(c => (
          <button key={c.id} onClick={() => onLink(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${c.id === currentClientId ? 'bg-avocat-gold/10 border-avocat-gold/30' : 'bg-[#161410] border-[#2e2b20] hover:border-avocat-gold/30'}`}>
            <p className="text-[12px] font-medium text-[#c8c0ac] truncate">{c.name}</p>
            {c.company && <p className="text-[10px] text-[#6b6050] mt-0.5">{c.company}</p>}
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
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
      <p className="text-[13px] text-[#c8c0ac]">
        {names.length === 1
          ? <>¿Eliminar <span className="text-[#e8d4a0] font-medium">"{names[0]}"</span>? Esta acción no se puede deshacer.</>
          : <>¿Eliminar <span className="text-[#e8d4a0] font-medium">{names.length} documentos</span>? Esta acción no se puede deshacer.</>
        }
      </p>
      {names.length > 1 && (
        <ul className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
          {names.map((n, i) => <li key={i} className="text-[11px] text-[#6b6050] truncate">• {n}</li>)}
        </ul>
      )}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="BtnGhost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="BtnGold" size="sm" loading={loading} onClick={onConfirm}
          className="!bg-red-500/80 hover:!bg-red-500 !border-red-500/30">
          Eliminar
        </Button>
      </div>
    </ModalShell>
  );
}

// ── Shared shell ─────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 w-full max-w-md shadow-xl space-y-3">
        <h2 className="font-sans font-semibold text-[14px] text-[#e8d4a0]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
