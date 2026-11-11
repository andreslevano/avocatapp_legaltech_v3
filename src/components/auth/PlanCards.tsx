'use client';

import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, PARTICULARES_LEGACY_BUNDLE, formatEuro, type StoredPlan } from '@/lib/plans';

// DS v4 PlanCard (selectable) — spec: design-system/v4/components/PlanCard.md. Prices come from lib/plans.ts.
type Plan = StoredPlan;

interface PlanCardsProps {
  selected: Plan | '';
  onChange: (plan: Plan) => void;
}

export default function PlanCards({ selected, onChange }: PlanCardsProps) {
  return (
    <div>
      <p id="plan-label" className="text-small font-medium text-text-muted mb-2">Selecciona tu plan *</p>
      <div role="radiogroup" aria-labelledby="plan-label" className="space-y-3">
        {PLAN_ORDER.map(id => {
          const plan = PLANS[id];
          // Signup still opens the legacy subscription checkout for Particulares (see lib/plans.ts):
          // show the amount that will actually be charged.
          const shown = plan.stored === 'Autoservicio'
            ? { price: PARTICULARES_LEGACY_BUNDLE.price, unit: PARTICULARES_LEGACY_BUNDLE.unit }
            : { price: plan.price, unit: plan.unit };
          const isSelected = selected === plan.stored;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(plan.stored)}
              className={[
                'w-full text-left px-4 py-3 rounded-lg border transition-colors duration-fast',
                isSelected
                  ? 'border-accent bg-accent-subtle ring-1 ring-accent'
                  : 'border-border-strong bg-surface hover:border-accent-border',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden
                    className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${isSelected ? 'bg-accent border-accent text-text-on-accent' : 'border-border-strong'}`}
                  >
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-small font-semibold text-text-heading">{plan.name}</p>
                    <p className="text-caption text-text-muted">{plan.forWho}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-semibold text-h3 text-text-heading">{formatEuro(shown.price)}</span>
                  <span className="text-caption text-text-muted">{shown.unit}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-text-muted">Precios con IVA incluido.</p>
    </div>
  );
}

export type { Plan };
