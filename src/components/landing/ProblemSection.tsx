import AnimatedSection from './AnimatedSection';

const PROBLEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    stat: '3 horas',
    title: 'Por cada escrito',
    desc: 'Búsqueda de jurisprudencia, redacción, revisión, formato... tiempo que no puedes facturar.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
      </svg>
    ),
    stat: 'Documentos',
    title: 'Dispersos y sin orden',
    desc: 'Contratos en el correo, sentencias en carpetas, notas en papel. Imposible tener el contexto completo.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
      </svg>
    ),
    stat: 'Jurisprudencia',
    title: 'Búsqueda manual agotadora',
    desc: 'Horas en bases de datos legales para encontrar precedentes relevantes. Una tarea que la IA resuelve en segundos.',
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-avocat-cream py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[11px] font-sans font-semibold text-red-500 uppercase tracking-widest mb-4">
            El problema
          </div>
          <h2 className="font-display text-avocat-black font-semibold leading-tight"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>
            Demasiado tiempo en tareas que no deberían tomarlo
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {PROBLEMS.map((p, i) => (
            <AnimatedSection key={p.title} delay={i * 100}
              className="bg-white border border-avocat-border rounded-2xl p-6 group hover:border-avocat-gold/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <p className="font-display text-[28px] font-bold text-avocat-black mb-1">{p.stat}</p>
              <p className="text-[13px] font-sans font-semibold text-avocat-black mb-2">{p.title}</p>
              <p className="text-[13px] font-sans text-avocat-gray5 leading-relaxed">{p.desc}</p>
            </AnimatedSection>
          ))}
        </div>

        {/* Stat banner */}
        <AnimatedSection delay={300}>
          <div className="bg-avocat-black rounded-2xl px-7 py-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="font-display text-avocat-gold text-[42px] font-bold leading-none flex-shrink-0">
              85%
            </div>
            <div>
              <p className="font-sans font-semibold text-[#e8d4a0] text-[15px]">
                Avocat reduce ese tiempo en un 85%
              </p>
              <p className="font-sans text-[13px] text-[#6b6050] mt-0.5">
                Más casos, más eficiencia, más tiempo para lo que importa: tu cliente.
              </p>
            </div>
            <a href="/signup" className="sm:ml-auto flex-shrink-0 px-5 py-2.5 rounded-lg bg-avocat-gold text-white text-[13px] font-sans font-medium hover:bg-[#a07824] transition-colors">
              Empieza gratis →
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
