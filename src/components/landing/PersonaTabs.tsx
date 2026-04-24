'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type Persona = 'lawyer' | 'student' | 'self';

const PERSONAS: { id: Persona; label: string; emoji: string }[] = [
  { id: 'lawyer', label: 'Abogado', emoji: '⚖️' },
  { id: 'student', label: 'Estudiante', emoji: '📚' },
  { id: 'self', label: 'Particular', emoji: '🧑‍💼' },
];

const CONTENT: Record<
  Persona,
  { headline: string; body: string; features: string[]; cta: string; href: string }
> = {
  lawyer: {
    headline: 'Gestiona tu práctica legal con IA',
    body: 'Dashboard completo de casos, agente IA conversacional con acceso a tus documentos, KPIs, jurisprudencia y redacción automática de escritos.',
    features: [
      'Dashboard con KPIs en tiempo real',
      'Agente IA con contexto del caso activo',
      'Redacción de escritos en formato oficial',
      'Directorio de clientes y vencimientos',
      'Historial de conversaciones por caso',
    ],
    cta: 'Empezar como abogado',
    href: '/signup?plan=abogados',
  },
  student: {
    headline: 'Aprende Derecho con un tutor socrático',
    body: 'El agente no te da la respuesta directa — te hace preguntas para que llegues tú. Aprende razonando, con casos reales y jurisprudencia como referencia.',
    features: [
      'Tutor socrático que guía sin revelar',
      'Casos reales y sentencias de referencia',
      'Generación de escritos con feedback',
      'Explicaciones en lenguaje asequible',
      'Historial de aprendizaje',
    ],
    cta: 'Empezar como estudiante',
    href: '/signup?plan=estudiantes',
  },
  self: {
    headline: 'Entiende tus derechos sin jerga legal',
    body: 'Pregunta en lenguaje cotidiano, recibe explicaciones claras. El asistente te dice qué puedes hacer tú mismo antes de sugerirte contratar a un abogado.',
    features: [
      'Respuestas en lenguaje llano, sin artículos',
      'Asistente que empodera antes de derivar',
      'Generación de documentos simples',
      'Guía paso a paso en reclamaciones',
      'Disponible 24/7',
    ],
    cta: 'Empezar como particular',
    href: '/signup?plan=autoservicio',
  },
};

export default function PersonaTabs() {
  const [active, setActive] = useState<Persona>('lawyer');
  const content = CONTENT[active];

  return (
    <section className="bg-avocat-cream py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-h2 text-avocat-black text-center mb-2">
          Diseñado para cada perfil jurídico
        </h2>
        <p className="text-body text-avocat-gray5 text-center mb-10">
          Selecciona tu perfil y descubre cómo Avocat se adapta a ti.
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {PERSONAS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={[
                'flex items-center gap-2 px-5 py-2.5 rounded-full text-body font-sans font-medium transition-all duration-150',
                active === id
                  ? 'bg-avocat-black text-avocat-cream shadow-md'
                  : 'bg-avocat-muted text-avocat-gray5 hover:bg-avocat-border',
              ].join(' ')}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="bg-white rounded-2xl border border-avocat-border shadow-card p-8 md:p-10 grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h3 className="font-display text-h2 text-avocat-black leading-snug mb-4">
              {content.headline}
            </h3>
            <p className="text-body text-avocat-gray5 leading-relaxed mb-6">
              {content.body}
            </p>
            <Link href={content.href}>
              <Button variant="BtnGold" size="md">
                {content.cta}
              </Button>
            </Link>
          </div>

          <ul className="space-y-3">
            {content.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center">
                  <svg className="w-3 h-3 text-avocat-gold" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-body text-avocat-black">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
