'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Hero() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar lógica de captura de email
    console.log('Email capturado:', email);
  };

  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-primary-100 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Revolucionando
            <span className="text-primary-600 block">la Práctica Legal</span>
            con IA
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Optimiza tu flujo de trabajo legal con análisis inteligente de documentos, 
            resúmenes de casos e investigación legal automatizada impulsada por tecnología de IA de vanguardia.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/signup" className="btn-primary text-lg px-8 py-3">
              Prueba Gratuita
            </Link>
            <Link href="#demo" className="btn-secondary text-lg px-8 py-3">
              Ver Demo
            </Link>
          </div>

          {/* Email Capture */}
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Ingresa tu email para actualizaciones"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field flex-1"
                required
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Suscribirse
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-2">
              Recibe notificaciones sobre nuevas funciones y actualizaciones
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16">
            <p className="text-sm text-gray-500 mb-4">Confiado por bufetes líderes</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="w-24 h-12 bg-gray-300 rounded flex items-center justify-center">
                <span className="text-gray-600 font-semibold">Bufete A</span>
              </div>
              <div className="w-24 h-12 bg-gray-300 rounded flex items-center justify-center">
                <span className="text-gray-600 font-semibold">Bufete B</span>
              </div>
              <div className="w-24 h-12 bg-gray-300 rounded flex items-center justify-center">
                <span className="text-gray-600 font-semibold">Bufete C</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300 rounded-full opacity-20"></div>
      </div>
    </section>
  );
}
