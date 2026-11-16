'use client';

// Selectable plan list for signup / onboarding (Precios v4). Prices, taxes and availability come from
// src/lib/pricing.ts for the visitor's country and the chosen interval.
import Link from 'next/link';
import { Check } from 'lucide-react';
import {
  COUNTRIES, ctaFor, formatPrice, LADDER, localize, planById, priceFor, taxLine,
  type Availability, type CountryCode, type Interval, type PricingPlanId,
} from '@/lib/pricing';

/** @deprecated stored plan value; new code selects a PricingPlanId. */
export type { StoredPlan as Plan } from '@/lib/pricing';

interface PlanCardsProps {
  selected: PricingPlanId | '';
  onChange: (plan: PricingPlanId) => void;
  country: CountryCode;
  interval: Interval;
  /** When given, plans that can't be bought here are labelled ("Solicitar demo", "Aún no disponible"). */
  availability?: Availability;
  /** Empresa Inicial / Negocio (signup yes; onboarding of existing users no). */
  includeEmpresa?: boolean;
}

export default function PlanCards({ selected, onChange, country, interval, availability, includeEmpresa = true }: PlanCardsProps) {
  const ids = LADDER.filter(id => id !== 'empresa-medida' && (includeEmpresa || planById(id).profile !== 'empresa'));
  return (
    <div>
      <p id="plan-label" className="text-small font-medium text-text-muted mb-2">Selecciona tu plan *</p>
      <div role="radiogroup" aria-labelledby="plan-label" className="space-y-3">
        {ids.map(id => {
          const plan = planById(id);
          const price = priceFor(id, country, interval)!;
          const isSelected = selected === id;
          const cta = availability ? ctaFor(id, country, interval, availability) : null;
          const note = cta && cta.kind !== 'checkout'
            ? (cta.kind === 'contact' ? 'Te contactamos para una demostración' : `Aún no se puede contratar en ${COUNTRIES[country].name}`)
            : plan.trialDays ? `${plan.trialDays} días gratis` : null;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(id)}
              className={[
                'w-full text-left px-4 py-3 rounded-lg border transition-colors duration-fast',
                isSelected ? 'border-accent bg-accent-subtle ring-1 ring-accent' : 'border-border-strong bg-surface hover:border-accent-border',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span aria-hidden className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${isSelected ? 'bg-accent border-accent text-text-on-accent' : 'border-border-strong'}`}>
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-small font-semibold text-text-heading">{plan.name}</p>
                    <p className="text-caption text-text-muted">{localize(plan.forWho, country)}</p>
                    {note && <p className="text-caption text-accent-text mt-0.5">{note}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-semibold text-h3 text-text-heading">{formatPrice(country, price)}</span>
                  <span className="text-caption text-text-muted">{interval === 'annual' ? '/año' : '/mes'}</span>
                  <span className="block text-caption text-text-muted">{taxLine(country, plan.b2b)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-text-muted">
        {includeEmpresa && <>¿Más de 10 personas? <Link href="/contacto?motivo=empresa&plan=empresa-medida" className="text-accent-text underline">Empresa a Medida</Link>. </>}
        <Link href="/precios#comparar" className="text-accent-text underline">Comparar planes</Link>
      </p>
    </div>
  );
}
