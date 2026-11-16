'use client';

// Home pricing summary (Precios v4): Estudiante, Particular, Abogado and Empresa ("desde") in the
// visitor's country, linking to the full /precios. Country: avocat_pais cookie (set on /precios)
// or the browser language region; Spain by default. Prices only from src/lib/pricing.ts.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { buttonClasses } from '@/components/ui/Button';
import {
  COUNTRY_COOKIE, formatNumber, formatPrice, localize, planById, planTaxLine, PRICES, resolveCountryFrom,
  type CountryCode, type PricingPlanId,
} from '@/lib/pricing';

const CARDS: { plan: PricingPlanId; profile: string; label?: string; from?: boolean }[] = [
  { plan: 'estudiante', profile: 'estudiante' },
  { plan: 'particular', profile: 'particular' },
  { plan: 'abogado', profile: 'abogado' },
  { plan: 'empresa-inicial', profile: 'empresa', label: 'Empresa', from: true },
];

export default function PricingSection() {
  const [country, setCountry] = useState<CountryCode>('ES');
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(c => c.startsWith(`${COUNTRY_COOKIE}=`))?.split('=')[1];
    setCountry(resolveCountryFrom({ cookie, headers: { 'accept-language': navigator.languages?.join(',') ?? navigator.language } }));
  }, []);

  return (
    <section className="bg-bg py-20 border-t border-border" id="precios">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <p className="text-label font-semibold text-accent-text uppercase mb-3">Precios</p>
          <h2 className="text-h2">Precios claros, en tu moneda</h2>
          <p className="text-body text-text-muted mt-3">Créditos transparentes y firma electrónica incluida. Cambia de plan cuando quieras.</p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARDS.map((c, i) => {
            const plan = planById(c.plan);
            const featured = c.plan === 'abogado';
            const price = PRICES[country][c.plan].monthly;
            return (
              <AnimatedSection key={c.plan} delay={i * 100}>
                <article
                  data-theme={featured ? 'dark' : undefined}
                  className={`relative h-full rounded-xl border p-6 flex flex-col bg-surface ${featured ? 'border-accent shadow-md' : 'border-border'}`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-accent text-text-on-accent px-3 py-0.5 text-caption font-medium">Más elegido</span>
                  )}
                  <h3 className="text-h4 text-text-heading">{c.label ?? plan.name}</h3>
                  <p className="mt-2 flex items-baseline gap-1">
                    {c.from && <span className="text-small text-text-muted">desde</span>}
                    <span className="font-display text-h1 text-text-heading">{formatPrice(country, price)}</span>
                    <span className="text-small text-text-muted">/mes</span>
                  </p>
                  <p className="text-caption text-text-muted">{planTaxLine(c.plan, country)}</p>
                  <p className="text-body-sm text-text-muted mt-2">{localize(c.from ? 'Despachos y empresas con área legal, de 3 a 25 personas o más.' : plan.forWho, country)}</p>
                  <ul className="space-y-2.5 my-6 flex-1">
                    <li className="flex items-start gap-2 text-body-sm text-text">
                      <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
                      {formatNumber(country, plan.creditsPerMonth!)} créditos al mes{c.from ? ' compartidos' : ''}
                    </li>
                    {plan.features.slice(0, 3).map(f => (
                      <li key={f} className="flex items-start gap-2 text-body-sm text-text">
                        <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
                        {localize(f, country)}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/precios?perfil=${c.profile}#plan-${c.plan}`} className={buttonClasses({ variant: featured ? 'accent' : 'secondary', block: true })}>
                    {featured ? `Probar ${plan.trialDays} días gratis` : 'Ver plan'}
                  </Link>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={400} className="mt-8 text-center">
          <Link href="/precios#comparar" className="inline-flex items-center gap-1.5 font-medium text-accent-text underline underline-offset-2">
            Comparar todos los planes <ArrowRight size={16} aria-hidden />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
