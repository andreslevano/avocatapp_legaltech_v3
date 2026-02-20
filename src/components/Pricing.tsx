'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

export default function Pricing() {
  const { t } = useI18n();

  const plans = [
    {
      name: t('pricing.students.title'),
      price: '3,00',
      period: t('pricing.students.period'),
      description: t('pricing.students.description'),
      features: [
        t('pricing.students.feature1'),
        t('pricing.students.feature2'),
        t('pricing.students.feature3'),
        t('pricing.students.feature4'),
        t('pricing.students.feature5'),
        t('pricing.students.feature6'),
        t('pricing.students.feature7'),
      ],
      popular: false,
      cta: t('pricing.students.startNow'),
      href: '/signup?plan=estudiantes',
      isFixedPrice: true,
    },
    {
      name: 'AUTOSERVICIO',
      price: '50',
      period: 'mes',
      description: '',
      features: [
        'Generación de escritos',
        'Análisis de documentos',
        'Extracción de datos',
        'Revisión y extracción de datos de email',
        'Tu propio repositorio de documentos',
        '100 créditos por mes',
      ],
      popular: false,
      cta: 'Empezar ahora',
      href: '/signup?plan=autoservicio',
      isFixedPrice: true,
    },
    {
      name: 'ABOGADOS',
      price: '75',
      period: 'mes',
      description: '',
      features: [
        'Dashboard y métricas',
        'Gestión de casos (crear, analizar, urgentes, vencidos)',
        'Directorio de clientes',
        'Repositorio de documentos',
        'Generación de escritos (Reclamación, Tutela, Otros)',
        'Análisis de documentos con IA',
        'Extracción de datos',
      ],
      popular: true,
      cta: 'Empezar ahora',
      href: '/signup?plan=abogados',
      isBeta: false,
    },
  ];


  return (
    <section id="precios" className="py-20 bg-app">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-h1 font-bold text-text-primary mb-4">
            Precios Simples y Transparentes
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Elige el plan que se adapte a tu práctica.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`card relative flex flex-col h-full ${
                plan.popular
                  ? 'ring-2 ring-sidebar shadow-xl scale-105'
                  : 'hover:shadow-xl'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-sidebar text-text-on-dark px-4 py-1 rounded-full text-small font-medium">
                    Más Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-h2 font-bold text-text-primary mb-2">{plan.name}</h3>
                {plan.description && <p className="text-body text-text-secondary mb-4">{plan.description}</p>}

                <div className="mb-2">
                  {plan.name === t('pricing.students.title') ? (
                    <>
                      <span className="text-4xl font-bold text-text-primary">€{plan.price}</span>
                      <span className="text-text-secondary">/{plan.period}</span>
                    </>
                  ) : plan.name === 'AUTOSERVICIO' ? (
                    <>
                      <span className="text-4xl font-bold text-text-primary">€{plan.price}</span>
                      <span className="text-text-secondary">/{plan.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-text-primary">€{plan.price}</span>
                      <span className="text-text-secondary">/{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1 min-h-0">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-text-primary mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-body text-text-primary">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors mt-auto ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-card rounded-2xl p-8 max-w-4xl mx-auto shadow-sm border border-border">
            <h3 className="text-h2 font-semibold text-text-primary mb-4">
              ¿Necesitas un Plan Personalizado?
            </h3>
            <p className="text-body text-text-secondary mb-6">
              Ofrecemos precios personalizados para bufetes con requisitos específicos.
              Contacta a nuestro equipo de ventas para discutir tus necesidades.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="btn-primary">
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

