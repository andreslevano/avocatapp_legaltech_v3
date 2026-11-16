'use client';

// /precios — the navigable pricing experience (Precios v4). Data: src/lib/pricing.ts. Country,
// billing interval and profile are client state, reflected in the URL (?pais, ?perfil) and the
// avocat_pais cookie (functional, consent-free).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, FileSignature, Mail, ShieldCheck, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  COUNTRIES, COUNTRY_COOKIE, ctaFor, displayPrice, formatPrice, planTaxLine, LADDER, localize, PACK_CREDITS, PACK_PRICES, planById, PRICES, PRICING_PLANS,
  PROFILES, pricingFaqs, SIGNATURE, sendsLabel, taxLine, WELCOME_CREDITS, isProfileId,
  type Availability, type CountryCode, type Interval, type PricingPlanId, type ProfileId,
} from '@/lib/pricing';
import { trackPricing } from '@/lib/pricing-analytics';
import CountrySelector from './CountrySelector';
import BillingToggle from './BillingToggle';
import ProfileTabs from './ProfileTabs';
import PlanCard from './PlanCard';
import EmpresaBanner from './EmpresaBanner';
import CreditCostTable from './CreditCostTable';
import CreditEstimator from './CreditEstimator';
import ComparisonTable from './ComparisonTable';
import PricingFAQ from './PricingFAQ';
import StatusChip from './StatusChip';
import WaitlistForm from './WaitlistForm';

interface Props {
  initialCountry: CountryCode;
  initialProfile: ProfileId;
  initialInterval: Interval;
  availability: Availability;
}

const SECTION = 'max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16';
const H2 = 'font-display text-h2 text-text-heading';

function setUrl(params: Record<string, string | null>) {
  try {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k)));
    window.history.replaceState(null, '', url.toString());
  } catch { /* no-op */ }
}

