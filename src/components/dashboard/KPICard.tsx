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
          ? 'bg-avocat-gold/10 border-avocat-gold/30'
          : 'bg-[#1e1c16] border-[#2e2b20]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-sans font-semibold tracking-widest uppercase text-[#6b6050]">
          {label}
        </span>
        {icon && (
          <span className="text-avocat-gold opacity-60">{icon}</span>
        )}
      </div>

      <div className="text-[32px] font-display font-semibold text-[#e8d4a0] leading-none">
        {value}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'text-[11px] font-sans font-medium',
              trendUp ? 'text-emerald-400' : trendDown ? 'text-red-400' : 'text-[#6b6050]',
            ].join(' ')}
          >
            {trendUp ? '↑' : trendDown ? '↓' : '→'}
            {' '}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-[11px] text-[#6b6050]">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
