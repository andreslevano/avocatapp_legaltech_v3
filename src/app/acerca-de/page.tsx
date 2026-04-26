import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const VALUES = [
  {
    title: 'Innovación',
    description: 'Estamos a la vanguardia de la tecnología legal, incorporando constantemente nuevas funcionalidades y mejoras basadas en IA.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Confianza',
    description: 'La seguridad y privacidad de los datos de nuestros usuarios es nuestra máxima prioridad. Implementamos los más altos estándares.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Accesibilidad',
    description: 'Creemos que el acceso a herramientas legales profesionales debe estar al alcance de todos: desde estudiantes hasta bufetes establecidos.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const PRODUCTS = [
  {
    title: 'Gestión para Abogados',
    description: 'Dashboard, gestión de casos, agente IA, directorio de clientes y herramientas profesionales para tu despacho.',
    href: '/productos/gestion-abogados',
    plan: 'Abogados',
  },
  {
    title: 'Material para Estudiantes',
    description: 'Más de 50 documentos legales con plantillas, ejemplos completos y tutor socrático IA para aprender haciendo.',
    href: '/productos/material-estudiantes',
    plan: 'Estudiantes',
  },
  {
    title: 'Autoservicio Legal',
    description: 'Genera documentos legales en minutos con IA: reclamaciones, tutelas y más. Sin conocimientos jurídicos necesarios.',
    href: '/productos/autoservicio',
    plan: 'Particular',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-avocat-black py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="font-display text-h1 text-avocat-cream mb-5">
            Acerca de Avocat
          </h1>
          <p className="font-display text-[22px] italic text-avocat-gold/80 leading-snug">
            &ldquo;El derecho no debe ser un privilegio de quien puede pagarlo.&rdquo;
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-display text-h2 text-avocat-black mb-6">Nuestra Misión</h2>
              <p className="font-sans text-body text-avocat-gray5 mb-4 leading-relaxed">
                En Avocat LegalTech, creemos que la tecnología debe democratizar el acceso a la justicia y empoderar a los profesionales del derecho con herramientas innovadoras que optimicen su trabajo.
              </p>
              <p className="font-sans text-body text-avocat-gray5 mb-4 leading-relaxed">
                Nuestra misión es revolucionar la práctica legal mediante la inteligencia artificial, permitiendo a abogados, estudiantes y particulares generar documentos legales profesionales de manera eficiente, precisa y accesible.
              </p>
              <p className="font-sans text-body text-avocat-gray5 leading-relaxed">
                Trabajamos día a día para hacer que el derecho sea más accesible, eficiente y justo para todos.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-avocat-border shadow-card">
              <div className="w-14 h-14 rounded-xl bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center text-avocat-gold mx-auto mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-display text-h3 text-avocat-black text-center mb-3">Innovación y Confiabilidad</h3>
              <p className="font-sans text-small text-avocat-gray5 text-center leading-relaxed">
                Combinamos la última tecnología en IA con un profundo entendimiento de las necesidades legales para ofrecer soluciones confiables y seguras.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Nuestros Valores</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Los principios que guían todo lo que hacemos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="text-center p-6">
                <div className="w-14 h-14 rounded-xl bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center text-avocat-gold mx-auto mb-5">
                  {v.icon}
                </div>
                <h3 className="font-sans font-semibold text-[16px] text-avocat-black mb-3">{v.title}</h3>
                <p className="font-sans text-small text-avocat-gray5 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Nuestros Productos</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Soluciones diseñadas para cada tipo de usuario legal.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRODUCTS.map((p) => (
              <div key={p.title} className="bg-white rounded-xl p-6 border border-avocat-border shadow-card flex flex-col">
                <h3 className="font-sans font-semibold text-[16px] text-avocat-black mb-3">{p.title}</h3>
                <p className="font-sans text-small text-avocat-gray5 leading-relaxed flex-1 mb-5">{p.description}</p>
                <Link href={p.href} className="font-sans text-small text-avocat-gold font-medium hover:text-avocat-black transition-colors">
                  Saber más →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-avocat-black">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-h2 text-avocat-cream mb-4">
            ¿Listo para transformar tu práctica legal?
          </h2>
          <p className="font-sans text-body text-avocat-cream/70 mb-8">
            Únete a los profesionales que ya usan Avocat para trabajar de forma más inteligente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button variant="BtnGold" size="lg">Comenzar ahora</Button>
            </Link>
            <Link href="/contacto">
              <Button variant="BtnOutlineDark" size="lg" className="border-avocat-cream/40 text-avocat-cream hover:bg-avocat-cream/10">
                Contactar
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
