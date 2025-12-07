'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AutoservicioPage() {
  const services = [
    {
      title: 'Reclamación de Cantidades',
      description: 'Genera documentos profesionales para reclamar cantidades adeudadas. Sube tus documentos, analiza con IA y obtén un documento listo para usar.',
      features: [
        'Análisis inteligente de documentos',
        'Generación automática de demandas',
        'Soporte para múltiples tipos de reclamaciones',
        'Documentos listos para presentar',
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'orange',
    },
    {
      title: 'Acción de Tutela',
      description: 'Herramienta especializada para generar acciones de tutela en Colombia. Incluye OCR para extraer texto de documentos y generación asistida por IA.',
      features: [
        'OCR para extracción de texto',
        'Generación asistida por IA',
        'Específico para Colombia',
        'Múltiples derechos fundamentales',
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'red',
    },
  ];

  const processSteps = [
    {
      step: '1',
      title: 'Sube tus Documentos',
      description: 'Carga los documentos necesarios para tu caso. Nuestro sistema analiza automáticamente el contenido.',
      illustration: '📤',
    },
    {
      step: '2',
      title: 'Análisis con IA',
      description: 'La inteligencia artificial analiza tus documentos, identifica información clave y prepara el contenido.',
      illustration: '🤖',
    },
    {
      step: '3',
      title: 'Revisa y Personaliza',
      description: 'Revisa el documento generado, realiza ajustes si es necesario y personaliza según tus necesidades.',
      illustration: '✏️',
    },
    {
      step: '4',
      title: 'Descarga y Usa',
      description: 'Descarga tu documento en formato Word y PDF, listo para presentar o usar según corresponda.',
      illustration: '📥',
    },
  ];

  const benefits = [
    'Proceso completamente automatizado',
    'Análisis inteligente con IA',
    'Documentos profesionales listos para usar',
    'Ahorra tiempo y dinero',
    'Soporte para múltiples tipos de documentos',
    'Pago seguro y procesamiento rápido',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-50 via-white to-red-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Autoservicio Legal Inteligente
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Genera documentos legales profesionales de forma automática con la ayuda de inteligencia artificial. Sin necesidad de conocimientos legales avanzados.
              </p>
            </div>

            {/* Hero Illustration */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-center space-x-8 mb-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="font-semibold text-gray-900">Sube Documentos</div>
                  </div>
                  <div className="text-orange-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="font-semibold text-gray-900">Obtén Documento</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">IA Powered</div>
                  <div className="text-sm text-gray-600">Análisis inteligente y generación automática</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Servicios Disponibles
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Herramientas especializadas para diferentes tipos de documentos legales.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className={`mb-6 ${service.color === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>{service.icon}</div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Cómo Funciona
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Proceso simple en 4 pasos para obtener tu documento legal.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {processSteps.map((step, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="text-5xl mb-4">{step.illustration}</div>
                    <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Ventajas del Autoservicio
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <section className="py-20 bg-gradient-to-r from-orange-600 to-red-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              ¿Listo para Generar tu Documento Legal?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Comienza ahora y obtén documentos legales profesionales en minutos, sin necesidad de conocimientos legales avanzados.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg"
            >
              Empezar Reclamación
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-white/80 text-sm">
              Proceso rápido y seguro • Documentos listos para usar
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

