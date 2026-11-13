import Link from 'next/link';
import { deadlineStatus } from '@/lib/tokens';
import { StatusTag } from '@/components/ui/StatusTag';
import type { CaseDoc } from '@/lib/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { Contract } from '@/lib/contracts/types';
import { CONTRACT_TYPE_LABEL, DATE_KIND_LABEL } from '@/lib/contracts/types';
import { daysBetween, formatContractDate, lastPassedContractEvent, madridToday, nextContractEvent } from '@/lib/contracts/dates';

function msToDeadline(deadline: Timestamp | null): number | null {
  if (!deadline) return null;
  const secs = (deadline as unknown as { seconds: number }).seconds ?? 0;
  return secs * 1000 - Date.now();
}

/** "Venció hace 2 días", "Vence hoy", "Vence mañana", "Vence en 5 días" (DS v4 DeadlineItem copy). */
function relativeLabel(days: number): string {
  if (days < 0) return `Venció hace ${-days} ${days === -1 ? 'día' : 'días'}`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

interface DeadlineListProps {
  cases: CaseDoc[];
  /** F3: confirmed contracts — their next notice / end / survival date joins the list; a date that
   *  passed in the last EXPIRED_VISIBLE_DAYS shows as "Venció hace N días" when nothing is upcoming. */
  contracts?: Contract[];
}

interface Row { key: string; href: string; title: string; sub: string; days: number }

export default function DeadlineList({ cases, contracts = [] }: DeadlineListProps) {
  const caseRows: Row[] = cases
    .filter(c => c.deadline && c.status !== 'closed' && c.status !== 'archived')
    .map(c => ({ c, ms: msToDeadline(c.deadline) }))
    .filter((x): x is { c: CaseDoc; ms: number } => x.ms !== null)
    .map(({ c, ms }) => ({
      key: `case-${c.id}`, href: `/cases/${c.id}`, title: c.title, sub: c.client,
      days: Math.floor(ms / 86_400_000),
    }));
  const today = madridToday();
  const contractRows: Row[] = contracts
    .filter(c => c.confirmedByUser && !c.alertsMuted && (c.lifecycle === 'active' || c.lifecycle === 'expiring' || c.lifecycle === 'expired'))
    .flatMap(c => {
      const next = nextContractEvent(c.dates, today) ?? lastPassedContractEvent(c.dates, today);
      if (!next) return [];
      const days = daysBetween(today, next.date);
      if (days > 120) return [];
      return [{
        key: `contract-${c.id}`, href: `/documents?doc=${encodeURIComponent(c.documentId)}`,
        title: `${CONTRACT_TYPE_LABEL[c.type]} ${c.title.replace(/^NDA\s*[—-]\s*/i, '')}`,
        sub: `${DATE_KIND_LABEL[next.kind]} · ${formatContractDate(next.date)}`,
        days,
      }];
    });
  const withDeadlines = [...caseRows, ...contractRows].sort((a, b) => a.days - b.days).slice(0, 8);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-small font-sans font-semibold text-text-heading">Próximos vencimientos</h3>
      </div>

      {withDeadlines.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-caption text-text-muted">Sin vencimientos próximos</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {withDeadlines.map(c => {
            const status = deadlineStatus(c.days);
            return (
              <Link
                key={c.key}
                href={c.href}
                className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-caption font-sans font-medium text-text group-hover:text-text-heading truncate">
                    {c.title}
                  </p>
                  <p className="text-caption text-text-muted mt-0.5">{c.sub}</p>
                </div>
                <span className="ml-4 flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusTag status={status} size="sm" />
                  <span className="text-caption text-text-muted">{relativeLabel(c.days)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
