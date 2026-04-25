'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCases, type CaseDoc, type CaseStatus } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import type { Timestamp } from 'firebase/firestore';

const STATUS_LABEL: Record<CaseStatus, string> = {
  active:   'Activo',
  urgent:   'Urgente',
  closed:   'Cerrado',
  archived: 'Archivado',
};

const STATUS_STYLE: Record<CaseStatus, string> = {
  active:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  urgent:   'bg-red-500/10 text-red-400 border-red-500/20',
  closed:   'bg-[#252218] text-[#6b6050] border-[#2e2b20]',
  archived: 'bg-[#1a1812] text-[#3a3630] border-[#2e2b20]',
};

const FILTERS: { label: string; value: CaseStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Cerrados', value: 'closed' },
  { label: 'Archivados', value: 'archived' },
];

function formatDeadline(ts: Timestamp | null): string | null {
  if (!ts) return null;
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CasesPage() {
  const { userDoc } = useAppAuth();
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userDoc.uid) return;
    getCases(userDoc.uid)
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userDoc.uid]);

  const visible = cases.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.ref.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Casos"
        subtitle={`${cases.length} caso${cases.length !== 1 ? 's' : ''} total`}
        actions={
          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-avocat-gold text-white text-[12px] font-sans font-medium hover:bg-[#a07824] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo caso
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-[#2e2b20] flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={[
                  'px-3 py-1.5 rounded-lg text-[12px] font-sans font-medium transition-colors',
                  filter === f.value
                    ? 'bg-avocat-gold text-white'
                    : 'text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218]',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar por título, referencia o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-[#1e1c16] border border-[#2e2b20] rounded-lg px-3 py-1.5 text-[12px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 transition-colors"
          />
        </div>

        {/* Cases list */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[13px] text-[#6b6050]">
                {search || filter !== 'all' ? 'Sin resultados para este filtro' : 'No hay casos aún. Crea el primero.'}
              </p>
              {!search && filter === 'all' && (
                <Link
                  href="/cases/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-avocat-gold text-white text-[13px] font-sans font-medium hover:bg-[#a07824] transition-colors"
                >
                  Crear caso
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visible.map(c => {
                const deadline = formatDeadline(c.deadline);
                return (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-4 hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-sans font-medium text-[13px] text-[#c8c0ac] group-hover:text-[#e8d4a0] leading-snug line-clamp-2">
                        {c.title}
                      </h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium border flex-shrink-0 ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b6050] mb-3">{c.ref}</p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6b6050]">{c.client || '—'}</span>
                      {deadline && (
                        <span className="text-[#6b6050]">📅 {deadline}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
