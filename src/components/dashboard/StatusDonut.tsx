'use client';

import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CaseDoc, CaseStatus } from '@/lib/firestore';
import { themes } from '@/lib/tokens';

ChartJS.register(ArcElement, Tooltip);

const STATUS_LABELS: Record<CaseStatus, string> = {
  active:   'Activos',
  urgent:   'Urgentes',
  closed:   'Cerrados',
  archived: 'Archivados',
};

// Case status → dark-theme colours (canvas can't read CSS variables). Urgent uses the danger hue; the
// legend also prints the word, so colour is never the only cue.
const T = themes.dark;
const STATUS_COLORS: Record<CaseStatus, string> = {
  active:   T.successText,
  urgent:   T.dangerText,
  closed:   T.textMuted,
  archived: T.borderStrong,
};

interface StatusDonutProps {
  cases: CaseDoc[];
}

export default function StatusDonut({ cases }: StatusDonutProps) {
  const statuses: CaseStatus[] = ['active', 'urgent', 'closed', 'archived'];
  const counts = statuses.map(s => cases.filter(c => c.status === s).length);
  const total = counts.reduce((a, b) => a + b, 0);

  const data = {
    labels: statuses.map(s => STATUS_LABELS[s]),
    datasets: [
      {
        data: counts,
        backgroundColor: statuses.map(s => STATUS_COLORS[s]),
        borderColor: T.surface,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: T.surface,
        borderColor: T.border,
        borderWidth: 1,
        titleColor: T.textHeading,
        bodyColor: T.text,
        padding: 10,
      },
    },
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-small font-sans font-semibold text-text-heading mb-4">
        Estado de casos
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-[140px] w-[140px] relative flex-shrink-0">
          {total === 0 ? (
            <div className="h-full w-full rounded-full border-2 border-border flex items-center justify-center">
              <span className="text-caption text-text-muted">Sin datos</span>
            </div>
          ) : (
            <>
              <Doughnut data={data} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-h3 font-display font-semibold text-text-heading leading-none">{total}</span>
                <span className="text-caption text-text-muted mt-0.5">casos</span>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {statuses.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              <span className="text-caption text-text-muted">{STATUS_LABELS[s]}</span>
              <span className="text-caption font-medium text-text ml-auto pl-3">{counts[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
