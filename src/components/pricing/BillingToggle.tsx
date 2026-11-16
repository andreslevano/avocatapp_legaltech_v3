'use client';

import type { Interval } from '@/lib/pricing';

/** Mensual / Anual ("2 meses gratis"). */
export default function BillingToggle({ value, onChange }: { value: Interval; onChange: (v: Interval) => void }) {
  const opt = (v: Interval, label: string, extra?: string) => (
    <button type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
      className={`min-h-touch sm:min-h-0 px-4 py-2 rounded-full text-small font-medium transition-colors ${value === v ? 'bg-action-primary text-on-action-primary' : 'text-text hover:bg-surface-muted'}`}>
      {label}{extra && <span className={`ml-1.5 text-caption ${value === v ? '' : 'text-accent-text'}`}>{extra}</span>}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Facturación" className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface p-1"
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(value === 'monthly' ? 'annual' : 'monthly'); }
      }}>
      {opt('monthly', 'Mensual')}
      {opt('annual', 'Anual', '2 meses gratis')}
    </div>
  );
}
