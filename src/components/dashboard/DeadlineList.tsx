import Link from 'next/link';
import type { CaseDoc } from '@/lib/firestore';
import type { Timestamp } from 'firebase/firestore';

function msToDeadline(deadline: Timestamp | null): number | null {
  if (!deadline) return null;
  const secs = (deadline as unknown as { seconds: number }).seconds ?? 0;
  return secs * 1000 - Date.now();
}

function formatDeadline(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days}d`;
}

function deadlineColor(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return 'text-red-400 bg-red-400/10';
  if (days <= 3) return 'text-red-400 bg-red-400/10';
  if (days <= 7) return 'text-amber-400 bg-amber-400/10';
  return 'text-emerald-400 bg-emerald-400/10';
}

interface DeadlineListProps {
  cases: CaseDoc[];
}

export default function DeadlineList({ cases }: DeadlineListProps) {
  const withDeadlines = cases
    .filter(c => c.deadline && c.status !== 'closed' && c.status !== 'archived')
    .map(c => ({ ...c, ms: msToDeadline(c.deadline) as number }))
    .filter(c => c.ms !== null)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 8);

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
            const color = deadlineColor(c.ms);
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-[#252218] transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] truncate">
                    {c.title}
                  </p>
                  <p className="text-[11px] text-[#6b6050] mt-0.5">{c.client}</p>
                </div>
                <span className={`ml-4 px-2 py-0.5 rounded text-[11px] font-sans font-medium flex-shrink-0 ${color}`}>
                  {formatDeadline(c.ms)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
