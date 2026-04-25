'use client';

import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CaseDoc, CaseStatus } from '@/lib/firestore';

ChartJS.register(ArcElement, Tooltip);

const STATUS_LABELS: Record<CaseStatus, string> = {
  active:   'Activos',
  urgent:   'Urgentes',
  closed:   'Cerrados',
  archived: 'Archivados',
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  active:   '#10b981',
  urgent:   '#ef4444',
  closed:   '#6b6050',
  archived: '#3a3630',
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
        borderColor: '#1e1c16',
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
        backgroundColor: '#1e1c16',
        borderColor: '#2e2b20',
        borderWidth: 1,
        titleColor: '#e8d4a0',
        bodyColor: '#c8c0ac',
        padding: 10,
      },
    },
  };

  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
      <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0] mb-4">
        Estado de casos
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-[140px] w-[140px] relative flex-shrink-0">
          {total === 0 ? (
            <div className="h-full w-full rounded-full border-2 border-[#2e2b20] flex items-center justify-center">
              <span className="text-[11px] text-[#6b6050]">Sin datos</span>
            </div>
          ) : (
            <>
              <Doughnut data={data} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[22px] font-display font-semibold text-[#e8d4a0] leading-none">{total}</span>
                <span className="text-[10px] text-[#6b6050] mt-0.5">casos</span>
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
              <span className="text-[12px] text-[#6b6050]">{STATUS_LABELS[s]}</span>
              <span className="text-[12px] font-medium text-[#c8c0ac] ml-auto pl-3">{counts[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
