'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MaterialEstudiantesPage() {
  const legalAreas = [
    {
      name: 'Derecho Constitucional',
      documents: ['Recurso de amparo', 'Recurso de inconstitucionalidad', 'Acción de protección'],
      color: 'blue',
    },
    {
      name: 'Derecho Civil y Procesal Civil',
      documents: ['Demanda de reclamación', 'Escrito de oposición', 'Medidas cautelares'],
      color: 'green',
    },
    {
      name: 'Derecho Laboral',
      documents: ['Demanda por despido', 'Reclamación de salarios', 'Accidente laboral'],
      color: 'orange',
    },
    {
      name: 'Derecho Penal',
      documents: ['Denuncia y querella', 'Escrito de defensa', 'Recurso de apelación'],
      color: 'red',
    },
  ];

  const packageContents = [
    {
      title: 'Template DOCX',
      description: 'Plantilla editable en Word lista para personalizar',
      icon: '📄',
    },
    {
      title: 'Template PDF',
      description: 'Versión PDF de la plantilla para referencia',
      icon: '📑',
    },
    {
      title: 'Ejemplo Completo',
      description: 'Documento de ejemplo completamente desarrollado',
      icon: '📋',
    },
    {
      title: 'Material de Estudio',
      description: 'Guía y explicaciones sobre el documento',
      icon: '📚',
    },
  ];

  const benefits = [
    'Más de 50 tipos de documentos legales disponibles',
    'Precios accesibles desde €3 por documento',
    'Material de estudio incluido en cada paquete',
    'Descarga inmediata después del pago',
    'Actualizaciones y nuevas plantillas regularmente',
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
              backgroundImage: 'url(/images/hero-estudiantes-background.png)',
            }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
                Material de Estudio Legal
              </h1>
              <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
                Accede a una amplia biblioteca de plantillas legales profesionales, ejemplos completos y material de estudio para estudiantes de derecho.
              </p>
            </div>

            {/* Hero Illustration */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-200">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="text-4xl mb-3">📚</div>
                    <div className="text-2xl font-bold text-green-600 mb-2">50+</div>
                    <div className="text-sm text-gray-600">Documentos Disponibles</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="text-4xl mb-3">⚖️</div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">10+</div>
                    <div className="text-sm text-gray-600">Áreas Legales</div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                        €
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Precio Accesible</div>
                        <div className="text-sm text-gray-600">Desde €3 por documento</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">4 Archivos</div>
                      <div className="text-sm text-gray-600">Por cada documento</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional gradient overlay at bottom for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </section>

        {/* Legal Areas Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Áreas Legales Disponibles
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Explora nuestra amplia colección de documentos organizados por área legal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {legalAreas.map((area, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {area.name}
                  </h3>
                  <ul className="space-y-2">
                    {area.documents.map((doc, docIndex) => (
                      <li key={docIndex} className="flex items-center space-x-2 text-gray-600">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Package Contents Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                ¿Qué Incluye Cada Paquete?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Cada documento incluye un paquete completo con todo lo que necesitas para estudiar y practicar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {packageContents.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Proceso Simple
              </h2>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: 'Explora el Catálogo', description: 'Navega por las diferentes áreas legales y tipos de documentos' },
                  { step: '2', title: 'Selecciona y Compra', description: 'Elige los documentos que necesitas y completa tu compra' },
                  { step: '3', title: 'Descarga Inmediata', description: 'Accede instantáneamente a todos los archivos del paquete' },
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
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Por Qué Elegir Nuestro Material
                </h2>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 bg-white rounded-lg p-4 shadow-sm">
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
        <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Comienza a Estudiar con Material Profesional
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Accede a plantillas legales profesionales, ejemplos completos y material de estudio diseñado para estudiantes de derecho.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg"
            >
              Explorar Material
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-white/80 text-sm">
              Más de 50 documentos disponibles • Precios desde €3
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

