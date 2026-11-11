import AnimatedSection from './AnimatedSection';
import { FileText, Lock, PenLine, RefreshCw, Scale, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Zap, text: 'Contexto de casos en tiempo real — el agente sabe en qué caso estás' },
  { icon: FileText, text: 'Lee y analiza tus PDFs — incluidos documentos escaneados con OCR' },
  { icon: Scale, text: 'Jurisprudencia real — cita sentencias del TS, AP y TC' },
  { icon: PenLine, text: 'Redacta en el formato legal correcto para tu país' },
  { icon: RefreshCw, text: 'Itera y perfecciona — conversa hasta obtener exactamente lo que necesitas' },
  { icon: Lock, text: 'Tus datos son privados — nunca se usan para entrenar modelos' },
];

export default function AgentSection() {
  return (
    <section
      data-theme="dark"
      className="py-20"
      style={{
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 70%), var(--bg)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div>
            <AnimatedSection>
              <div className="inline-block px-3 py-1 rounded-full border border-accent-border bg-accent-subtle text-label font-sans font-semibold text-accent-text uppercase tracking-widest mb-5">
                Agente IA
              </div>
              <h2
                className="font-display text-text-heading font-semibold leading-tight mb-5"
                style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
              >
                El agente legal que trabaja como un asociado senior
              </h2>
              <p className="font-sans text-body-sm text-text-muted leading-relaxed mb-8">
                No es un chatbot que responde preguntas genéricas. Es un agente con acceso completo
                a tus casos, capaz de realizar acciones: redactar escritos, extraer datos de documentos,
                calcular plazos y organizar la información.
              </p>
            </AnimatedSection>

            <ul className="space-y-3">
              {FEATURES.map((f, i) => (
                <AnimatedSection key={f.text} delay={i * 80} className="flex items-start gap-3">
                  <f.icon size={18} className="flex-shrink-0 mt-0.5 text-accent-text" aria-hidden />
                  <span className="font-sans text-small text-text-muted leading-relaxed">{f.text}</span>
                </AnimatedSection>
              ))}
            </ul>
          </div>

          {/* Right: mini agent UI mock */}
          <AnimatedSection delay={200}>
            <div
              className="rounded-2xl overflow-hidden border border-border"
              style={{ background: 'var(--surface)' }}
            >
              {/* Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="flex-1 text-center text-caption font-sans text-text-muted">Agente IA · Modo Abogado</span>
              </div>

              <div className="p-5 space-y-4">
                {/* Tool call badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-subtle border border-accent-border w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-caption font-sans text-accent-text">Analizando documento · contrato_arrendamiento.pdf</span>
                </div>

                {/* Agent message */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-accent-text">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="bg-surface border border-border rounded-xl rounded-tl-sm p-3.5 flex-1">
                    <p className="text-caption font-sans text-text leading-relaxed">
                      He analizado el contrato. Identifico{' '}
                      <span className="text-danger-text font-medium">2 riesgos clave</span> en la cláusula de
                      resolución (art. 27 LAU) y una posible{' '}
                      <span className="text-warning-text font-medium">nulidad en la fianza</span>.
                      ¿Quieres que redacte el escrito de impugnación?
                    </p>
                    <div className="flex gap-2 mt-3">
                      <div className="px-2.5 py-1 rounded-lg bg-accent text-text-on-accent text-caption font-sans cursor-pointer">
                        Sí, redacta →
                      </div>
                      <div className="px-2.5 py-1 rounded-lg border border-border text-text-muted text-caption font-sans cursor-pointer">
                        Ver análisis completo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3.5 py-2.5">
                  <p className="flex-1 text-caption font-sans text-text-muted">Escribe tu instrucción…</p>
                  <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
