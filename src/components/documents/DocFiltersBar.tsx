'use client';

import type { CaseDoc, ClientDoc } from '@/lib/firestore';
import { DOC_TIPOS, DOC_ESTADOS, EMPTY_FILTERS, activeFilterCount, type DocFilters } from './helpers';

const SEL = 'bg-[#161410] border border-[#2e2b20] rounded-lg px-2.5 py-1.5 text-[12px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40 cursor-pointer';

interface Props {
  filters: DocFilters;
  onChange: (f: DocFilters) => void;
  cases: CaseDoc[];
  clients: ClientDoc[];
}

export default function DocFiltersBar({ filters, onChange, cases, clients }: Props) {
  const set = <K extends keyof DocFilters>(k: K, v: DocFilters[K]) => onChange({ ...filters, [k]: v });
  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b border-[#2e2b20] bg-[#161410]">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3a3630] pointer-events-none">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Buscar nombre..."
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          className="w-full bg-[#1e1c16] border border-[#2e2b20] rounded-lg pl-8 pr-3 py-1.5 text-[12px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40"
        />
      </div>

      {/* Case */}
      {cases.length > 0 && (
        <select className={SEL} value={filters.caseId} onChange={e => set('caseId', e.target.value)}>
          <option value="">Todos los casos</option>
          {cases.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.title}</option>)}
          <option value="__none__" className="bg-[#161410]">Sin caso</option>
        </select>
      )}

      {/* Client */}
      {clients.length > 0 && (
        <select className={SEL} value={filters.clientId} onChange={e => set('clientId', e.target.value)}>
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.name}</option>)}
        </select>
      )}

      {/* Tipo */}
      <select className={SEL} value={filters.tipo} onChange={e => set('tipo', e.target.value)}>
        <option value="">Todos los tipos</option>
        {DOC_TIPOS.map(t => <option key={t} value={t} className="bg-[#161410]">{t}</option>)}
      </select>

      {/* Date range */}
      <select className={SEL} value={filters.dateRange} onChange={e => set('dateRange', e.target.value as DocFilters['dateRange'])}>
        <option value="all">Todo el período</option>
        <option value="7d">Últimos 7 días</option>
        <option value="30d">Último mes</option>
        <option value="90d">Último trimestre</option>
      </select>

      {/* Status */}
      <select className={SEL} value={filters.status} onChange={e => set('status', e.target.value)}>
        <option value="">Todos los estados</option>
        {DOC_ESTADOS.map(s => <option key={s} value={s} className="bg-[#161410]">{s}</option>)}
      </select>

      {/* Clear */}
      {count > 0 && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1.5 text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors border border-[#2e2b20] hover:border-avocat-gold/30 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
        >
          Limpiar
          <span className="bg-avocat-gold text-[#161410] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        </button>
      )}
    </div>
  );
}
