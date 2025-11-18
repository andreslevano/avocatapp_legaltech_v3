'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Acerca de Avocat LegalTech
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                Transformando la práctica legal con inteligencia artificial
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Nuestra Misión</h2>
                <p className="text-lg text-gray-700 mb-4">
                  En Avocat LegalTech, creemos que la tecnología debe democratizar el acceso a la justicia y 
                  empoderar a los profesionales del derecho con herramientas innovadoras que optimicen su trabajo.
                </p>
                <p className="text-lg text-gray-700 mb-4">
                  Nuestra misión es revolucionar la práctica legal mediante la inteligencia artificial, permitiendo 
                  a abogados, estudiantes y particulares generar documentos legales profesionales de manera eficiente, 
                  precisa y accesible.
                </p>
                <p className="text-lg text-gray-700">
                  Trabajamos día a día para hacer que el derecho sea más accesible, eficiente y justo para todos.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Innovación y Confiabilidad</h3>
                  <p className="text-gray-600">
                    Combinamos la última tecnología en IA con un profundo entendimiento de las necesidades legales 
                    para ofrecer soluciones confiables y seguras.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nuestros Valores</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Los principios que guían todo lo que hacemos
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Innovación</h3>
                <p className="text-gray-600">
                  Estamos a la vanguardia de la tecnología legal, incorporando constantemente nuevas funcionalidades 
                  y mejoras basadas en IA.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Confianza</h3>
                <p className="text-gray-600">
                  La seguridad y privacidad de los datos de nuestros usuarios es nuestra máxima prioridad. 
                  Implementamos los más altos estándares de seguridad.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Accesibilidad</h3>
                <p className="text-gray-600">
                  Creemos que el acceso a herramientas legales profesionales debe estar al alcance de todos, 
                  desde estudiantes hasta bufetes establecidos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nuestros Productos</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Soluciones diseñadas para diferentes necesidades legales
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Gestión para Abogados</h3>
                <p className="text-gray-600 mb-4">
                  Plataforma integral para bufetes que incluye gestión de casos, análisis con IA, 
                  portal de clientes y herramientas avanzadas de productividad.
                </p>
                <Link href="/productos/gestion-abogados" className="text-primary-600 hover:text-primary-700 font-medium">
                  Saber más →
                </Link>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Material para Estudiantes</h3>
                <p className="text-gray-600 mb-4">
                  Más de 50 documentos legales profesionales con plantillas, ejemplos completos y 
                  material de estudio para estudiantes de derecho.
                </p>
                <Link href="/productos/material-estudiantes" className="text-primary-600 hover:text-primary-700 font-medium">
                  Saber más →
                </Link>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Autoservicio</h3>
                <p className="text-gray-600 mb-4">
                  Herramientas especializadas para generar documentos legales de forma automática, 
                  incluyendo Reclamación de Cantidades y Acción de Tutela.
                </p>
                <Link href="/productos/autoservicio" className="text-primary-600 hover:text-primary-700 font-medium">
                  Saber más →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              ¿Listo para transformar tu práctica legal?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Únete a los profesionales que ya están utilizando Avocat LegalTech para optimizar su trabajo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Comenzar ahora
              </Link>
              <Link href="/contacto" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Contactar ventas
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

