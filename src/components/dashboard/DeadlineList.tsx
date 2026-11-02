import Link from 'next/link';
import type { CaseDoc } from '@/lib/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { Contract } from '@/lib/contracts/types';
import { CONTRACT_TYPE_LABEL, DATE_KIND_LABEL } from '@/lib/contracts/types';
import { daysBetween, formatContractDate, madridToday, nextContractEvent } from '@/lib/contracts/dates';

function msToDeadline(deadline: Timestamp | null): number | null {
  if (!deadline) return null;
  const secs = (deadline as unknown as { seconds: number }).seconds ?? 0;
  return secs * 1000 - Date.now();
}

function formatDeadline(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  return formatDays(days);
}

function formatDays(days: number): string {
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days}d`;
}

function deadlineColor(ms: number): string {
  return daysColor(Math.floor(ms / 86_400_000));
}

function daysColor(days: number): string {
  if (days < 0) return 'text-red-400 bg-red-400/10';
  if (days <= 3) return 'text-red-400 bg-red-400/10';
  if (days <= 7) return 'text-amber-400 bg-amber-400/10';
  return 'text-emerald-400 bg-emerald-400/10';
}

interface DeadlineListProps {
  cases: CaseDoc[];
  /** F3: confirmed contracts — their next notice / end / survival date joins the list. */
  contracts?: Contract[];
}

interface Row { key: string; href: string; title: string; sub: string; days: number; label: string; color: string }

export default function DeadlineList({ cases, contracts = [] }: DeadlineListProps) {
  const caseRows: Row[] = cases
    .filter(c => c.deadline && c.status !== 'closed' && c.status !== 'archived')
    .map(c => ({ c, ms: msToDeadline(c.deadline) }))
    .filter((x): x is { c: CaseDoc; ms: number } => x.ms !== null)
    .map(({ c, ms }) => ({
      key: `case-${c.id}`, href: `/cases/${c.id}`, title: c.title, sub: c.client,
      days: Math.floor(ms / 86_400_000), label: formatDeadline(ms), color: deadlineColor(ms),
    }));
  const today = madridToday();
  const contractRows: Row[] = contracts
    .filter(c => c.confirmedByUser && !c.alertsMuted && (c.lifecycle === 'active' || c.lifecycle === 'expiring'))
    .flatMap(c => {
      const next = nextContractEvent(c.dates, today);
      if (!next) return [];
      const days = daysBetween(today, next.date);
      if (days > 120) return [];
      return [{
        key: `contract-${c.id}`, href: `/documents?doc=${encodeURIComponent(c.documentId)}`,
        title: `${CONTRACT_TYPE_LABEL[c.type]} ${c.title.replace(/^NDA\s*[—-]\s*/i, '')}`,
        sub: `${DATE_KIND_LABEL[next.kind]} · ${formatContractDate(next.date)}`,
        days, label: formatDays(days), color: daysColor(days),
      }];
    });
  const withDeadlines = [...caseRows, ...contractRows].sort((a, b) => a.days - b.days).slice(0, 8);

  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2e2b20]">
        <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">Próximos vencimientos</h3>
      </div>

      {withDeadlines.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[12px] text-[#6b6050]">Sin vencimientos próximos</p>
        </div>
      ) : (
        <div className="divide-y divide-[#2e2b20]">
          {withDeadlines.map(c => {
            const color = c.color;
            return (
              <Link
                key={c.key}
                href={c.href}
                className="flex items-center justify-between px-5 py-3 hover:bg-[#252218] transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] truncate">
                    {c.title}
                  </p>
                  <p className="text-[11px] text-[#6b6050] mt-0.5">{c.sub}</p>
                </div>
                <span className={`ml-4 px-2 py-0.5 rounded text-[11px] font-sans font-medium flex-shrink-0 ${color}`}>
                  {c.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
