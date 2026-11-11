import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function CtaSection() {
  return (
    <section
      data-theme="dark"
      className="relative py-24 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 70%), var(--bg)',
      }}
    >
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <AnimatedSection>
          <div className="inline-block px-3 py-1 rounded-full border border-accent-border bg-accent-subtle text-label font-sans font-semibold text-accent-text uppercase tracking-widest mb-6">
            Empieza hoy
          </div>
          <h2
            className="font-display text-text-heading font-semibold leading-tight mb-5"
            style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
          >
            ¿Listo para tener un agente legal
            <br />
            <em className="text-accent-text not-italic">trabajando para ti?</em>
          </h2>
          <p className="font-sans text-body-sm text-text-muted leading-relaxed mb-9">
            {/* TODO(ds-v4): "Sin tarjeta" removed — signup sends Abogados to Stripe checkout; restore only if true. */}
            14 días gratis. Cancela cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <button className="px-8 py-3.5 rounded-xl bg-accent text-text-on-accent font-sans text-body-sm font-medium hover:bg-accent-hover transition-colors">
                Probar 14 días gratis
              </button>
            </Link>
            <Link href="#como-funciona">
              <button className="px-8 py-3.5 rounded-xl border border-border text-text-muted font-sans text-body-sm font-medium hover:border-accent-border hover:text-text transition-colors">
                Ver demo
              </button>
            </Link>
          </div>
          <p className="mt-5 text-caption font-sans text-text-muted">
            Cancela cuando quieras · Soporte en español
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
