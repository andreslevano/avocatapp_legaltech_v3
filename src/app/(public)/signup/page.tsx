import type { Metadata } from 'next';
import Link from 'next/link';
import SignupForm from '@/components/auth/SignupForm';
import { BookOpen, Scale, UserRound } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Crear cuenta — Avocat',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_1.2fr]">
      {/* Left panel — brand */}
      <div data-theme="dark" className="hidden md:flex flex-col justify-between bg-bg px-12 py-16">
        <div>
          <Link href="/" className="text-accent-text font-display text-h2 font-semibold tracking-tight">
            Avocat
          </Link>
          <p className="mt-2 text-small text-text">Plataforma LegalTech</p>
        </div>

        <div className="space-y-6">
          {[
            { icon: Scale, text: 'Gestiona casos con un agente IA que conoce tu práctica.' },
            { icon: BookOpen, text: 'Aprende Derecho con un tutor socrático impulsado por IA.' },
            { icon: UserRound, text: 'Entiende tus derechos en lenguaje llano, sin tecnicismos.' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-4">
              <Icon size={24} className="shrink-0 text-accent-text" aria-hidden />
              <p className="text-body text-text leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-small text-text-muted">
          Sin permanencia · Cancela cuando quieras
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-start justify-center px-6 py-12 bg-bg overflow-y-auto">
        <div className="w-full max-w-md">
          <h1 className="font-display text-h2 text-text mb-1">Crea tu cuenta</h1>
          <p className="text-small text-text-muted mb-8">Elige tu plan y empieza en minutos.</p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
