import type { Metadata } from 'next';
import Link from 'next/link';
import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Crear cuenta — Avocat',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_1.2fr]">
      {/* Left panel — brand */}
      <div className="hidden md:flex flex-col justify-between bg-avocat-black px-12 py-16">
        <div>
          <Link href="/" className="text-avocat-gold font-display text-[28px] font-semibold tracking-tight">
            Avocat
          </Link>
          <p className="mt-2 text-small text-ds-text">Plataforma LegalTech</p>
        </div>

        <div className="space-y-6">
          {[
            { emoji: '⚖️', text: 'Gestiona casos con un agente IA que conoce tu práctica.' },
            { emoji: '📚', text: 'Aprende Derecho con un tutor socrático impulsado por IA.' },
            { emoji: '🧑‍💼', text: 'Entiende tus derechos en lenguaje llano, sin tecnicismos.' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-start gap-4">
              <span className="text-2xl">{emoji}</span>
              <p className="text-body text-ds-text leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-small text-avocat-gray9">
          Sin permanencia · Cancela cuando quieras
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-start justify-center px-6 py-12 bg-avocat-cream overflow-y-auto">
        <div className="w-full max-w-md">
          <h1 className="font-display text-h2 text-avocat-black mb-1">Crea tu cuenta</h1>
          <p className="text-small text-avocat-gray5 mb-8">Elige tu plan y empieza en minutos.</p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
