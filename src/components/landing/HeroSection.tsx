import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

export default function HeroSection() {
  return (
    <section className="bg-avocat-black relative overflow-hidden">
      {/* Subtle gold radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(184,136,42,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
        <Tag variant="gold" size="sm" className="mb-6">
          Plataforma LegalTech · IA para el Derecho
        </Tag>

        <h1
          className="font-display text-avocat-cream leading-[1.1] tracking-tight"
          style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 600 }}
        >
          Tu asistente legal
          <br />
          <span className="text-avocat-gold-l italic">inteligente</span>
        </h1>

        <p className="mt-6 text-[17px] font-sans text-ds-text max-w-xl mx-auto leading-relaxed">
          Avocat combina inteligencia artificial con conocimiento jurídico para ayudarte a gestionar casos,
          redactar escritos y entender tus derechos — sin importar si eres abogado, estudiante o particular.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup">
            <Button variant="BtnGold" size="lg">
              Comenzar gratis
            </Button>
          </Link>
          <Link href="#precios">
            <Button variant="BtnGhost" size="lg" className="text-ds-text hover:text-white hover:bg-ds-card">
              Ver planes
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-small text-avocat-gray9">
          Usado por abogados en España, Colombia y México · Sin tarjeta de crédito
        </p>
      </div>

      {/* Bottom fade to cream */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #F9F4EA)',
        }}
      />
    </section>
  );
}
