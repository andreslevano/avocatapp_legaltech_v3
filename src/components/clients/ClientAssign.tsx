'use client';

// Assign a case to a client: one of the user's clients (search; the case analysis's client is
// matched automatically when there is one clear match), a new client proposed from the case's data
// (created when the case is saved), or none. Used in Nuevo caso and in the case detail.
import { useMemo, useState } from 'react';
import { Building2, Check, Search, User, UserPlus } from 'lucide-react';
import type { ClientDoc } from '@/lib/firestore';
import { guessPersonType, matchClients } from '@/lib/clients/match';

export interface NewClientData {
  personType: 'persona' | 'sociedad';
  /** persona: full name · sociedad: razón social */
  displayName: string;
  taxId: string;
  address: string;
  email: string;
  /** sociedad: who signs for it (optional) */
  representative: string;
}

export type ClientAssignment =
  | { kind: 'existing'; client: ClientDoc; auto?: boolean }
  | { kind: 'new'; data: NewClientData; proposed?: boolean }
  | { kind: 'none' };

export interface ClientSuggestion { name: string; personType?: string | null; taxId?: string | null; email?: string | null; address?: string | null }

export function newClientFrom(s: ClientSuggestion | string): NewClientData {
  const o = typeof s === 'string' ? { name: s } : s;
  const personType = o.personType === 'sociedad' || o.personType === 'persona' ? o.personType : guessPersonType(o.name);
  return { personType, displayName: o.name.trim(), taxId: o.taxId?.trim() ?? '', address: o.address?.trim() ?? '', email: o.email?.trim() ?? '', representative: '' };
}

/** The createClientDoc payload for a new client (sociedad: razón social in company; name = who signs, or the company). */
export function newClientPayload(d: NewClientData) {
  return d.personType === 'sociedad'
    ? { personType: 'sociedad' as const, name: d.representative.trim() || d.displayName.trim(), company: d.displayName.trim(),
        companyTaxId: d.taxId, companyAddress: d.address, email: d.email.trim().toLowerCase() }
    : { personType: 'persona' as const, name: d.displayName.trim(), idNumber: d.taxId, address: d.address, email: d.email.trim().toLowerCase() };
}

/** Name shown on the case ("Cliente"). */
export const assignmentLabel = (a: ClientAssignment) =>
  a.kind === 'existing' ? (a.client.company || a.client.name) : a.kind === 'new' ? a.data.displayName.trim() : '';

const INPUT = 'w-full bg-bg border border-border-strong rounded-lg px-3 py-2 text-small font-sans text-text';
const LINK = 'inline-flex items-center gap-1 min-h-touch sm:min-h-0 text-caption text-accent-text hover:underline';

interface Props {
  clients: ClientDoc[];
  value: ClientAssignment;
  onChange: (a: ClientAssignment) => void;
  /** The client named by the case analysis (shown as a proposal when not linked). */
  suggestion?: ClientSuggestion | null;
  idPrefix?: string;
}

