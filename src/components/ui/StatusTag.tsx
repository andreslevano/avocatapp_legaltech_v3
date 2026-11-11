import type { ReactNode } from 'react';
import { AlarmClock, BadgeCheck, CircleCheck, CircleX, Clock, Eye, FilePenLine, Send, type LucideIcon } from 'lucide-react';
import type { LegalStatus } from '@/lib/tokens';

// Avocat DS v4 StatusTag — spec: design-system/v4/components/StatusTag.md. Icon + word + colour, never colour alone.
const STATUS: Record<LegalStatus, { label: string; icon: LucideIcon; cls: string }> = {
  vencido:       { label: 'Vencido',     icon: CircleX,     cls: 'bg-status-vencido-bg text-status-vencido-fg border-status-vencido-border' },
  urgente:       { label: 'Urgente',     icon: AlarmClock,  cls: 'bg-status-urgente-bg text-status-urgente-fg border-status-urgente-border' },
  proximo:       { label: 'Próximo',     icon: Clock,       cls: 'bg-status-proximo-bg text-status-proximo-fg border-status-proximo-border' },
  'a-tiempo':    { label: 'A tiempo',    icon: CircleCheck, cls: 'bg-status-a-tiempo-bg text-status-a-tiempo-fg border-status-a-tiempo-border' },
  borrador:      { label: 'Borrador',    icon: FilePenLine, cls: 'bg-status-borrador-bg text-status-borrador-fg border-status-borrador-border' },
  'en-revision': { label: 'En revisión', icon: Eye,         cls: 'bg-status-en-revision-bg text-status-en-revision-fg border-status-en-revision-border' },
  presentado:    { label: 'Presentado',  icon: Send,        cls: 'bg-status-presentado-bg text-status-presentado-fg border-status-presentado-border' },
  pagado:        { label: 'Pagado',      icon: BadgeCheck,  cls: 'bg-status-pagado-bg text-status-pagado-fg border-status-pagado-border' },
};

export const STATUS_LABEL: Record<LegalStatus, string> = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, v.label]),
) as Record<LegalStatus, string>;

interface StatusTagProps {
  status: LegalStatus;
  size?: 'sm' | 'md';
  /** Overrides the status word (keep it a status, not a date). */
  children?: ReactNode;
  className?: string;
}

export function StatusTag({ status, size = 'md', children, className = '' }: StatusTagProps) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'h-5 px-2 text-label tracking-normal' : 'h-6 px-2.5 text-caption',
        s.cls,
        className,
      ].join(' ')}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} aria-hidden />
      {children ?? s.label}
    </span>
  );
}
