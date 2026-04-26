import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

const FEATURES = [
  {
    title: 'Gestión de Casos',
    description: 'Crea, organiza y gestiona todos tus casos desde un panel centralizado. Asigna prioridades, establece fechas límite y realiza seguimiento del estado.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Directorio de Clientes',
    description: 'Mantén un directorio completo con información de contacto, historial de casos y documentos asociados para cada cliente.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Agente IA',
    description: 'Genera escritos legales profesionales con la ayuda de GPT-4o. Crea demandas, recursos y documentos de forma rápida y eficiente.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    title: 'Dashboard KPIs',
    description: 'Analiza el rendimiento de tu despacho con métricas en tiempo real: casos activos, vencimientos, clientes y escritos generados.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Auditoría Legal',
    description: 'Realiza auditorías completas de tus casos y documentos para asegurar el cumplimiento y la calidad de cada expediente.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Repositorio',
    description: 'Almacena y organiza todos tus documentos legales en un repositorio seguro y accesible desde cualquier dispositivo.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h12a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const STEPS = [
  { step: '1', title: 'Crea tu cuenta', description: 'Regístrate en minutos y accede a tu panel de abogado' },
  { step: '2', title: 'Gestiona casos', description: 'Crea y organiza todos tus expedientes legales' },
  { step: '3', title: 'Usa el agente IA', description: 'Genera escritos profesionales con GPT-4o' },
  { step: '4', title: 'Analiza y mejora', description: 'Obtén KPIs y toma decisiones basadas en datos' },
];

const BENEFITS = [
  'Ahorra hasta 80% del tiempo en gestión administrativa',
  'Agente IA entrenado en Derecho español e iberoamericano',
  'Directorio completo de clientes con historial',
  'Dashboard con métricas y vencimientos en tiempo real',
  'Jurisprudencia y escritos con un solo clic',
];

export default function GestionAbogadosPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-[560px] flex items-center py-24 overflow-hidden"
        style={{ backgroundImage: 'url(/images/hero-abogados-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-avocat-black/75" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <Tag variant="gold" className="mb-6">Plan Abogados — €75/mes</Tag>
          <h1 className="font-display text-h1 text-avocat-cream mb-6 max-w-3xl mx-auto">
            Gestión Profesional para Abogados
          </h1>
          <p className="font-sans text-body text-avocat-cream/80 max-w-2xl mx-auto mb-10">
            Plataforma integral de gestión legal con agente IA para optimizar tu práctica profesional y mejorar la eficiencia de tu despacho.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup?plan=Abogados">
              <Button variant="BtnGold" size="lg">Empezar ahora</Button>
            </Link>
            <Link href="/login">
              <Button variant="BtnOutlineDark" size="lg" className="border-avocat-cream/40 text-avocat-cream hover:bg-avocat-cream/10">
                Iniciar sesión
              </Button>
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[['100+', 'Casos gestionados'], ['50+', 'Clientes activos'], ['80%', 'Tiempo ahorrado']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="font-display text-[32px] text-avocat-gold leading-none">{val}</div>
                <div className="font-sans text-small text-avocat-cream/60 mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Funcionalidades completas</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Herramientas profesionales diseñadas para abogados que quieren trabajar de forma más inteligente.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-avocat-border shadow-card hover:shadow-elevated transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center text-avocat-gold mb-4">
                  {f.icon}
                </div>
                <h3 className="font-sans font-semibold text-[16px] text-avocat-black mb-2">{f.title}</h3>
                <p className="font-sans text-small text-avocat-gray5 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Cómo funciona</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Empieza en minutos y transforma la gestión de tu despacho.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-avocat-black text-avocat-gold font-display text-[20px] font-semibold flex items-center justify-center mx-auto mb-4">
                  {s.step}
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
          <h2 className="font-display text-h2 text-avocat-black text-center mb-10">Beneficios clave</h2>
          <div className="space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3 bg-white rounded-xl px-5 py-4 border border-avocat-border">
                <svg className="w-5 h-5 text-avocat-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-sans text-body text-avocat-black">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-avocat-black">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-h2 text-avocat-cream mb-4">
            ¿Listo para optimizar tu práctica legal?
          </h2>
          <p className="font-sans text-body text-avocat-cream/70 mb-8">
            Únete a los abogados que ya trabajan de forma más inteligente con Avocat.
          </p>
          <Link href="/signup?plan=Abogados">
            <Button variant="BtnGold" size="lg">Comenzar ahora</Button>
          </Link>
          <p className="font-sans text-small text-avocat-cream/40 mt-4">Sin tarjeta de crédito requerida</p>
        </div>
      </section>
    </div>
  );
}
