import Link from 'next/link';
import { Check } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { buttonClasses } from '@/components/ui/Button';
import { PLANS, PLAN_ORDER, SALES_CONTACT, formatEuro } from '@/lib/plans';

// DS v4 PlanCard (pricing) — prices only from lib/plans.ts.
export default function PricingSection() {
  return (
    <section className="bg-bg py-20 border-t border-border" id="precios">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <p className="text-label font-semibold text-accent-text uppercase mb-3">Precios</p>
          <h2 className="text-h2">Simple y transparente</h2>
          <p className="text-body text-text-muted mt-3">Precios con IVA incluido. Cambia de plan cuando quieras.</p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-5">
          {PLAN_ORDER.map((id, i) => {
            const plan = PLANS[id];
            return (
              <AnimatedSection key={plan.id} delay={i * 100}>
                <article
                  data-theme={plan.featured ? 'dark' : undefined}
                  className={`relative h-full rounded-xl border p-6 flex flex-col bg-surface ${plan.featured ? 'border-accent shadow-md' : 'border-border'}`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-accent text-text-on-accent px-3 py-0.5 text-caption font-medium">
                      Más elegido
                    </span>
                  )}
                  <h3 className="text-h4 text-text-heading">{plan.name}</h3>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-h1 text-text-heading">{formatEuro(plan.price)}</span>
                    <span className="text-small text-text-muted">{plan.unit}</span>
                  </p>
                  <p className="text-body-sm text-text-muted mt-1">{plan.forWho}</p>
                  <ul className="space-y-2.5 my-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-body-sm text-text">
                        <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.ctaHref} className={buttonClasses({ variant: plan.featured ? 'accent' : 'secondary', block: true })}>
                    {plan.cta}
                  </Link>
                  <p className="mt-3 text-caption text-text-muted text-center">{plan.fine}</p>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={400} className="mt-8 text-center">
          <p className="text-body-sm text-text-muted">
            {SALES_CONTACT.prompt}{' '}
            <Link href={SALES_CONTACT.href} className="font-medium text-accent-text underline underline-offset-2">
              {SALES_CONTACT.label}
            </Link>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