export default function ClientAssign({ clients, value, onChange, suggestion, idPrefix = 'ca' }: Props) {
  const [query, setQuery] = useState('');
  const matches = useMemo(
    () => (query.trim() ? matchClients(query, clients, 0.34).map(m => m.client) : clients.slice(0, 6)),
    [query, clients],
  );

  if (value.kind === 'existing') {
    const c = value.client;
    return (
      <div className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-2.5 flex flex-wrap items-center gap-3">
        {c.company ? <Building2 size={18} aria-hidden className="text-accent-text" /> : <User size={18} aria-hidden className="text-accent-text" />}
        <div className="flex-1 min-w-[10rem]">
          <p className="text-small text-text font-medium">{c.company || c.name}</p>
          <p className="text-caption text-text-muted">
            {[c.company ? c.name : '', c.email].filter(Boolean).join(' · ') || 'Sin email'}
            {value.auto && <span className="text-success-text"> · encontrado en tus clientes</span>}
          </p>
        </div>
        <button type="button" className={LINK} onClick={() => onChange({ kind: 'none' })}>Cambiar</button>
      </div>
    );
  }

  if (value.kind === 'new') {
    const d = value.data;
    const set = (patch: Partial<NewClientData>) => onChange({ kind: 'new', data: { ...d, ...patch }, proposed: value.proposed });
    const soc = d.personType === 'sociedad';
    return (
      <div className="rounded-lg border border-accent-border bg-accent-subtle p-3 space-y-3">
        <p className="flex items-center gap-2 text-small text-text font-medium">
          <UserPlus size={18} aria-hidden className="text-accent-text" />
          {value.proposed ? 'No está en tus clientes: se creará al guardar' : 'Nuevo cliente: se creará al guardar'}
        </p>
        <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex gap-1 p-1 rounded-lg bg-surface">
          {([['sociedad', 'Sociedad'], ['persona', 'Persona física']] as const).map(([t, label]) => (
            <button key={t} type="button" role="radio" aria-checked={d.personType === t} onClick={() => set({ personType: t })}
              className={`min-h-touch sm:min-h-0 px-3 py-1 rounded-md text-caption font-medium ${d.personType === t ? 'bg-accent text-text-on-accent' : 'text-text-muted hover:text-text'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${idPrefix}-name`} className="block text-caption text-text-muted mb-1">{soc ? 'Razón social' : 'Nombre y apellidos'} *</label>
            <input id={`${idPrefix}-name`} className={INPUT} value={d.displayName} onChange={e => set({ displayName: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-tax`} className="block text-caption text-text-muted mb-1">{soc ? 'NIF / RUT de la sociedad' : 'DNI / NIE / Pasaporte'}</label>
            <input id={`${idPrefix}-tax`} className={INPUT} value={d.taxId} onChange={e => set({ taxId: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-email`} className="block text-caption text-text-muted mb-1">Email</label>
            <input id={`${idPrefix}-email`} type="email" className={INPUT} value={d.email} onChange={e => set({ email: e.target.value })} />
          </div>
          <div className={soc ? '' : 'sm:col-span-2'}>
            <label htmlFor={`${idPrefix}-addr`} className="block text-caption text-text-muted mb-1">{soc ? 'Domicilio social' : 'Domicilio'}</label>
            <input id={`${idPrefix}-addr`} className={INPUT} value={d.address} onChange={e => set({ address: e.target.value })} />
          </div>
          {soc && (
            <div>
              <label htmlFor={`${idPrefix}-rep`} className="block text-caption text-text-muted mb-1">Representante <span className="text-text-muted">(opcional)</span></label>
              <input id={`${idPrefix}-rep`} className={INPUT} value={d.representative} onChange={e => set({ representative: e.target.value })} />
            </div>
          )}
        </div>
        <p className="text-caption text-text-muted">Puedes completar el resto de sus datos después en Clientes, o pedírselos con «Solicitar datos».</p>
        <div className="flex flex-wrap gap-4">
          <button type="button" className={LINK} onClick={() => onChange({ kind: 'none' })}>Elegir un cliente existente</button>
        </div>
      </div>
    );
  }

  // none: search + proposal
  const proposal = suggestion?.name?.trim() ? suggestion : null;
  const q = query.trim();
  const exact = q && matches.some(c => (c.company || c.name).trim().toLowerCase() === q.toLowerCase());
  return (
    <div className="rounded-lg border border-border bg-bg p-3 space-y-2">
      {proposal && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
          <p className="flex-1 min-w-[12rem] text-caption text-text">El análisis indica el cliente <strong className="font-semibold">«{proposal.name}»</strong>.</p>
          <button type="button" className={LINK} onClick={() => onChange({ kind: 'new', data: newClientFrom(proposal), proposed: true })}>
            <UserPlus size={16} aria-hidden /> Crear este cliente
          </button>
        </div>
      )}
      <div className="relative">
        <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input id={`${idPrefix}-search`} className={`${INPUT} pl-9`} placeholder="Buscar en tus clientes (nombre, empresa o NIF)…" value={query}
          onChange={e => setQuery(e.target.value)} aria-label="Buscar cliente" />
      </div>
      <ul className="max-h-48 overflow-y-auto space-y-1" aria-label="Clientes">
        {matches.map(c => (
          <li key={c.id}>
            <button type="button" onClick={() => onChange({ kind: 'existing', client: c })}
              className="w-full min-h-touch sm:min-h-0 text-left px-3 py-2 rounded-md border border-border hover:border-accent-border text-caption text-text flex items-center gap-2">
              <Check size={16} aria-hidden className="text-text-muted" />
              <span className="font-medium">{c.company || c.name}</span>
              {c.company && <span className="text-text-muted">{c.name}</span>}
              {c.email && <span className="text-text-muted truncate">{c.email}</span>}
            </button>
          </li>
        ))}
        {!matches.length && <li className="px-3 py-1 text-caption text-text-muted">{q ? 'Ningún cliente coincide.' : 'Aún no tienes clientes.'}</li>}
      </ul>
      <div className="flex flex-wrap gap-4">
        {q && !exact && (
          <button type="button" className={LINK} onClick={() => onChange({ kind: 'new', data: newClientFrom(q) })}>
            <UserPlus size={16} aria-hidden /> Crear cliente «{q}»
          </button>
        )}
        {!q && !proposal && (
          <button type="button" className={LINK} onClick={() => onChange({ kind: 'new', data: newClientFrom('') })}>
            <UserPlus size={16} aria-hidden /> Nuevo cliente
          </button>
        )}
      </div>
      <p className="text-caption text-text-muted">Si no eliges ninguno, el caso se guarda sin cliente y puedes vincularlo después.</p>
    </div>
  );
}
