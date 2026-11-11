import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, Sparkles, TriangleAlert, X, type LucideIcon } from 'lucide-react';

// Avocat DS v4 Alert — spec: design-system/v4/components/Alert.md. Icon + title carry the tone.
type Tone = 'info' | 'success' | 'warning' | 'danger' | 'accent';

const TONE: Record<Tone, { icon: LucideIcon; box: string; fg: string }> = {
  info:    { icon: Info,          box: 'bg-info-subtle border-status-en-revision-border', fg: 'text-info-text' },
  success: { icon: CircleCheck,   box: 'bg-success-subtle border-status-a-tiempo-border', fg: 'text-success-text' },
  warning: { icon: TriangleAlert, box: 'bg-warning-subtle border-status-proximo-border',  fg: 'text-warning-text' },
  danger:  { icon: CircleAlert,   box: 'bg-danger-subtle border-status-urgente-border',   fg: 'text-danger-text' },
  accent:  { icon: Sparkles,      box: 'bg-accent-subtle border-accent-border',           fg: 'text-accent-text' },
};

interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ tone = 'info', title, children, action, onDismiss, className = '' }: AlertProps) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-md border px-4 py-3 ${t.box} ${className}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${t.fg}`} aria-hidden />
      <div className="min-w-0 flex-1 text-body-sm text-text">
        {title && <p className={`font-semibold ${t.fg}`}>{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="shrink-0 text-text-muted hover:text-text">
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
