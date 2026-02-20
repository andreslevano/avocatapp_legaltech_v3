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
        <section className="relative py-20 lg:py-32 min-h-[500px] md:min-h-[600px] lg:min-h-[700px] overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/images/hero-autoservicio-background.png)',
            }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
                Autoservicio Legal Inteligente
              </h1>
              <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
                Genera documentos legales profesionales de forma automática con la ayuda de inteligencia artificial. Sin necesidad de conocimientos legales avanzados.
              </p>
            </div>

            {/* Hero Illustration */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-border">
                <div className="flex items-center justify-center space-x-8 mb-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[var(--color-app)] border border-border rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="font-semibold text-text-primary">Sube Documentos</div>
                  </div>
                  <div className="text-sidebar">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[var(--color-app)] border border-border rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="font-semibold text-text-primary">Obtén Documento</div>
                  </div>
                </div>
                <div className="bg-[var(--color-app)] border border-border rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-text-primary mb-2">IA Powered</div>
                  <div className="text-sm text-text-primary">Análisis inteligente y generación automática</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional gradient overlay at bottom for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                Servicios Disponibles
              </h2>
              <p className="text-xl text-text-primary max-w-2xl mx-auto">
                Herramientas especializadas para diferentes tipos de documentos legales.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-[var(--color-app)] rounded-xl p-8 border border-border hover:shadow-lg transition-shadow"
                >
                  <div className="mb-6 text-sidebar">{service.icon}</div>
                  <h3 className="text-2xl font-semibold text-text-primary mb-4">
                    {service.title}
                  </h3>
                  <p className="text-text-primary mb-6">{service.description}</p>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-sidebar mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-text-primary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 bg-[var(--color-app)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                Cómo Funciona
              </h2>
              <p className="text-xl text-text-primary max-w-2xl mx-auto">
                Proceso simple en 4 pasos para obtener tu documento legal.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {processSteps.map((step, index) => (
                  <div key={index} className="bg-card rounded-xl p-6 text-center border border-border hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-sidebar">
                      {step.step === '1' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                      {step.step === '2' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                      {step.step === '3' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                      {step.step === '4' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                    </div>
                    <div className="w-12 h-12 bg-sidebar text-text-on-dark rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
                    <p className="text-text-primary text-sm">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-text-primary mb-4">
                  Ventajas del Autoservicio
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 bg-[var(--color-app)] rounded-lg p-4 border border-border">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-sidebar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg text-text-primary">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - palette (no orange/red stripe) */}
        <section className="py-20 bg-gradient-to-r from-[var(--color-sidebar)] to-[#3d3d3d]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              ¿Listo para Generar tu Documento Legal?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Comienza ahora y obtén documentos legales profesionales en minutos, sin necesidad de conocimientos legales avanzados.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-card text-text-primary font-semibold rounded-lg hover:bg-[var(--color-app)] transition-colors shadow-lg text-lg"
            >
              Empezar Reclamación
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-white/90 text-sm">
              Proceso rápido y seguro • Documentos listos para usar
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

