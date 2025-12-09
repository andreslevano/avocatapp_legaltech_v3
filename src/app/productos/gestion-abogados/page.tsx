'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function GestionAbogadosPage() {
  const features = [
    {
      title: 'Gestión de Casos',
      description: 'Crea, organiza y gestiona todos tus casos desde un panel centralizado. Asigna prioridades, establece fechas límite y realiza seguimiento del estado de cada caso.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Directorio de Clientes',
      description: 'Mantén un directorio completo de tus clientes con información de contacto, historial de casos y documentos asociados.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Generación de Escritos',
      description: 'Genera documentos legales profesionales con la ayuda de inteligencia artificial. Crea escritos, demandas y recursos de forma rápida y eficiente.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      title: 'Análisis de Casos',
      description: 'Analiza tus casos con herramientas inteligentes que te ayudan a identificar puntos clave, riesgos y oportunidades.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Auditoría Legal',
      description: 'Realiza auditorías legales completas de tus casos y documentos para asegurar el cumplimiento y la calidad.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'Repositorio de Documentos',
      description: 'Almacena y organiza todos tus documentos legales en un repositorio seguro y accesible desde cualquier lugar.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h12a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const benefits = [
    'Ahorra tiempo en la gestión administrativa',
    'Mejora la organización de tus casos',
    'Accede a herramientas de IA para documentos',
    'Mantén un historial completo de clientes',
    'Genera reportes y estadísticas detalladas',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/images/hero-abogados-background.png)',
            }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100/90 text-blue-800 mb-4">
                Beta
              </span>
              <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
                Gestión Profesional para Abogados
              </h1>
              <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
                Plataforma integral de gestión legal con herramientas de IA para optimizar tu práctica profesional y mejorar la eficiencia de tu bufete.
              </p>
            </div>

            {/* Hero Illustration */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
                    <div className="text-sm text-gray-600">Casos Gestionados</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
                    <div className="text-sm text-gray-600">Clientes Activos</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">80%</div>
                    <div className="text-sm text-gray-600">Tiempo Ahorrado</div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Dashboard Intuitivo</div>
                      <div className="text-sm text-gray-600">Todo lo que necesitas en un solo lugar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional gradient overlay at bottom for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Funcionalidades Completas
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Herramientas profesionales diseñadas para abogados que buscan optimizar su trabajo diario.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-200"
                >
                  <div className="text-primary-600 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Cómo Funciona
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Proceso simple y eficiente para gestionar tus casos legales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Crea tu Cuenta', description: 'Regístrate en minutos y accede a tu panel' },
                { step: '2', title: 'Gestiona Casos', description: 'Crea y organiza todos tus casos legales' },
                { step: '3', title: 'Genera Documentos', description: 'Usa IA para crear escritos profesionales' },
                { step: '4', title: 'Analiza y Optimiza', description: 'Obtén insights y mejora tu práctica' },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Beneficios Clave
                </h2>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg text-gray-700">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              ¿Listo para Optimizar tu Práctica Legal?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Únete a abogados que ya están transformando su forma de trabajar con nuestras herramientas profesionales.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg"
            >
              Comenzar Ahora
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-white/80 text-sm">
              Prueba gratuita disponible • Sin tarjeta de crédito requerida
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

