import AnimatedSection from './AnimatedSection';

const STEPS = [
  {
    num: '01',
    title: 'Crea tu cuenta',
    desc: 'Regístrate en menos de 2 minutos. Elige tu plan: Abogados, Estudiantes o Particular. Sin tarjeta de crédito.',
  },
  {
    num: '02',
    title: 'Carga tus documentos',
    desc: 'Sube contratos, escritos, sentencias o PDFs escaneados. El agente extrae y organiza la información automáticamente.',
  },
  {
    num: '03',
    title: 'Habla con el agente',
    desc: 'Describe lo que necesitas en lenguaje natural. El agente redacta, analiza, busca jurisprudencia y te presenta el resultado.',
  },
  {
    num: '04',
    title: 'Descarga y usa',
    desc: 'Revisa, edita y descarga el escrito en PDF. O cópialo directamente para tu flujo de trabajo existente.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20 border-t border-avocat-border/40" id="como-funciona">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-avocat-gold-bg border border-avocat-gold-l/40 text-[11px] font-sans font-semibold text-avocat-gold uppercase tracking-widest mb-4">
            Cómo funciona
          </div>
          <h2
            className="font-display text-avocat-black font-semibold leading-tight"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
          >
            En marcha en cuatro pasos
          </h2>
          <p className="font-sans text-[15px] text-avocat-gray5 mt-3">
            Sin instalaciones, sin configuración compleja. Empieza a trabajar en minutos.
          </p>
        </AnimatedSection>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-8 left-[calc(12.5%-8px)] right-[calc(12.5%-8px)] h-px bg-avocat-gold/20" />

          <div className="grid lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 120} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Step number circle */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-avocat-gold-bg border border-avocat-gold-l/60 flex items-center justify-center mb-4 flex-shrink-0">
                  <span className="font-display text-avocat-gold text-[22px] font-bold leading-none">{step.num}</span>
                </div>
                <h3 className="font-sans text-[14px] font-semibold text-avocat-black mb-2">{step.title}</h3>
                <p className="font-sans text-[13px] text-avocat-gray5 leading-relaxed">{step.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>

        {/* CTA row */}
        <AnimatedSection delay={480} className="text-center mt-12">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-avocat-gold text-white font-sans text-[14px] font-medium hover:bg-[#a07824] transition-colors"
          >
            Empezar ahora →
          </a>
          <p className="text-[12px] font-sans text-avocat-gray9 mt-3">
            14 días gratis · Sin tarjeta de crédito
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
