import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

const SERVICES = [
  {
    title: 'Reclamación de Cantidades',
    description: 'Genera documentos profesionales para reclamar cantidades adeudadas. Sube tus documentos, analiza con IA y obtén un escrito listo para presentar.',
    features: ['Análisis inteligente de documentos', 'Generación automática de demandas', 'Soporte para múltiples tipos de reclamaciones', 'Documentos listos para presentar'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Acción de Tutela',
    description: 'Herramienta especializada para generar acciones de tutela en Colombia. Incluye OCR para extraer texto de documentos y generación asistida por IA.',
    features: ['OCR para extracción de texto', 'Generación asistida por IA', 'Específico para Colombia', 'Múltiples derechos fundamentales'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const STEPS = [
  { title: 'Sube tus documentos', description: 'Carga los archivos necesarios para tu caso. La IA analiza el contenido automáticamente.' },
  { title: 'Análisis con IA', description: 'GPT-4o identifica información clave y prepara el contenido del documento.' },
  { title: 'Revisa y personaliza', description: 'Revisa el borrador generado y ajusta lo que necesites.' },
  { title: 'Descarga y usa', description: 'Descarga en Word y PDF, listo para presentar ante el juzgado.' },
];

const BENEFITS = [
  'Proceso completamente automatizado',
  'Documentos profesionales listos para usar',
  'Ahorra tiempo y dinero frente a un abogado tradicional',
  'Pago seguro por documento: sin suscripción',
  'Soporte para Colombia y España',
];

export default function AutoservicioPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-[560px] flex items-center py-24 overflow-hidden"
        style={{ backgroundImage: 'url(/images/hero-autoservicio-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-avocat-black/75" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <Tag variant="gold" className="mb-6">Plan Particular — €50/mes</Tag>
          <h1 className="font-display text-h1 text-avocat-cream mb-6 max-w-3xl mx-auto">
            Autoservicio Legal Inteligente
          </h1>
          <p className="font-sans text-body text-avocat-cream/80 max-w-2xl mx-auto mb-10">
            Genera documentos legales profesionales de forma automática con IA. Sin necesidad de conocimientos legales avanzados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup?plan=Autoservicio">
              <Button variant="BtnGold" size="lg">Crear mi documento</Button>
            </Link>
            <Link href="/login">
              <Button variant="BtnOutlineDark" size="lg" className="border-avocat-cream/40 text-avocat-cream hover:bg-avocat-cream/10">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Servicios disponibles</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Herramientas especializadas para los documentos legales más comunes.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="bg-white rounded-xl p-7 border border-avocat-border shadow-card">
                <div className="w-12 h-12 rounded-xl bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center text-avocat-gold mb-5">
                  {s.icon}
                </div>
                <h3 className="font-display text-h3 text-avocat-black mb-3">{s.title}</h3>
                <p className="font-sans text-small text-avocat-gray5 mb-5 leading-relaxed">{s.description}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-avocat-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-sans text-small text-avocat-black">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Cómo funciona</h2>
            <p className="font-sans text-body text-avocat-gray5">Proceso simple en 4 pasos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-avocat-black text-avocat-gold font-display text-[20px] font-semibold flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-sans font-semibold text-[15px] text-avocat-black mb-1">{s.title}</h3>
                <p className="font-sans text-small text-avocat-gray5">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-h2 text-avocat-black text-center mb-10">Ventajas del autoservicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3 bg-white rounded-xl px-5 py-4 border border-avocat-border">
                <svg className="w-5 h-5 text-avocat-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-sans text-small text-avocat-black">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-avocat-black">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-h2 text-avocat-cream mb-4">
            ¿Listo para generar tu documento legal?
          </h2>
          <p className="font-sans text-body text-avocat-cream/70 mb-8">
            Proceso rápido y seguro. Documentos listos para usar en minutos.
          </p>
          <Link href="/signup?plan=Autoservicio">
            <Button variant="BtnGold" size="lg">Empezar ahora</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
