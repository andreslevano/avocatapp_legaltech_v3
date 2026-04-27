import AnimatedSection from './AnimatedSection';

const VALUES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: 'Agente IA conversacional',
    body: 'GPT-4o con contexto de tus casos, documentos y jurisprudencia. No es un chatbot genérico — conoce tu práctica.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Redacción de escritos legales',
    body: '+50 tipos de escritos jurídicos generados en segundos. Adaptados al país, la materia y el caso específico.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    title: 'Gestión integral de casos',
    body: 'Organiza todos tus casos, adjunta documentos, registra vencimientos y lleva el historial completo.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Dashboard con métricas',
    body: 'KPIs de tu despacho en tiempo real: casos activos, escritos generados, vencimientos y rendimiento.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3m3-6v6m3-10.125c0-1.036-.84-1.875-1.875-1.875h-2.25c-1.036 0-1.875.84-1.875 1.875v0c0 1.036.84 1.875 1.875 1.875h2.25c1.036 0 1.875-.84 1.875-1.875v0z" />
      </svg>
    ),
    title: 'Extracción inteligente de datos',
    body: 'Sube PDFs (incluso escaneados) y el agente extrae automáticamente partes, fechas, cláusulas y riesgos.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Directorio de clientes',
    body: 'Gestiona tu cartera de clientes: historial de casos, documentos asociados y comunicaciones en un solo lugar.',
  },
];

export default function ValueProps() {
  return (
    <section className="bg-avocat-cream py-20 border-t border-avocat-border/40" id="funcionalidades">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-avocat-gold-bg border border-avocat-gold-l/40 text-[11px] font-sans font-semibold text-avocat-gold uppercase tracking-widest mb-4">
            Funcionalidades
          </div>
          <h2
            className="font-display text-avocat-black font-semibold leading-tight"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}
          >
            Todo lo que tu práctica jurídica necesita
          </h2>
          <p className="font-sans text-[15px] text-avocat-gray5 mt-3 max-w-lg mx-auto">
            Construido por abogados, para abogados — y diseñado para simplificar el trabajo de cualquier perfil.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {VALUES.map((v, i) => (
            <AnimatedSection
              key={v.title}
              delay={i * 80}
              className="bg-white border border-avocat-border rounded-2xl p-6 group hover:border-avocat-gold/40 hover:shadow-md transition-all duration-300"
            >
              <div className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 bg-avocat-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"
                />
                <div className="w-10 h-10 rounded-xl bg-avocat-gold-bg border border-avocat-gold-l/40 text-avocat-gold flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="font-sans text-[14px] font-semibold text-avocat-black mb-2">{v.title}</h3>
                <p className="font-sans text-[13px] text-avocat-gray5 leading-relaxed">{v.body}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
