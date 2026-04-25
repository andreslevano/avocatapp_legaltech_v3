const VALUES = [
  {
    icon: '🤖',
    title: 'Agente IA conversacional',
    body: 'GPT-4o con contexto de tus casos, documentos y jurisprudencia. No es un chatbot genérico — conoce tu práctica.',
  },
  {
    icon: '📄',
    title: 'Escritos en formato oficial',
    body: 'Genera demandas, contratos y comunicaciones en el formato correcto para cada jurisdicción.',
  },
  {
    icon: '⚡',
    title: 'Respuestas en segundos',
    body: 'Lo que antes tomaba horas de investigación, ahora tarda segundos con referencias a fuentes reales.',
  },
  {
    icon: '🔒',
    title: 'Datos seguros en Firebase',
    body: 'Tus casos y documentos se almacenan cifrados en Google Firebase. Cumplimiento GDPR incluido.',
  },
  {
    icon: '📊',
    title: 'Dashboard de KPIs',
    body: 'Evolución de casos, vencimientos próximos, clientes activos y escritos generados — todo en una vista.',
  },
  {
    icon: '🌍',
    title: 'Multi-jurisdicción',
    body: 'Soporte para derecho español, colombiano, mexicano, chileno, ecuatoriano y peruano.',
  },
];

export default function ValueProps() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-h2 text-avocat-black text-center mb-2">
          Todo lo que necesitas en un solo lugar
        </h2>
        <p className="text-body text-avocat-gray5 text-center mb-12 max-w-xl mx-auto">
          Avocat integra las herramientas que los profesionales del derecho usan a diario.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map(({ icon, title, body }) => (
            <div
              key={title}
              className="p-6 rounded-xl border border-avocat-border hover:border-avocat-gold-l hover:shadow-card transition-all duration-200 group"
            >
              <div className="text-2xl mb-4">{icon}</div>
              <h3 className="font-sans font-semibold text-[17px] text-avocat-black mb-2 group-hover:text-avocat-gold transition-colors">
                {title}
              </h3>
              <p className="text-small text-avocat-gray5 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
