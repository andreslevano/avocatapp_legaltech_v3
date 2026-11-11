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
import { chartTheme, themes } from '@/lib/tokens';

// The app shell is dark (data-theme="dark"); canvas can't read CSS variables, so use the theme values.
const T = themes.dark;
const C = chartTheme('dark');

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
        borderColor: T.accent,
        backgroundColor: T.accentSubtle,
        borderWidth: 2,
        pointBackgroundColor: T.accent,
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
        backgroundColor: T.surface,
        borderColor: T.border,
        borderWidth: 1,
        titleColor: T.textHeading,
        bodyColor: T.text,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: C.borderColor, drawBorder: false },
        ticks: { color: C.color, font: C.font },
        border: { display: false },
      },
      y: {
        grid: { color: C.borderColor, drawBorder: false },
        ticks: { color: C.color, font: C.font, stepSize: 1 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-small font-sans font-semibold text-text-heading mb-4">
        Casos por mes
      </h3>
      <div className="h-[180px]">
        <Line data={data} options={options as never} />
      </div>
    </div>
  );
}
