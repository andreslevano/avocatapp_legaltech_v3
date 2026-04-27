import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function CtaSection() {
  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(184,136,42,0.15) 0%, transparent 70%), #0f0e0b',
      }}
    >
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <AnimatedSection>
          <div className="inline-block px-3 py-1 rounded-full border border-avocat-gold/25 bg-avocat-gold/8 text-[11px] font-sans font-semibold text-avocat-gold uppercase tracking-widest mb-6">
            Empieza hoy
          </div>
          <h2
            className="font-display text-[#f0ead8] font-semibold leading-tight mb-5"
            style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
          >
            ¿Listo para tener un agente legal
            <br />
            <em className="text-avocat-gold-l not-italic">trabajando para ti?</em>
          </h2>
          <p className="font-sans text-[15px] text-[#8a8070] leading-relaxed mb-9">
            14 días gratis. Sin tarjeta de crédito. Sin compromisos.
            <br />
            Más de 1,200 casos gestionados en la plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <button className="px-8 py-3.5 rounded-xl bg-avocat-gold text-white font-sans text-[15px] font-medium hover:bg-[#a07824] transition-colors">
                Prueba gratis 14 días →
              </button>
            </Link>
            <Link href="#como-funciona">
              <button className="px-8 py-3.5 rounded-xl border border-[#2e2b20] text-[#8a8070] font-sans text-[15px] font-medium hover:border-avocat-gold/30 hover:text-[#c8c0ac] transition-colors">
                Ver demo
              </button>
            </Link>
          </div>
          <p className="mt-5 text-[12px] font-sans text-[#3a3630]">
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