export default function PricingExperience({ initialCountry, initialProfile, initialInterval, availability }: Props) {
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [interval, setInterval] = useState<Interval>(initialInterval);
  const [profile, setProfile] = useState<ProfileId>(initialProfile);
  const firmaRef = useRef<HTMLElement>(null);
  const live = availability.signatureLive;
  const sellable = Object.values(availability.plans[country]).some(p => p?.monthly || p?.annual);

  const changeCountry = (c: CountryCode) => {
    setCountry(c);
    try { document.cookie = `${COUNTRY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`; } catch { /* no-op */ }
    setUrl({ pais: c.toLowerCase() });
    trackPricing('pricing_country_change', { country: c });
  };
  const changeInterval = (i: Interval) => {
    setInterval(i);
    trackPricing('pricing_billing_toggle', { country, interval: i });
  };
  const changeProfile = useCallback((p: ProfileId, scroll = false) => {
    setProfile(p);
    setUrl({ perfil: p });
    trackPricing('pricing_profile_select', { country, profile: p });
    if (scroll) document.getElementById('perfiles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [country]);

  // #estudiante / #particular / #abogado / #empresa open that profile.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (isProfileId(h)) { setProfile(h); setTimeout(() => document.getElementById('perfiles')?.scrollIntoView({ block: 'start' }), 0); }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  // Signature section seen (once).
  useEffect(() => {
    const el = firmaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { trackPricing('pricing_signature_section_view', { country }); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [country]);

  const ladder = PRICING_PLANS.filter(p => p.id !== 'empresa-medida');
  const current = PROFILES.find(p => p.id === profile)!;
  const profilePlans = PRICING_PLANS.filter(p => p.profile === profile);
  const abogadoCta = ctaFor('abogado', country, 'monthly', availability);

  return (
    <div className="bg-bg">
      {/* a. Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-16 pb-6 text-center">
        <h1 className="font-display text-h1 md:text-display text-text-heading max-w-3xl mx-auto">
          Precios claros para cada forma de trabajar con el Derecho
        </h1>
        <p className="mt-4 text-body-lg text-text-muted max-w-2xl mx-auto">
          Los mismos créditos en todos los países, precios en tu moneda y firma electrónica incluida.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <CountrySelector value={country} onChange={changeCountry} />
          <BillingToggle value={interval} onChange={changeInterval} />
        </div>
        {!sellable && (
          <p className="mt-4 text-small text-text-muted">
            Aún no se puede contratar en {COUNTRIES[country].name}: puedes ver los precios y apuntarte para que te avisemos.
          </p>
        )}
        <div className="mt-8"><ProfileTabs value={profile} onChange={p => changeProfile(p, true)} /></div>
      </section>

      {/* b. Plan ladder */}
      <section aria-labelledby="planes-title" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h2 id="planes-title" className="sr-only">Planes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-3">
          {ladder.map(p => (
            <div key={p.id} className={p.profile === profile ? 'rounded-2xl ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}>
              <PlanCard plan={p} country={country} interval={interval} availability={availability} />
            </div>
          ))}
        </div>
        <EmpresaBanner country={country} availability={availability} />
        <p className="mt-4 text-caption text-text-muted text-center">
          Al crear tu cuenta recibes {WELCOME_CREDITS} créditos de bienvenida. ¿Necesitas más? Pack de {PACK_CREDITS} créditos por{' '}
          {formatPrice(country, PACK_PRICES[country])} ({taxLine(country, false)}), con o sin plan.
        </p>
      </section>

      {/* c. Profile blocks */}
      <section id="perfiles" aria-labelledby="perfil-title" className={`${SECTION} scroll-mt-20`}>
        <span id="estudiante" /><span id="particular" /><span id="abogado" /><span id="empresa" />
        <div id={`panel-${current.id}`} role="tabpanel" aria-labelledby={`tab-${current.id}`} className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-label uppercase tracking-widest text-accent-text font-semibold">{current.label}</p>
            <h2 id="perfil-title" className={`${H2} mt-2`}>{localize(current.title, country)}</h2>
            <p className="mt-3 text-body text-text-muted max-w-2xl">{localize(current.forWho, country)}</p>
            <h3 className="mt-8 text-h4 font-sans font-semibold text-text-heading">Cómo funciona</h3>
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
              {current.steps.map((s, i) => (
                <li key={s} className="rounded-xl border border-border bg-surface p-4 text-small text-text">
                  <span className="block text-label font-semibold text-accent-text mb-1">{i + 1}</span>{localize(s, country)}
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-h4 font-sans font-semibold text-text-heading">Incluye</h3>
                <ul className="mt-2 space-y-1.5 text-small text-text">
                  {current.included.map(x => <li key={x} className="flex gap-2"><Check size={16} aria-hidden className="mt-0.5 text-success-text flex-shrink-0" />{localize(x, country)}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-h4 font-sans font-semibold text-text-heading">No incluye</h3>
                <ul className="mt-2 space-y-1.5 text-small text-text-muted">
                  {current.notIncluded.map(x => <li key={x} className="flex gap-2"><Minus size={16} aria-hidden className="mt-0.5 flex-shrink-0" />{localize(x, country)}</li>)}
                </ul>
              </div>
            </div>
            {current.id === 'empresa' && (
              <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-small text-text space-y-2">
                <p><strong className="font-semibold">Despacho o empresa con área legal.</strong> Los dos espacios —el del {localize('despacho', country)} y el de la empresa— comparten créditos y envíos a firma. <StatusChip status="soon" /></p>
                <p><strong className="font-semibold">Miembros y externos.</strong> Los miembros trabajan en Avocat y consumen créditos. Los externos —socios, clientes y proveedores— revisan y firman sin coste: 25 en Inicial, 250 en Negocio e ilimitados a medida.</p>
                <p><strong className="font-semibold">Roles.</strong> Administrador, miembro y externo, con permisos por espacio. <StatusChip status="soon" /></p>
                <p className="text-text-muted">¿Más usuarios de los que incluye tu plan? Pasa a Empresa Negocio o <a className="text-accent-text underline" href="/contacto?motivo=empresa">habla con ventas</a>.</p>
              </div>
            )}
          </div>
          <aside className="space-y-4">
            {profilePlans.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-small font-semibold text-text-heading">{p.name}</p>
                <p className="text-small text-text">
                  {priceLine(p.id, country, interval)}
                </p>
                <a href={`#plan-${p.id}`} className="mt-1 inline-flex items-center gap-1 text-caption text-accent-text hover:underline">
                  Ver el plan <ArrowRight size={16} aria-hidden />
                </a>
              </div>
            ))}
            <div>
              <h3 className="text-h4 font-sans font-semibold text-text-heading mb-2">Preguntas sobre {current.label}</h3>
              <PricingFAQ items={current.faqs.map(f => ({ q: localize(f.q, country), a: localize(f.a, country) }))} />
            </div>
          </aside>
        </div>
      </section>

      {/* c2. Firma Avocat */}
      <section id="firma" ref={firmaRef} aria-labelledby="firma-title" className="bg-surface-muted border-y border-border scroll-mt-20">
        <div className={SECTION}>
          <div className="flex flex-wrap items-center gap-3">
            <FileSignature size={24} aria-hidden className="text-accent-text" />
            <h2 id="firma-title" className={H2}>Firma electrónica incluida — sin cuentas de terceros</h2>
            <StatusChip status="signature" signatureLive={live} />
          </div>
          <p className="mt-3 text-body text-text-muted max-w-3xl">
            {SIGNATURE.brand}, con tecnología de {SIGNATURE.poweredBy}. Tú no necesitas ninguna cuenta: genera el documento, pulsa «Firmar y enviar» y listo.
          </p>
          <ol className="mt-8 grid gap-3 md:grid-cols-4">
            {[
              'Genera el documento en Avocat',
              'Pulsa «Firmar y enviar»',
              'Firman todas las partes por email, sin cuenta',
              'El PDF firmado y el informe de pruebas se guardan en el repositorio y en el caso, y empieza el control de vencimientos',
            ].map((s, i) => (
              <li key={s} className="rounded-xl border border-border bg-surface p-4 text-small text-text">
                <span className="block text-label font-semibold text-accent-text mb-1">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-h4 font-sans font-semibold text-text-heading">Envíos incluidos cada mes</h3>
              <table className="mt-3 w-full text-small">
                <caption className="sr-only">Envíos a firma incluidos por plan</caption>
                <tbody>
                  {LADDER.map(id => (
                    <tr key={id} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-normal text-text">{planById(id).name}</th>
                      <td className="py-2 text-text">{sendsLabel(id, country)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-caption text-text-muted">
                Un envío es un documento enviado a firmar, sea cual sea el número de firmantes. El cupo se renueva cada mes y no se acumula.
                Cada envío extra cuesta {SIGNATURE.extraSendCredits} créditos.
              </p>
            </div>
            <div className="space-y-4 text-small text-text">
              <div>
                <h3 className="text-h4 font-sans font-semibold text-text-heading">Niveles de firma</h3>
                <ul className="mt-2 space-y-2">
                  <li className="flex flex-wrap items-center gap-2">Firma electrónica simple (eIDAS), con informe de pruebas <StatusChip status="signature" signatureLive={live} /></li>
                  {SIGNATURE.addOns.map(a => <li key={a.id} className="flex flex-wrap items-center gap-2">{a.label} <StatusChip status={a.status} /></li>)}
                </ul>
              </div>
              <p className="text-text-muted">{SIGNATURE.validityNote}</p>
              <p className="flex flex-wrap items-center gap-2">
                <strong className="font-semibold">¿Ya tienes DocuSign?</strong> Puedes usar tu cuenta en los planes Abogado y Empresa; esos envíos no consumen cupo. <StatusChip status="pilot" />
              </p>
              <p className="flex items-center gap-2 text-text-muted"><ShieldCheck size={16} aria-hidden /> Datos alojados en la Unión Europea.</p>
            </div>
          </div>
        </div>
      </section>

      {/* d. Credits */}
      <section id="creditos" aria-labelledby="creditos-title" className={`${SECTION} scroll-mt-20`}>
        <h2 id="creditos-title" className={H2}>Cómo funcionan los créditos</h2>
        <p className="mt-3 text-body text-text-muted max-w-3xl">
          Cada plan incluye créditos al mes. Pagas solo por lo que haces, y lo que cuesta cada acción es público.
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <CreditCostTable signatureLive={live} />
            <ul className="mt-6 space-y-2 text-small text-text">
              <li><strong className="font-semibold">Bienvenida:</strong> {WELCOME_CREDITS} créditos al crear tu cuenta (una vez).</li>
              <li><strong className="font-semibold">Pack extra:</strong> {PACK_CREDITS} créditos por {formatPrice(country, PACK_PRICES[country])} ({taxLine(country, false)}), con o sin plan. Sale más caro por crédito que cualquier plan.</li>
              <li><strong className="font-semibold">Si te quedas sin créditos:</strong> compra un pack o pasa a un plan superior; no se corta nada de lo que ya tienes.</li>
              <li><strong className="font-semibold">Uso justo (Abogado):</strong> los 600 créditos cubren el trabajo diario de un abogado; para más volumen, Empresa.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-h4 font-sans font-semibold text-text-heading mb-4">Calcula tu plan</h3>
            <CreditEstimator country={country} />
          </div>
        </div>
      </section>

      {/* e. Comparison */}
      <section id="comparar" aria-labelledby="comparar-title" className={`${SECTION} scroll-mt-20`}>
        <h2 id="comparar-title" className={H2}>Compara todos los planes</h2>
        <p className="mt-3 mb-6 text-body text-text-muted">Solo lo que ya existe en Avocat, con su estado: Disponible, Piloto o Próximamente.</p>
        <ComparisonTable country={country} interval={interval} signatureLive={live} />
      </section>

      {/* f. FAQ */}
      <section id="preguntas" aria-labelledby="faq-title" className={`${SECTION} scroll-mt-20 max-w-3xl`}>
        <h2 id="faq-title" className={`${H2} mb-6`}>Preguntas frecuentes</h2>
        <PricingFAQ items={pricingFaqs(country).map(f => ({ q: f.q, a: localize(f.a, country) }))} />
        <p className="mt-4 text-caption text-text-muted">
          Más información en el <a href="/aviso-legal" className="text-accent-text underline">aviso legal</a>.
        </p>
      </section>

      {/* g. Closing CTA */}
      <section aria-labelledby="cta-title" className="border-t border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 id="cta-title" className={H2}>Empieza hoy</h2>
          <p className="mt-3 text-body text-text-muted">
            Prueba el plan Abogado {planById('abogado').trialDays} días gratis, o cuéntanos qué necesita tu {localize('despacho', country)} o tu empresa.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            {abogadoCta.kind === 'waitlist'
              ? <div className="max-w-sm mx-auto sm:mx-0 w-full text-left"><WaitlistForm country={country} plan="abogado" /></div>
              : <Button href={abogadoCta.href} variant="accent" onClick={() => trackPricing('pricing_cta_click', { country, plan: 'abogado', interval: 'monthly', kind: abogadoCta.kind })}>{abogadoCta.label}</Button>}
            <Button href={`/contacto?motivo=empresa&pais=${country.toLowerCase()}`} variant="secondary" icon={Mail}
              onClick={() => trackPricing('pricing_cta_click', { country, plan: 'empresa', interval: 'monthly', kind: 'contact' })}>
              Hablar con ventas
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** "69 €/mes · IVA no incluido" for the profile aside. */
function priceLine(id: PricingPlanId, country: CountryCode, interval: Interval): string {
  const d = displayPrice(id, country, interval);
  return `${PRICES[country][id].from ? 'Desde ' : ''}${formatPrice(country, d.amount)}${d.per} · ${planTaxLine(id, country)}`;
}
