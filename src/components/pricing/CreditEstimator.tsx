'use client';

// Estimator (D8): usage per month → credits → recommended plan and its monthly price in the selected
// currency. Deterministic, client-side, keyboard accessible (labelled number inputs, live result).
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { estimate, formatNumber, formatPrice, planById, PRICES, taxLine, type CountryCode } from '@/lib/pricing';
import { trackPricing } from '@/lib/pricing-analytics';

const FIELDS = [
  { key: 'consultas', label: 'Consultas al mes', hint: '1 crédito cada una' },
  { key: 'documentos', label: 'Documentos generados al mes', hint: '3 créditos cada uno' },
  { key: 'analisis', label: 'Documentos analizados al mes', hint: '5 créditos cada uno' },
  { key: 'personas', label: 'Personas que trabajarán en Avocat', hint: 'Miembros (los externos no cuentan)' },
] as const;

export default function CreditEstimator({ country }: { country: CountryCode }) {
  const [v, setV] = useState({ consultas: 30, documentos: 8, analisis: 4, personas: 1 });
  const [student, setStudent] = useState(false);
  const tracked = useRef(false);
  const r = estimate({ ...v, estudiante: student });
  const plan = planById(r.planId);
  const price = PRICES[country][r.planId];

  const change = (key: keyof typeof v, value: string) => {
    setV(p => ({ ...p, [key]: Math.max(0, Math.min(100_000, Number(value) || 0)) }));
    if (!tracked.current) { tracked.current = true; trackPricing('pricing_estimator_use', { country }); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="space-y-3" onSubmit={e => e.preventDefault()} aria-label="Calcula tu plan">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={`est-${f.key}`} className="block text-small text-text">{f.label}</label>
            <input id={`est-${f.key}`} type="number" inputMode="numeric" min={f.key === 'personas' ? 1 : 0} max={100000} step={1}
              aria-describedby={`est-${f.key}-hint`} value={v[f.key]} onChange={e => change(f.key, e.target.value)}
              className="mt-1 w-full min-h-touch sm:min-h-0 bg-bg border border-border-strong rounded-lg px-3 py-2 text-small text-text tabular-nums" />
            <p id={`est-${f.key}-hint`} className="text-caption text-text-muted mt-0.5">{f.hint}</p>
          </div>
        ))}
        <label className="flex items-center gap-2 min-h-touch sm:min-h-0 text-small text-text cursor-pointer">
          <input type="checkbox" checked={student} onChange={e => setStudent(e.target.checked)} className="accent-accent" />
          Soy estudiante de Derecho
        </label>
      </form>
      <div role="status" aria-live="polite" className="rounded-2xl border border-accent-border bg-accent-subtle p-5 self-start">
        <p className="text-caption text-text-muted">Necesitas unos</p>
        <p className="font-display text-h2 text-text-heading">{formatNumber(country, r.credits)} créditos/mes</p>
        <p className="mt-3 text-caption text-text-muted">Te recomendamos</p>
        <p className="text-h4 font-sans font-semibold text-text-heading">{plan.name}</p>
        <p className="text-small text-text">
          {price.from ? 'Desde ' : ''}{formatPrice(country, price.monthly)}/mes · {taxLine(country, plan.b2b)}
        </p>
        <Button href={`#plan-${r.planId}`} variant="secondary" size="sm" className="mt-4"
          onClick={() => trackPricing('pricing_cta_click', { country, plan: r.planId, interval: 'monthly', kind: 'estimator' })}>
          Ver el plan {plan.name}
        </Button>
      </div>
    </div>
  );
}
