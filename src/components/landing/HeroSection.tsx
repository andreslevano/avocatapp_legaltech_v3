'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { FileText, Globe, Zap } from 'lucide-react';

const DEMO_CASES = [
  { id: 'lopez', title: 'López vs. Ibérica SA', type: 'Civil', status: 'Urgente', statusColor: 'text-danger-text' },
  { id: 'herencia', title: 'Herencia Rueda', type: 'Sucesoral', status: 'Activo', statusColor: 'text-success-text' },
  { id: 'renta', title: 'Renta 2023 - García', type: 'Fiscal', status: 'Activo', statusColor: 'text-success-text' },
];

export default function HeroSection() {
  const [activeCase, setActiveCase] = useState('lopez');
  const [generating, setGenerating] = useState(false);
  const [demoPlayed, setDemoPlayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!demoPlayed) {
        setGenerating(true);
        setDemoPlayed(true);
        setTimeout(() => setGenerating(false), 2800);
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [demoPlayed]);

  const handleCaseClick = (id: string) => {
    setActiveCase(id);
    setGenerating(false);
    setDemoPlayed(false);
    setTimeout(() => {
      setGenerating(true);
      setTimeout(() => setGenerating(false), 2800);
    }, 800);
  };

  return (
    <section
      data-theme="dark"
      className="relative min-h-screen bg-bg overflow-hidden flex flex-col"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--accent) 13%, transparent) 0%, transparent 65%), var(--bg)',
      }}
    >
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />

      <div className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-16 pb-12 grid lg:grid-cols-2 gap-12 items-center">

        {/* ── Left column ── */}
        <div className="flex flex-col items-start">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent-border bg-accent-subtle mb-7">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-caption font-sans font-medium text-accent-text tracking-wide">
              IA Generativa · Disponible en España y Latinoamérica
            </span>
          </div>

          {/* H1 */}
          <h1
            className="font-display font-semibold text-text-heading leading-[1.08] tracking-tight mb-6"
            style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}
          >
            Tu despacho trabaja con casos.
            <br />
            Nosotros hacemos que{' '}
            <em className="text-accent-text not-italic">la IA trabaje para ellos.</em>
          </h1>

          <p className="font-sans text-body-sm text-text-muted leading-relaxed max-w-lg mb-8">
            Avocat es el agente legal que redacta escritos, analiza documentos y gestiona tus casos —
            en segundos, con precisión jurídica y en el idioma del Derecho.
          </p>

          {/* Trust items */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-9">
            {[
              { icon: FileText, text: 'Borradores editables en Word y PDF' },
              { icon: Zap, text: 'Resultados en segundos' },
              { icon: Globe, text: 'España y Latinoamérica' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon size={16} className="text-accent-text" aria-hidden />
                <span className="text-caption font-sans text-text-muted">{text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button variant="accent" size="lg" className="text-body-sm px-7">
                Probar 14 días gratis
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button
                variant="ghost"
                size="lg"
                className="text-text-muted border border-border hover:border-accent-border hover:text-text"
              >
                Ver cómo funciona
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-caption font-sans text-text-muted">
            14 días gratis · Cancela cuando quieras
          </p>
        </div>

        {/* ── Right column: mini demo ── */}
        <div className="hidden lg:block">
          <div
            className="relative rounded-2xl overflow-hidden border border-border shadow-2xl"
            style={{ background: 'var(--surface)', height: 420 }}
          >
            {/* Demo chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
              </div>
              <div className="flex-1 mx-3 h-5 rounded bg-surface border border-border flex items-center px-2">
                <span className="text-caption font-sans text-text-muted">avocatapp.com/agent</span>
              </div>
            </div>

            <div className="flex h-[calc(100%-44px)]">
              {/* Cases sidebar */}
              <div className="w-[160px] border-r border-border flex flex-col">
                <div className="px-3 py-2.5 border-b border-border">
                  <span className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
                    Casos
                  </span>
                </div>
                {DEMO_CASES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCaseClick(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${
                      activeCase === c.id ? 'bg-accent-subtle border-l-2 border-l-accent' : 'hover:bg-surface'
                    }`}
                  >
                    <p className={`text-caption font-sans font-medium leading-snug ${
                      activeCase === c.id ? 'text-text-heading' : 'text-text-muted'
                    }`}>{c.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-caption font-sans text-text-muted">{c.type}</span>
                      <span className="text-caption">·</span>
                      <span className={`text-caption font-sans ${c.statusColor}`}>{c.status}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat area */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 px-3 py-3 space-y-2 overflow-hidden">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-accent-subtle border border-accent-border rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                      <p className="text-caption font-sans text-text-heading leading-snug">
                        Genera el escrito de impugnación de la cláusula 12
                      </p>
                    </div>
                  </div>

                  {/* Agent response or generating */}
                  {generating ? (
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Logo variant="mark" tone="gold" size={20} href="" />
                      </div>
                      <div className="bg-surface border border-border rounded-xl rounded-tl-sm px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-caption font-sans text-text-muted mt-1">Redactando escrito…</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Logo variant="mark" tone="gold" size={20} href="" />
                      </div>
                      <div className="bg-surface border border-border rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                        <p className="text-caption font-sans text-text leading-snug">
                          He redactado el escrito de impugnación basado en{' '}
                          <span className="text-accent-text">STS 156/2022</span>.
                          Incluye los fundamentos del Art. 11 LAU.
                        </p>
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-subtle border border-accent-border">
                          <span className="text-caption font-sans text-accent-text">Escrito_impugnacion.pdf</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                    <p className="flex-1 text-caption font-sans text-text-muted">
                      Instrucción al agente…
                    </p>
                    <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-caption font-sans text-text-muted mt-3">
            Demo interactivo · Haz clic en un caso para ver el agente en acción
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }}
      />
    </section>
  );
}
