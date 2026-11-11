'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { deadlineStatus, type LegalStatus } from '@/lib/tokens';
import { StatusTag } from '@/components/ui/StatusTag';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCases, type CaseDoc, type CaseStatus } from '@/lib/firestore';
import AppHeader from '@/components/layout/AppHeader';
import type { Timestamp } from 'firebase/firestore';
import { CalendarDays } from 'lucide-react';

const STATUS_LABEL: Record<CaseStatus, string> = {
  active:   'Activo',
  urgent:   'Urgente',
  closed:   'Cerrado',
  archived: 'Archivado',
};

const STATUS_STYLE: Record<CaseStatus, string> = {
  active:   'bg-success-subtle text-success-text border-status-a-tiempo-border',
  urgent:   'bg-danger-subtle text-danger-text border-status-urgente-border',
  closed:   'bg-surface-raised text-text-muted border-border',
  archived: 'bg-bg text-text-muted border-border',
};

const FILTERS: { label: string; value: CaseStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Cerrados', value: 'closed' },
  { label: 'Archivados', value: 'archived' },
];

// Deadline filters (?estado=) — replace the legacy /dashboard/casos-urgentes|a-tiempo|vencidos pages.
// One rule for every view: deadlineStatus() (vencido < 0 días, urgente ≤ 3, próximo ≤ 7, a tiempo > 7).
type Estado = 'vencido' | 'urgente' | 'proximo' | 'a-tiempo';
const ESTADOS: { label: string; value: Estado }[] = [
  { label: 'Vencidos', value: 'vencido' },
  { label: 'Urgentes', value: 'urgente' },
  { label: 'Próximos', value: 'proximo' },
  { label: 'A tiempo', value: 'a-tiempo' },
];

function daysLeft(ts: Timestamp | null): number | null {
  if (!ts) return null;
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return Math.floor((secs * 1000 - Date.now()) / 86_400_000);
}

function formatDeadline(ts: Timestamp | null): string | null {
  if (!ts) return null;
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CasesPage() {
  return (
    <Suspense fallback={null}>
      <CasesPageInner />
    </Suspense>
  );
}

function CasesPageInner() {
  const { userDoc } = useAppAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const estadoParam = params?.get('estado') ?? '';
  const estado = (ESTADOS.some(e => e.value === estadoParam) ? estadoParam : null) as Estado | null;
  const setEstado = (e: Estado | null) => {
    const q = new URLSearchParams(params?.toString() ?? '');
    if (e) q.set('estado', e); else q.delete('estado');
    router.replace(`${pathname}${q.toString() ? `?${q}` : ''}`, { scroll: false });
  };
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
    if (estado) {
      if (c.status === 'closed' || c.status === 'archived') return false;
      const d = daysLeft(c.deadline);
      if (d === null || deadlineStatus(d) !== estado) return false;
    }
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-text-on-accent text-caption font-sans font-medium hover:bg-accent-hover transition-colors"
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
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={[
                  'px-3 py-1.5 rounded-lg text-caption font-sans font-medium transition-colors',
                  filter === f.value
                    ? 'bg-accent text-text-on-accent'
                    : 'text-text-muted hover:text-text hover:bg-surface-muted',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Deadline filter (?estado=) */}
          <div className="flex gap-1" role="group" aria-label="Filtrar por plazo">
            {ESTADOS.map(e => (
              <button
                key={e.value}
                onClick={() => setEstado(estado === e.value ? null : e.value)}
                aria-pressed={estado === e.value}
                className={[
                  'px-3 py-1.5 rounded-lg text-caption font-sans font-medium transition-colors border',
                  estado === e.value
                    ? 'border-accent text-accent-text bg-accent-subtle'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-surface-muted',
                ].join(' ')}
              >
                {e.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar por título, referencia o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-surface border border-border rounded-lg px-3 py-1.5 text-caption font-sans text-text  focus:border-accent-border transition-colors"
          />
        </div>

        {/* Cases list */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-small text-text-muted">
                {search || filter !== 'all' || estado ? 'Sin resultados para este filtro' : 'No hay casos aún. Crea el primero.'}
              </p>
              {!search && filter === 'all' && !estado && (
                <Link
                  href="/cases/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-text-on-accent text-small font-sans font-medium hover:bg-accent-hover transition-colors"
                >
                  Crear caso
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visible.map(c => {
                const deadline = formatDeadline(c.deadline);
                const d = daysLeft(c.deadline);
                const dStatus: LegalStatus | null = d !== null && c.status !== 'closed' && c.status !== 'archived' ? deadlineStatus(d) : null;
                return (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="bg-surface border border-border rounded-xl p-4 hover:border-accent-border hover:bg-surface-muted transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-sans font-medium text-small text-text group-hover:text-text-heading leading-snug line-clamp-2">
                        {c.title}
                      </h3>
                      <span className={`px-1.5 py-0.5 rounded text-caption font-sans font-medium border flex-shrink-0 ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="text-caption text-text-muted mb-3">{c.ref}</p>
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-text-muted">{c.client || '—'}</span>
                      {deadline && (
                        <span className="text-text-muted inline-flex items-center gap-1.5">
                          <CalendarDays size={12} aria-hidden /> {deadline}
                          {dStatus && dStatus !== 'a-tiempo' && <StatusTag status={dStatus} size="sm" />}
                        </span>
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
