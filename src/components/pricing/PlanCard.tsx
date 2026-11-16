'use client';

// One step of the plan ladder: price + tax line, credits and equivalents, signature sends, users,
// four key features and the CTA for this country's availability (D6/D7).
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  COUNTRIES, creditEquivalents, ctaFor, formatNumber, formatPrice, localize, priceFor, sendsLabel, SIGNATURE, taxLine,
  type Availability, type CountryCode, type Interval, type PricingPlan,
} from '@/lib/pricing';
import { trackPricing } from '@/lib/pricing-analytics';
import StatusChip from './StatusChip';
import WaitlistForm from './WaitlistForm';

interface Props { plan: PricingPlan; country: CountryCode; interval: Interval; availability: Availability }

export default function PlanCard({ plan, country, interval, availability }: Props) {
  const [waitlist, setWaitlist] = useState(false);
  const price = priceFor(plan.id, country, interval);
  const monthly = priceFor(plan.id, country, 'monthly')!;
  const cta = ctaFor(plan.id, country, interval, availability);
  const credits = plan.creditsPerMonth;
  const eq = credits ? creditEquivalents(credits) : null;
  const featured = !!plan.badge;
  const sends = SIGNATURE.monthlySends[plan.id];

  const onCta = () => {
    trackPricing('pricing_cta_click', { country, plan: plan.id, interval, kind: cta.kind });
    if (cta.kind === 'waitlist') setWaitlist(true);
  };

  return (
    <article id={`plan-${plan.id}`} aria-labelledby={`plan-${plan.id}-name`}
      className={`relative flex flex-col rounded-2xl border p-5 bg-surface ${featured ? 'border-accent-border shadow-md' : 'border-border'}`}>
      {plan.badge && (
        <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-0.5 text-caption font-semibold text-text-on-accent">{plan.badge}</span>
      )}
      <h3 id={`plan-${plan.id}-name`} className="text-h4 font-sans font-semibold text-text-heading">{plan.name}</h3>
      <p className="mt-1 text-caption text-text-muted min-h-[3em]">{localize(plan.forWho, country)}</p>

      <div className="mt-4">
        <p className="flex items-baseline gap-1">
          <span className="font-display text-h2 text-text-heading">{formatPrice(country, price ?? monthly)}</span>
          <span className="text-small text-text-muted">{interval === 'annual' ? '/año' : '/mes'}</span>
        </p>
        <p className="text-caption text-text-muted">
          {taxLine(country, plan.b2b)}
          {interval === 'annual' && <> · 2 meses gratis ({formatPrice(country, monthly)}/mes en mensual)</>}
        </p>
      </div>

      <ul className="mt-4 space-y-1.5 text-small text-text">
        <li><strong className="font-semibold">{formatNumber(country, credits!)} créditos/mes</strong>{plan.fairUse && ' (uso justo)'}{plan.members && plan.members > 1 ? ' compartidos' : ''}
          {eq && <span className="block text-caption text-text-muted">≈ {formatNumber(country, eq.consultas)} consultas o {formatNumber(country, eq.documentos)} documentos</span>}
        </li>
        <li className="flex flex-wrap items-center gap-1.5">
          <span>{sends === null ? 'Sin firma (práctica)' : `Firma: ${sendsLabel(plan.id, country)}`}</span>
          {sends !== null && <StatusChip status="signature" signatureLive={availability.signatureLive} />}
        </li>
        <li>{plan.usersLabel}{plan.externalsIncluded ? ` · ${formatNumber(country, plan.externalsIncluded as number)} externos sin coste` : ''}</li>
      </ul>

      <ul className="mt-4 space-y-1.5 text-small text-text flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex gap-2"><Check size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-success-text" />{localize(f, country)}</li>
        ))}
      </ul>

      <p className="mt-4 text-caption text-text-muted">
        {credits && `${formatPrice(country, Math.round((monthly / credits) * 1000) / 1000)} por crédito`}
        {plan.trialDays > 0 && cta.kind === 'checkout' && ` · ${plan.trialDays} días gratis`}
      </p>

      <div className="mt-3">
        {waitlist ? (
          <WaitlistForm country={country} plan={plan.id} />
        ) : cta.kind === 'waitlist' ? (
          <Button variant={featured ? 'accent' : 'secondary'} block onClick={onCta} aria-expanded={false}>{cta.label}</Button>
        ) : (
          <Button href={cta.href} variant={featured ? 'accent' : 'secondary'} block onClick={onCta}>{cta.label}</Button>
        )}
        {cta.kind === 'waitlist' && !waitlist && (
          <p className="mt-2 text-caption text-text-muted">Aún no se puede contratar en {COUNTRIES[country].name}.</p>
        )}
      </div>
    </article>
  );
}
