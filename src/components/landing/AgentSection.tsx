import AnimatedSection from './AnimatedSection';

const FEATURES = [
  { icon: '⚡', text: 'Contexto de casos en tiempo real — el agente sabe en qué caso estás' },
  { icon: '📄', text: 'Lee y analiza tus PDFs — incluidos documentos escaneados con OCR' },
  { icon: '⚖️', text: 'Jurisprudencia real — cita sentencias del TS, AP y TC' },
  { icon: '✍️', text: 'Redacta en el formato legal correcto para tu país' },
  { icon: '🔁', text: 'Itera y perfecciona — conversa hasta obtener exactamente lo que necesitas' },
  { icon: '🔒', text: 'Tus datos son privados — nunca se usan para entrenar modelos' },
];

export default function AgentSection() {
  return (
    <section
      className="py-20"
      style={{
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(184,136,42,0.08) 0%, transparent 70%), #0f0e0b',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div>
            <AnimatedSection>
              <div className="inline-block px-3 py-1 rounded-full border border-avocat-gold/25 bg-avocat-gold/8 text-[11px] font-sans font-semibold text-avocat-gold uppercase tracking-widest mb-5">
                Modo Agente
              </div>
              <h2
                className="font-display text-[#f0ead8] font-semibold leading-tight mb-5"
                style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
              >
                El agente legal que trabaja como un asociado senior
              </h2>
              <p className="font-sans text-[14px] text-[#8a8070] leading-relaxed mb-8">
                No es un chatbot que responde preguntas genéricas. Es un agente con acceso completo
                a tus casos, capaz de realizar acciones: redactar escritos, extraer datos de documentos,
                calcular plazos y organizar la información.
              </p>
            </AnimatedSection>

            <ul className="space-y-3">
              {FEATURES.map((f, i) => (
                <AnimatedSection key={f.text} delay={i * 80} className="flex items-start gap-3">
                  <span className="text-[16px] flex-shrink-0 mt-0.5">{f.icon}</span>
                  <span className="font-sans text-[13px] text-[#8a8070] leading-relaxed">{f.text}</span>
                </AnimatedSection>
              ))}
            </ul>
          </div>

          {/* Right: mini agent UI mock */}
          <AnimatedSection delay={200}>
            <div
              className="rounded-2xl overflow-hidden border border-[#2e2b20]"
              style={{ background: '#13120e' }}
            >
              {/* Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2e2b20]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2e2b20]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2e2b20]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2e2b20]" />
                </div>
                <span className="flex-1 text-center text-[10px] font-sans text-[#3a3630]">Agente IA · Modo Abogado</span>
              </div>

              <div className="p-5 space-y-4">
                {/* Tool call badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-avocat-gold/8 border border-avocat-gold/20 w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-avocat-gold animate-pulse" />
                  <span className="text-[10px] font-sans text-avocat-gold">Analizando documento · contrato_arrendamiento.pdf</span>
                </div>

                {/* Agent message */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-avocat-gold/20 border border-avocat-gold/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B8882A" strokeWidth="1.5" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl rounded-tl-sm p-3.5 flex-1">
                    <p className="text-[11px] font-sans text-[#c8c0ac] leading-relaxed">
                      He analizado el contrato. Identifico{' '}
                      <span className="text-red-400 font-medium">2 riesgos clave</span> en la cláusula de
                      resolución (art. 27 LAU) y una posible{' '}
                      <span className="text-amber-400 font-medium">nulidad en la fianza</span>.
                      ¿Quieres que redacte el escrito de impugnación?
                    </p>
                    <div className="flex gap-2 mt-3">
                      <div className="px-2.5 py-1 rounded-lg bg-avocat-gold text-white text-[10px] font-sans cursor-pointer">
                        Sí, redacta →
                      </div>
                      <div className="px-2.5 py-1 rounded-lg border border-[#2e2b20] text-[#6b6050] text-[10px] font-sans cursor-pointer">
                        Ver análisis completo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-3.5 py-2.5">
                  <p className="flex-1 text-[11px] font-sans text-[#3a3630]">Escribe tu instrucción…</p>
                  <div className="w-6 h-6 rounded-lg bg-avocat-gold flex items-center justify-center flex-shrink-0">
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
