interface TrendProps {
  value: number;
  label?: string;
}

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: TrendProps;
  icon?: React.ReactNode;
  accent?: boolean;
}

export default function KPICard({ label, value, trend, icon, accent }: KPICardProps) {
  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;
  const trendNeutral = trend && trend.value === 0;

  return (
    <div
      className={[
        'rounded-xl p-5 border flex flex-col gap-3',
        accent
          ? 'bg-accent-subtle border-accent-border'
          : 'bg-surface border-border',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <span className="text-label font-sans font-semibold tracking-widest uppercase text-text-muted">
          {label}
        </span>
        {icon && (
          <span className="text-accent-text opacity-60">{icon}</span>
        )}
      </div>

      <div className="text-h1 font-display font-semibold text-text-heading leading-none">
        {value}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'text-caption font-sans font-medium',
              trendUp ? 'text-success-text' : trendDown ? 'text-danger-text' : 'text-text-muted',
            ].join(' ')}
          >
            {trendUp ? '↑' : trendDown ? '↓' : '→'}
            {' '}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-caption text-text-muted">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
