import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

const PLANS = [
  {
    id: 'student',
    name: 'Estudiante',
    price: '€3',
    unit: 'por escrito',
    description: 'Tutor socrático de Derecho. Aprende razonando.',
    href: '/signup?plan=estudiantes',
    cta: 'Empezar',
    featured: false,
    features: [
      'Agente tutor socrático',
      'Generación de escritos',
      'Feedback sobre errores',
      'Sin suscripción mensual',
    ],
  },
  {
    id: 'lawyer',
    name: 'Abogado',
    price: '€75',
    unit: 'mes',
    description: 'Gestión completa de casos + agente IA avanzado.',
    href: '/signup?plan=abogados',
    cta: 'Comenzar ahora',
    featured: true,
    badge: 'Más popular',
    features: [
      'Agente IA con contexto de casos',
      'Dashboard KPIs + Charts',
      'Escritos en formato oficial',
      'Directorio de clientes',
      'Historial por caso',
      'Soporte prioritario',
    ],
  },
  {
    id: 'self',
    name: 'Particular',
    price: '€50',
    unit: 'mes',
    description: 'Asistente legal en lenguaje llano, sin tecnicismos.',
    href: '/signup?plan=autoservicio',
    cta: 'Empezar',
    featured: false,
    features: [
      'Asistente en lenguaje simple',
      'Guías de reclamación paso a paso',
      'Generación de documentos',
      'Disponible 24/7',
    ],
  },
];

export default function PricingSection() {
  return (
    <section id="precios" className="bg-avocat-cream py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-h2 text-avocat-black text-center mb-2">
          Planes transparentes
        </h2>
        <p className="text-body text-avocat-gray5 text-center mb-12">
          Sin permanencia. Cancela cuando quieras.
        </p>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={[
                'rounded-xl border p-6 flex flex-col',
                plan.featured
                  ? 'bg-avocat-black border-avocat-gold shadow-elevated scale-[1.02]'
                  : 'bg-white border-avocat-border shadow-card',
              ].join(' ')}
            >
              {/* Badge */}
              {plan.badge && (
                <Tag variant="gold" size="sm" className="self-start mb-4">
                  {plan.badge}
                </Tag>
              )}

              <h3
                className={`font-display text-h3 mb-1 ${
                  plan.featured ? 'text-avocat-cream' : 'text-avocat-black'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-small mb-4 ${
                  plan.featured ? 'text-ds-text' : 'text-avocat-gray5'
                }`}
              >
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={`text-[40px] font-display font-semibold ${
                    plan.featured ? 'text-avocat-gold-l' : 'text-avocat-black'
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-small ml-1 ${
                    plan.featured ? 'text-ds-text' : 'text-avocat-gray5'
                  }`}
                >
                  /{plan.unit}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg
                      className={`mt-0.5 flex-shrink-0 w-4 h-4 ${
                        plan.featured ? 'text-avocat-gold' : 'text-avocat-gold'
                      }`}
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M3 8l4 4 6-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span
                      className={`text-small ${
                        plan.featured ? 'text-ds-text' : 'text-avocat-gray5'
                      }`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  variant={plan.featured ? 'BtnGold' : 'BtnOutlineDark'}
                  size="md"
                  fullWidth
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-small text-avocat-gray9 text-center mt-8">
          ¿Equipo grande o institución? <Link href="/contacto" className="text-avocat-gold hover:underline">Contáctanos</Link> para un plan Enterprise.
        </p>
      </div>
    </section>
  );
}
