'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { CaseDoc } from '@/lib/firestore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function getLast6Months(): string[] {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    );
  }
  return months;
}

function countByMonth(cases: CaseDoc[]): number[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const target = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return cases.filter(c => {
      const secs = (c.createdAt as unknown as { seconds: number })?.seconds ?? 0;
      const d = new Date(secs * 1000);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
    }).length;
  });
}

interface CasesChartProps {
  cases: CaseDoc[];
}

export default function CasesChart({ cases }: CasesChartProps) {
  const labels = getLast6Months();
  const counts = countByMonth(cases);

  const data = {
    labels,
    datasets: [
      {
        label: 'Casos abiertos',
        data: counts,
        borderColor: '#B8882A',
        backgroundColor: 'rgba(184,136,42,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#B8882A',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
    scales: {
      x: {
        grid: { color: '#2e2b20', drawBorder: false },
        ticks: { color: '#6b6050', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: '#2e2b20', drawBorder: false },
        ticks: { color: '#6b6050', font: { size: 11 }, stepSize: 1 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5">
      <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0] mb-4">
        Casos por mes
      </h3>
      <div className="h-[180px]">
        <Line data={data} options={options as never} />
      </div>
    </div>
  );
}
