'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: '🇪🇸 Estudiantes',
      price: '3,00',
      period: 'escrito',
      description: 'Acceso completo para estudiantes de derecho y pasantes',
      features: [
        'Análisis de Documentos con IA (50 docs/mes)',
        'Investigación Legal Básica',
        'Portal de Clientes (hasta 10 clientes)',
        'Soporte por Email',
        'Análisis Básico',
      ],
      popular: false,
      cta: 'Empezar ahora',
      href: '/signup?plan=estudiantes',
      isFixedPrice: true,
    },
    {
      name: '🇨🇴 Acción de Tutela',
      price: '50.000',
      period: 'escrito',
      description: 'Especializado en procedimientos de tutela colombianos',
      features: [
        'Análisis de Documentos con IA (200 docs/mes)',
        'Investigación Legal Avanzada',
        'Portal de Clientes (hasta 50 clientes)',
        'Soporte Prioritario',
        'Análisis Avanzado',
        'Colaboración en Equipo',
        'Plantillas Personalizadas',
      ],
      popular: false,
      cta: 'Empezar ahora',
      href: '/signup?plan=colombia-tutela',
      isFixedPrice: true,
    },
    {
      name: '🇪🇸 Reclamación de Cantidades',
      price: '10,00',
      period: 'escrito',
      description: 'Enfoque en reclamaciones de cantidades en España',
      features: [
        'Análisis de Documentos con IA Ilimitado',
        'Investigación Legal Premium',
        'Clientes Ilimitados',
        'Soporte Telefónico 24/7',
        'Integraciones Personalizadas',
        'Seguridad Avanzada',
        'Gerente de Cuenta Dedicado',
        'Capacitación Personalizada',
      ],
      popular: false,
      cta: 'Empezar ahora',
      href: '/signup?plan=espana-reclamacion',
      isFixedPrice: true,
    },
    {
      name: '🌍 Abogados',
      price: isAnnual ? '550,00' : '50,00',
      period: isAnnual ? 'anual' : 'mes',
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
      hasBillingToggle: true,
    },
  ];

  const savings = isAnnual ? 'Ahorra 10% con facturación anual' : '';

  return (
    <section id="precios" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precios Simples y Transparentes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Elige el plan que se adapte a tu práctica. Todos los planes incluyen una prueba gratuita de 14 días 
              sin tarjeta de crédito requerida.
            </p>
        </div>



        {savings && plans.some(plan => !plan.isFixedPrice) && (
          <div className="text-center mb-8">
            <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              {savings}
            </span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
                  
                  {/* Billing Toggle for Abogados card */}
                  {plan.hasBillingToggle && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                        <button
                          onClick={() => setIsAnnual(false)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            !isAnnual
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Mensual
                        </button>
                        <button
                          onClick={() => setIsAnnual(true)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            isAnnual
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Anual
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-2">
                    {plan.name === '🇪🇸 Estudiantes' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : plan.name === '🇨🇴 Acción de Tutela' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : plan.name === '🇪🇸 Reclamación de Cantidades' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : plan.name === '🌍 Abogados' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
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
              <Link href="/demo" className="btn-secondary">
                Programar Demo
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-16 text-center">
                      <p className="text-gray-600 mb-4">
              ¿Preguntas sobre precios? Revisa nuestras{' '}
              <Link href="/faq" className="text-primary-600 hover:text-primary-700 font-medium">
                Preguntas Frecuentes
              </Link>{' '}
              o{' '}
              <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
                contacta soporte
              </Link>
              .
            </p>
        </div>
      </div>
    </section>
  );
}
