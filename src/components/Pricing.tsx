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
        t('pricing.students.aiDocs'),
        t('pricing.students.basicLegalResearch'),
        t('pricing.students.clientPortal'),
        t('pricing.students.emailSupport'),
        t('pricing.students.basicAnalytics'),
      ],
      popular: false,
      cta: t('pricing.students.startNow'),
      href: '/signup?plan=estudiantes',
      isFixedPrice: true,
    },
    {
      name: 'Autoservicio',
      price: '10,00',
      period: 'escrito',
      description: 'Genera documentos legales profesionales de forma automática con IA',
      features: [
        'Reclamación de Cantidades (España)',
        'Acción de Tutela (Colombia)',
        'Análisis inteligente de documentos con IA',
        'Generación automática de demandas',
        'OCR para extracción de texto',
        'Documentos listos para presentar',
        'Soporte para múltiples tipos de reclamaciones',
      ],
      popular: false,
      cta: 'Empezar ahora',
      href: '/signup?plan=autoservicio',
      isFixedPrice: true,
    },
    {
      name: '🌍 Abogados',
      price: null,
      period: null,
      description: 'Solución completa para bufetes de abogados establecidos',
      features: [
        'Análisis de Documentos con IA Ilimitado',
        'Investigación Legal Premium',
        'Clientes Ilimitados',
        'Soporte Telefónico 24/7',
        'Integraciones Personalizadas',
        'Seguridad Avanzada',
        'Gerente de Cuenta Dedicado',
        'Capacitación Personalizada',
        'API Personalizada',
        'Soporte Dedicado 24/7',
      ],
      popular: true,
      cta: 'Empezar ahora',
      href: '/signup?plan=abogados',
      isBeta: true,
    },
  ];


  return (
    <section id="precios" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precios Simples y Transparentes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Elige el plan que se adapte a tu práctica.
            </p>
        </div>




        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`card relative ${
                plan.popular
                  ? 'ring-2 ring-primary-500 shadow-xl scale-105'
                  : 'hover:shadow-xl'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Más Popular
                  </span>
                </div>
              )}

                              <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="mb-2">
                    {plan.isBeta ? (
                      <div className="text-center">
                        <div className="inline-block bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold text-lg mb-2">
                          🚀 Versión Beta Gratuita
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Acceso completo sin costo durante la fase beta
                        </p>
                      </div>
                    ) : plan.name === t('pricing.students.title') || plan.name === '🇪🇸 Estudiantes' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : plan.name === 'Autoservicio' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    )}
                  </div>
                </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
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
          <div className="bg-white rounded-2xl p-8 max-w-4xl mx-auto shadow-sm border border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              ¿Necesitas un Plan Personalizado?
            </h3>
            <p className="text-gray-600 mb-6">
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

