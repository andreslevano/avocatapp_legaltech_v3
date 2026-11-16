import { STATUS_LABEL, effectiveStatus, type FeatureStatus } from '@/lib/pricing';

const STYLE = {
  live: 'bg-success-subtle text-success-text border-status-a-tiempo-border',
  pilot: 'bg-info-subtle text-info-text border-status-en-revision-border',
  soon: 'bg-surface-muted text-text-muted border-border',
} as const;

/** Disponible / Piloto / Próximamente. Firma Avocat rows follow SIGNATURE_PROVIDER_LIVE. */
export default function StatusChip({ status, signatureLive = false, className = '' }: { status: FeatureStatus; signatureLive?: boolean; className?: string }) {
  const s = effectiveStatus(status, signatureLive);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-medium whitespace-nowrap ${STYLE[s]} ${className}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}
