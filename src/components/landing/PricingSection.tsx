import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

const PLANS = [
  {
    id: 'student',
    name: 'Estudiantes',
    price: '€3',
    unit: '/escrito',
    desc: 'Tutor socrático y material académico',
    color: '#4A90C4',
    bg: '#f0f5ff',
    border: '#4A90C4',
    features: [
      '8 áreas legales',
      '7 tipos de escrito',
      'Tutoría socrática',
      'Dossier académico',
      'Descarga y email',
    ],
    cta: 'Empezar →',
    ctaStyle: 'border',
    featured: false,
  },
  {
    id: 'self',
    name: 'Autoservicio',
    price: '€50',
    unit: '/mes',
    desc: 'Asistente legal para particulares',
    color: '#3DAB7A',
    bg: '#f0faf5',
    border: '#3DAB7A',
    features: [
      '100 créditos/mes',
      'Análisis de documentos',
      'Extracción de datos',
      'Evaluación de riesgo',
      'Generación de escritos',
    ],
    cta: 'Empezar →',
    ctaStyle: 'border',
    featured: false,
  },
  {
    id: 'lawyer',
    name: 'Abogados',
    price: '€75',
    unit: '/mes',
    desc: 'Suite completa para el despacho profesional',
    color: '#B8882A',
    bg: '#1e1c16',
    border: '#B8882A',
    features: [
      'Dashboard y métricas',
      'Gestión completa de casos',
      'Directorio de clientes',
      'Repositorio de documentos',
      '+50 tipos de escritos',
      'Análisis IA + extracción',
      'Modo Agente completo',
    ],
    cta: 'Prueba gratis 14 días →',
    ctaStyle: 'filled',
    featured: true,
    badge: 'Más popular',
  },
  {
    id: 'solo',
    name: 'Solo escritos',
    price: '€10',
    unit: '/escrito',
    desc: 'Escritos puntuales sin suscripción',
    color: '#9a9a9a',
    bg: '#fafafa',
    border: '#C8C0B0',
    features: [
      'Acción de tutela',
      'Reclamación de cantidades',
      'Acuerdo de confidencialidad',
      'Contrato de servicio',
      '+50 escritos más',
    ],
    cta: 'Empezar →',
    ctaStyle: 'border',
    featured: false,
  },
] as const;

export default function PricingSection() {
  return (
    <section className="bg-avocat-cream py-20 border-t border-avocat-border/40" id="precios">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-avocat-gold-bg border border-avocat-gold-l/40 text-[11px] font-sans font-semibold text-avocat-gold uppercase tracking-widest mb-4">
            Precios
          </div>
          <h2
            className="font-display text-avocat-black font-semibold leading-tight"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
          >
            Simple y transparente
          </h2>
          <p className="font-sans text-[15px] text-avocat-gray5 mt-3">
            Sin costes ocultos. Cambia de plan cuando quieras.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => (
            <AnimatedSection
              key={plan.id}
              delay={i * 100}
              className="relative rounded-2xl overflow-hidden flex flex-col"
              style={{ background: plan.bg, border: `1px solid ${plan.featured ? plan.border : plan.border + '40'}` }}
            >
              {plan.featured && (
                <div
                  className="absolute top-0 left-0 right-0 py-1.5 text-center text-[10px] font-sans font-semibold text-white"
                  style={{ background: plan.color }}
                >
                  {plan.badge}
                </div>
              )}

              <div className={`p-5 flex-1 flex flex-col ${plan.featured ? 'pt-9' : ''}`}>
                {/* Plan name */}
                <p
                  className="text-[11px] font-sans font-semibold uppercase tracking-widest mb-3"
                  style={{ color: plan.color }}
                >
                  {plan.name}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: 36, color: plan.featured ? '#e8d4a0' : plan.color }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-[12px] font-sans"
                    style={{ color: plan.featured ? '#6b6050' : plan.color + '99' }}
                  >
                    {plan.unit}
                  </span>
                </div>

                {/* Divider */}
                <div
                  className="h-px my-4"
                  style={{ background: plan.featured ? '#2e2b20' : plan.border + '25' }}
                />

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] font-sans"
                      style={{ color: plan.featured ? '#c8c0ac' : '#5f5f5f' }}>
                      <div
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${plan.color}20` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: plan.color }} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/signup">
                  <button
                    className="w-full py-2.5 rounded-xl text-[13px] font-sans font-medium transition-colors"
                    style={
                      plan.ctaStyle === 'filled'
                        ? { background: plan.color, color: '#fff' }
                        : { border: `1.5px solid ${plan.color}`, color: plan.color, background: 'transparent' }
                    }
                  >
                    {plan.cta}
                  </button>
                </Link>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Enterprise banner */}
        <AnimatedSection delay={400} className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 bg-avocat-gold-bg border border-avocat-gold-l/40 rounded-xl px-6 py-4">
            <span className="text-[13px] font-sans text-avocat-gray5">
              ¿Necesitas un plan empresarial?
            </span>
            <Link
              href="/contacto"
              className="text-[13px] font-sans font-semibold text-avocat-gold hover:underline"
            >
              Contactar ventas →
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
