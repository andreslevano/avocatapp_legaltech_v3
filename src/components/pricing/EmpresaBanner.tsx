'use client';

import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ctaFor, formatPrice, localize, planById, PRICES, taxLine, type Availability, type CountryCode } from '@/lib/pricing';
import { trackPricing } from '@/lib/pricing-analytics';

/** Empresa a Medida: 25+ users, by contract — always "Hablar con ventas". */
export default function EmpresaBanner({ country, availability }: { country: CountryCode; availability: Availability }) {
  const plan = planById('empresa-medida');
  const cta = ctaFor('empresa-medida', country, 'monthly', availability);
  return (
    <section aria-labelledby="medida-title" className="mt-6 rounded-2xl border border-border bg-surface-muted p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4">
      <Building2 size={24} aria-hidden className="text-accent-text flex-shrink-0" />
      <div className="flex-1">
        <h3 id="medida-title" className="text-h4 font-sans font-semibold text-text-heading">{plan.name} · {plan.usersLabel}</h3>
        <p className="text-small text-text-muted mt-1">
          {localize(plan.forWho, country)} Créditos y envíos a firma por contrato, externos ilimitados.{' '}
          <span className="text-text">Desde {formatPrice(country, PRICES[country]['empresa-medida'].monthly)}/mes</span> · {taxLine(country, true)}.
        </p>
      </div>
      <Button href={cta.href} variant="secondary" onClick={() => trackPricing('pricing_cta_click', { country, plan: plan.id, interval: 'monthly', kind: cta.kind })}>
        {cta.label}
      </Button>
    </section>
  );
}
