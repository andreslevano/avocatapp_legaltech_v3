import type { Metadata } from 'next';
import PricingExperience from '@/components/pricing/PricingExperience';
import { checkoutAvailability, requestCountry } from '@/lib/pricing-server';
import {
  COUNTRIES, isProfileId, LADDER, planById, pricingFaqs, PRICES, type Interval, type ProfileId,
} from '@/lib/pricing';

// Country comes from the request (cookie, headers): rendered per request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Precios | Avocat',
  description: 'Planes para estudiantes, particulares, abogados y empresas. Precios en tu moneda, créditos transparentes y firma electrónica incluida.',
  alternates: { canonical: '/precios' },
  openGraph: {
    title: 'Precios claros para cada forma de trabajar con el Derecho | Avocat',
    description: 'Compara los planes de Avocat: créditos, firma electrónica incluida y precios en EUR, CLP, MXN, COP y PEN.',
    url: '/precios',
  },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function PreciosPage({ searchParams }: { searchParams: Search }) {
  const country = requestCountry(one(searchParams.pais));
  const availability = checkoutAvailability();
  const perfil = one(searchParams.perfil);
  const profile: ProfileId = isProfileId(perfil) ? perfil : 'abogado';
  const interval: Interval = one(searchParams.periodo) === 'anual' ? 'annual' : 'monthly';
  const c = COUNTRIES[country];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Avocat',
      description: 'Plataforma de IA jurídica: consultas con citas, documentos, casos y firma electrónica.',
      brand: { '@type': 'Brand', name: 'Avocat' },
      offers: LADDER.map(id => {
        const p = PRICES[country][id];
        const plan = planById(id);
        return {
          '@type': 'Offer',
          name: `Plan ${plan.name}`,
          price: p.monthly,
          priceCurrency: c.currency,
          url: `/precios?pais=${country.toLowerCase()}#plan-${id}`,
          eligibleRegion: { '@type': 'Country', name: c.name },
          priceSpecification: {
            '@type': 'UnitPriceSpecification', price: p.monthly, priceCurrency: c.currency,
            unitText: 'MONTH', valueAddedTaxIncluded: !plan.b2b, ...(p.from ? { minPrice: p.monthly } : {}),
          },
        };
      }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pricingFaqs(country).map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PricingExperience initialCountry={country} initialProfile={profile} initialInterval={interval} availability={availability} />
    </>
  );
}
