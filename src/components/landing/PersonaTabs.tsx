'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

/** Token colour at `pct` % opacity (colours are CSS variables, so no hex-alpha suffixes). */
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const TABS = [
  { id: 'lawyer',  label: 'Abogados',     tag: 'Plan Abogados',    tagCls: 'bg-accent-subtle text-accent-text border-accent-border' },
  { id: 'student', label: 'Estudiantes',  tag: 'Plan Estudiantes', tagCls: 'bg-info-subtle text-info-text border-status-en-revision-border' },
  { id: 'self',    label: 'Particulares', tag: 'Plan Particular',  tagCls: 'bg-success-subtle text-success-text border-status-a-tiempo-border' },
] as const;

type TabId = typeof TABS[number]['id'];

const CONTENT: Record<TabId, {
  headline: string;
  desc: string;
  features: string[];
  mockBg: string;
  mockAccent: string;
  mockLines: { label: string; value: string }[];
  href: string;
  linkColor: string;
}> = {
  lawyer: {
    headline: 'El despacho del siglo XXI',
    desc: 'Panel con indicadores en tiempo real, gestión completa de casos, directorio de clientes y un agente IA que redacta, analiza y extrae datos de tus documentos.',
    features: [
      'Panel con indicadores y gráficos',
      'Gestión de casos con IA',
      'Directorio de clientes',
      '+50 tipos de escritos legales',
      'Análisis y extracción de documentos',
      'Agente IA conversacional',
    ],
    mockBg: 'var(--neutral-900)',
    mockAccent: 'var(--gold-500)',
    mockLines: [
      { label: 'Casos activos',      value: '12' },
      { label: 'Escritos generados', value: '47' },
      { label: 'Tiempo ahorrado',    value: '38 h' },
    ],
    href: '/productos/gestion-abogados',
    linkColor: 'text-accent-text',
  },
  student: {
    headline: 'Aprende Derecho razonando',
    desc: 'Un tutor socrático que no te da la respuesta directa — te guía para que llegues tú mismo. Con casos reales, sentencias y material académico estructurado.',
    features: [
      'Tutor socrático con IA',
      '8 áreas legales cubiertas',
      '7 tipos de escrito',
      'Dossier académico por área',
      'Jurisprudencia comentada',
      'Descarga en PDF o email',
    ],
    mockBg: 'var(--info-50)',
    mockAccent: 'var(--info-600)',
    mockLines: [
      { label: 'Materia',  value: 'Derecho Civil' },
      { label: 'Escritos', value: '7 tipos' },
      { label: 'Áreas',    value: '8 cubiertas' },
    ],
    href: '/productos/material-estudiantes',
    linkColor: 'text-info-text',
  },
  self: {
    headline: 'Tus derechos, en lenguaje claro',
    desc: 'Asistente legal sin tecnicismos. Analiza tus documentos, genera reclamaciones y te dice qué puedes hacer tú mismo antes de contratar a un abogado.',
    features: [
      'Lenguaje simple y directo',
      'Análisis de contratos y facturas',
      'Generación de reclamaciones',
      'Extracción de datos clave',
      'Evaluación de riesgo legal',
      '100 créditos al mes',
    ],
    mockBg: 'var(--success-50)',
    mockAccent: 'var(--success-600)',
    mockLines: [
      { label: 'Créditos', value: '100 / mes' },
      { label: 'Análisis', value: 'Contratos, PDFs' },
      { label: 'Escritos', value: 'Reclamaciones' },
    ],
    href: '/productos/autoservicio',
    linkColor: 'text-success-text',
  },
};

export default function PersonaTabs() {
  const [active, setActive] = useState<TabId>('lawyer');
  const content = CONTENT[active];
  const tab = TABS.find(t => t.id === active)!;

  return (
    <section className="bg-surface py-20 border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-label font-sans font-semibold text-accent-text uppercase tracking-widest mb-4">
            Para cada perfil
          </div>
          <h2
            className="font-display text-text font-semibold leading-tight"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
          >
            Una experiencia diseñada para ti
          </h2>
        </AnimatedSection>

        {/* Tab switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-1 p-1 bg-surface-muted rounded-xl">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={[
                  'px-5 py-2.5 rounded-lg text-small font-sans font-medium transition-all',
                  active === t.id
                    ? 'bg-surface shadow-sm text-text'
                    : 'text-text-muted hover:text-text-heading',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className={`inline-block px-3 py-1 rounded-full text-label font-sans font-semibold uppercase tracking-widest mb-4 border ${tab.tagCls}`}>
              {tab.tag}
            </div>
            <h3 className="font-display text-text font-semibold text-h2 leading-tight mb-3">
              {content.headline}
            </h3>
            <p className="font-sans text-body-sm text-text-muted leading-relaxed mb-6">
              {content.desc}
            </p>
            <ul className="space-y-2.5 mb-7">
              {content.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-small font-sans text-text">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${content.mockAccent} 10%, transparent)` }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: content.mockAccent }}
                    />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={content.href}
              className={`inline-flex items-center gap-1 text-small font-sans font-semibold ${content.linkColor} hover:underline`}
            >
              Saber más →
            </Link>
          </div>

          {/* Mock UI */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: content.mockBg, border: `1px solid color-mix(in srgb, ${content.mockAccent} 19%, transparent)` }}
          >
            <div className="px-5 py-3 border-b" style={{ borderColor: alpha(content.mockAccent, 13) }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: alpha(content.mockAccent, 19) }} />
                ))}
              </div>
            </div>
            <div className="p-5 space-y-0">
              {content.mockLines.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: alpha(content.mockAccent, 8) }}
                >
                  <span className="text-caption font-sans" style={{ color: alpha(content.mockAccent, 56) }}>{label}</span>
                  <span className="text-body font-display font-semibold" style={{ color: content.mockAccent }}>{value}</span>
                </div>
              ))}
              <div
                className="mt-4 flex items-center gap-3 p-3.5 rounded-xl"
                style={{ background: alpha(content.mockAccent, 6), border: `1px solid ${alpha(content.mockAccent, 15)}` }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: alpha(content.mockAccent, 13) }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke={content.mockAccent} strokeWidth="1.5" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-caption font-sans leading-snug" style={{ color: content.mockAccent }}>
                  Agente IA activo · Listo para trabajar
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
